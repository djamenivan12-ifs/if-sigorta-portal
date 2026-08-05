import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_ACTIONS = [
  "confirm_payment",
  "reject_payment",
  "start_policy",
  "cancel_request",
] as const;

type AllowedAction =
  (typeof ALLOWED_ACTIONS)[number];

type RequestBody = {
  action?: AllowedAction;
  rejectionReason?: string;
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const sessionClient =
      await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Vous devez être connecté.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Identifiant du dossier absent.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      (await request.json()) as RequestBody;

    if (
      !body.action ||
      !ALLOWED_ACTIONS.includes(body.action)
    ) {
      return NextResponse.json(
        {
          error: "Action non autorisée.",
        },
        {
          status: 400,
        },
      );
    }

    const adminClient = createAdminClient();

    const {
      data: insuranceRequest,
      error: requestError,
    } = await adminClient
      .from("insurance_requests")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (requestError) {
      throw new Error(requestError.message);
    }

    if (!insuranceRequest) {
      return NextResponse.json(
        {
          error: "Dossier introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    const now = new Date().toISOString();

    if (
      body.action === "confirm_payment"
    ) {
      if (
        insuranceRequest.status !==
        "payment_review"
      ) {
        return NextResponse.json(
          {
            error:
              "Ce paiement ne peut pas être validé depuis son statut actuel.",
          },
          {
            status: 409,
          },
        );
      }

      const {
        data: payment,
        error: paymentSearchError,
      } = await adminClient
        .from("payments")
        .select("id")
        .eq("request_id", id)
        .maybeSingle();

      if (paymentSearchError) {
        throw new Error(
          paymentSearchError.message,
        );
      }

      if (!payment) {
        return NextResponse.json(
          {
            error:
              "Aucun paiement n’est associé à ce dossier.",
          },
          {
            status: 404,
          },
        );
      }

      const { error: paymentError } =
        await adminClient
          .from("payments")
          .update({
            status: "confirmed",
            verified_at: now,
            verified_by: user.id,
            rejection_reason: null,
          })
          .eq("request_id", id);

      if (paymentError) {
        throw new Error(
          paymentError.message,
        );
      }

      const { error: updateError } =
        await adminClient
          .from("insurance_requests")
          .update({
            status: "payment_confirmed",
            updated_at: now,
          })
          .eq("id", id);

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }
    }

    if (
      body.action === "reject_payment"
    ) {
      if (
        insuranceRequest.status !==
        "payment_review"
      ) {
        return NextResponse.json(
          {
            error:
              "Ce paiement ne peut pas être refusé depuis son statut actuel.",
          },
          {
            status: 409,
          },
        );
      }

      const rejectionReason =
        body.rejectionReason?.trim() ?? "";

      if (!rejectionReason) {
        return NextResponse.json(
          {
            error:
              "Le motif du refus est obligatoire.",
          },
          {
            status: 400,
          },
        );
      }

      const {
        data: payment,
        error: paymentSearchError,
      } = await adminClient
        .from("payments")
        .select("id")
        .eq("request_id", id)
        .maybeSingle();

      if (paymentSearchError) {
        throw new Error(
          paymentSearchError.message,
        );
      }

      if (!payment) {
        return NextResponse.json(
          {
            error:
              "Aucun paiement n’est associé à ce dossier.",
          },
          {
            status: 404,
          },
        );
      }

      const { error: paymentError } =
        await adminClient
          .from("payments")
          .update({
            status: "rejected",
            verified_at: now,
            verified_by: user.id,
            rejection_reason:
              rejectionReason,
          })
          .eq("request_id", id);

      if (paymentError) {
        throw new Error(
          paymentError.message,
        );
      }

      const { error: updateError } =
        await adminClient
          .from("insurance_requests")
          .update({
            status: "payment_rejected",
            updated_at: now,
          })
          .eq("id", id);

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }
    }

    if (
      body.action === "start_policy"
    ) {
      if (
        insuranceRequest.status !==
        "payment_confirmed"
      ) {
        return NextResponse.json(
          {
            error:
              "La préparation ne peut commencer qu’après validation du paiement.",
          },
          {
            status: 409,
          },
        );
      }

      const { error: updateError } =
        await adminClient
          .from("insurance_requests")
          .update({
            status: "policy_preparation",
            updated_at: now,
          })
          .eq("id", id);

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }
    }

    if (
      body.action === "cancel_request"
    ) {
      if (
        insuranceRequest.status ===
        "policy_available"
      ) {
        return NextResponse.json(
          {
            error:
              "Un dossier dont la police est déjà disponible ne peut pas être annulé.",
          },
          {
            status: 409,
          },
        );
      }

      if (
        insuranceRequest.status ===
        "cancelled"
      ) {
        return NextResponse.json(
          {
            error:
              "Ce dossier est déjà annulé.",
          },
          {
            status: 409,
          },
        );
      }

      const { error: updateError } =
        await adminClient
          .from("insurance_requests")
          .update({
            status: "cancelled",
            updated_at: now,
          })
          .eq("id", id);

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erreur de mise à jour du dossier :",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status: 500,
      },
    );
  }
}