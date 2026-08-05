import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

type TrackingPayload = {
  requestCode?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
};

function cleanPhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrackingPayload;

    const requestCode =
      body.requestCode?.trim().toUpperCase() ?? "";

    const whatsappCountryCode =
      body.whatsappCountryCode?.trim() ?? "";

    const whatsappNumber = cleanPhoneNumber(
      body.whatsappNumber ?? "",
    );

    if (
      !requestCode ||
      !whatsappCountryCode ||
      !whatsappNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Le code du dossier et le numéro WhatsApp sont obligatoires.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const {
      data: insuranceRequest,
      error: requestError,
    } = await supabase
      .from("insurance_requests")
      .select(
        `
          id,
          request_code,
          status,
          calculated_price,
          insurance_duration_years,
          created_at,
          updated_at,
          client_id
        `,
      )
      .eq("request_code", requestCode)
      .maybeSingle();

    if (requestError) {
      console.error(
        "Erreur de recherche du dossier :",
        requestError,
      );

      return NextResponse.json(
        {
          error:
            "La recherche du dossier a échoué.",
        },
        { status: 500 },
      );
    }

    if (!insuranceRequest) {
      return NextResponse.json(
        {
          error:
            "Aucun dossier ne correspond aux informations fournies.",
        },
        { status: 404 },
      );
    }

    const {
      data: client,
      error: clientError,
    } = await supabase
      .from("clients")
      .select(
        `
          first_name,
          last_name,
          whatsapp_country_code,
          whatsapp_number
        `,
      )
      .eq("id", insuranceRequest.client_id)
      .maybeSingle();

    if (clientError) {
      console.error(
        "Erreur de recherche du client :",
        clientError,
      );

      return NextResponse.json(
        {
          error:
            "La vérification du client a échoué.",
        },
        { status: 500 },
      );
    }

    if (!client) {
      return NextResponse.json(
        {
          error:
            "Le client associé à ce dossier est introuvable.",
        },
        { status: 404 },
      );
    }

    const storedCountryCode =
      client.whatsapp_country_code.trim();

    const storedPhoneNumber =
      cleanPhoneNumber(client.whatsapp_number);

    const phoneMatches =
      storedCountryCode === whatsappCountryCode &&
      storedPhoneNumber === whatsappNumber;

    if (!phoneMatches) {
      return NextResponse.json(
        {
          error:
            "Aucun dossier ne correspond aux informations fournies.",
        },
        { status: 404 },
      );
    }

    const {
      data: payment,
      error: paymentError,
    } = await supabase
      .from("payments")
      .select(
        `
          status,
          submitted_at,
          verified_at,
          rejection_reason
        `,
      )
      .eq("request_id", insuranceRequest.id)
      .maybeSingle();

    if (paymentError) {
      console.error(
        "Erreur de recherche du paiement :",
        paymentError,
      );
    }

    const {
      data: policy,
      error: policyError,
    } = await supabase
      .from("insurance_policies")
      .select(
        `
          policy_number,
          issue_date,
          expiration_date,
          storage_path,
          uploaded_at
        `,
      )
      .eq("request_id", insuranceRequest.id)
      .maybeSingle();

    if (policyError) {
      console.error(
        "Erreur de recherche de la police :",
        policyError,
      );
    }

    return NextResponse.json({
      success: true,

      request: {
        requestCode:
          insuranceRequest.request_code,

        status:
          insuranceRequest.status,

        calculatedPrice:
          insuranceRequest.calculated_price,

        durationYears:
          insuranceRequest.insurance_duration_years,

        createdAt:
          insuranceRequest.created_at,

        updatedAt:
          insuranceRequest.updated_at,
      },

      client: {
        firstName: client.first_name,
        lastName: client.last_name,
      },

      payment: payment
        ? {
            status: payment.status,
            submittedAt: payment.submitted_at,
            verifiedAt: payment.verified_at,
            rejectionReason:
              payment.rejection_reason,
          }
        : null,

      policy: policy
        ? {
            available:
              Boolean(policy.storage_path),

            policyNumber:
              policy.policy_number,

            issueDate:
              policy.issue_date,

            expirationDate:
              policy.expiration_date,

            uploadedAt:
              policy.uploaded_at,
          }
        : {
            available: false,
            policyNumber: null,
            issueDate: null,
            expirationDate: null,
            uploadedAt: null,
          },
    });
  } catch (error) {
    console.error(
      "Erreur inattendue du suivi :",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Une erreur inattendue est survenue.",
      },
      { status: 500 },
    );
  }
}