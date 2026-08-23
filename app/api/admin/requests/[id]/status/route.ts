import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity/logActivity";
import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_ACTIONS = [
  "confirm_payment",
  "reject_payment",
  "start_policy",
  "cancel_request",
] as const;

type AllowedAction =
  (typeof ALLOWED_ACTIONS)[number];

type UpdateStatusPayload = {
  action?: AllowedAction;
  rejectionReason?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isAllowedAction(
  value: unknown,
): value is AllowedAction {
  return (
    typeof value === "string" &&
    ALLOWED_ACTIONS.includes(
      value as AllowedAction,
    )
  );
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function safeLogActivity({
  requestId,
  userId,
  action,
  description,
}: {
  requestId: string;
  userId: string;
  action: string;
  description: string;
}) {
  try {
    await logActivity({
      requestId,
      userId,
      action,
      description,
    });
  } catch (error) {
    /*
     * Une erreur d'historique ne doit pas
     * rendre incohérente une opération
     * métier déjà terminée.
     */
    console.error(
      "Impossible d'enregistrer l'activité :",
      error,
    );
  }
}

async function handleStatusUpdate(
  request: Request,
  context: RouteContext,
) {
  const serviceClient =
    createServiceClient();

  try {
    /*
     * ============================================
     * 1. AUTHENTIFICATION
     * ============================================
     */

    const sessionClient =
      await createServerSupabaseClient();

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await sessionClient.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Vous devez être connecté.",
        },
        401,
      );
    }

    /*
     * ============================================
     * 2. RÔLE
     * ============================================
     */

    const role =
      user.app_metadata?.role;

    if (
      role !== "admin" &&
      role !== "agent"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Vous n’avez pas l’autorisation d’effectuer cette action.",
        },
        403,
      );
    }

    /*
     * ============================================
     * 3. IDENTIFIANT
     * ============================================
     */

    const {
      id,
    } =
      await context.params;

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Identifiant du dossier absent.",
        },
        400,
      );
    }

    /*
     * ============================================
     * 4. BODY
     * ============================================
     */

    let body:
      UpdateStatusPayload;

    try {
      body =
        (await request.json()) as
          UpdateStatusPayload;
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Les données envoyées sont invalides.",
        },
        400,
      );
    }

    if (
      !isAllowedAction(
        body.action,
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Action invalide.",
        },
        400,
      );
    }

    const rejectionReason =
      body.rejectionReason
        ?.trim() ??
      "";

    if (
      body.action ===
        "reject_payment" &&
      !rejectionReason
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le motif du refus est obligatoire.",
        },
        400,
      );
    }

    /*
     * ============================================
     * 5. DOSSIER
     * ============================================
     */

    const {
      data:
        insuranceRequest,
      error:
        requestError,
    } =
      await serviceClient
        .from(
          "insurance_requests",
        )
        .select(
          `
            id,
            status,
            assigned_agent_id
          `,
        )
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (
      requestError
    ) {
      throw new Error(
        requestError.message,
      );
    }

    if (
      !insuranceRequest
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Dossier introuvable.",
        },
        404,
      );
    }

    /*
     * ============================================
     * 6. AUTORISATION AGENT
     * ============================================
     *
     * Un agent ne peut intervenir que sur
     * un dossier qui lui est attribué.
     *
     * L'admin peut intervenir partout.
     */

    if (
      role === "agent" &&
      insuranceRequest.assigned_agent_id !==
        user.id
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            insuranceRequest.assigned_agent_id
              ? "Ce dossier est attribué à un autre agent."
              : "Vous devez d’abord prendre en charge ce dossier.",
        },
        403,
      );
    }

    const now =
      new Date().toISOString();

    /*
     * ============================================
     * CONFIRMER LE PAIEMENT
     * ============================================
     */

    if (
      body.action ===
      "confirm_payment"
    ) {
      /*
       * Le paiement ne peut être confirmé
       * que depuis payment_review.
       */

      if (
        insuranceRequest.status !==
        "payment_review"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Ce paiement ne peut pas être validé depuis son statut actuel.",
          },
          409,
        );
      }

      /*
       * Recherche du paiement.
       */

      const {
        data:
          payment,
        error:
          paymentSearchError,
      } =
        await serviceClient
          .from(
            "payments",
          )
          .select(
            `
              id,
              status
            `,
          )
          .eq(
            "request_id",
            id,
          )
          .maybeSingle();

      if (
        paymentSearchError
      ) {
        throw new Error(
          paymentSearchError.message,
        );
      }

      if (!payment) {
        return jsonResponse(
          {
            success: false,
            error:
              "Aucun paiement n’est associé à ce dossier.",
          },
          404,
        );
      }

      if (
        payment.status !==
        "submitted"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Ce paiement a déjà été traité ou n’est plus en attente de vérification.",
          },
          409,
        );
      }

      /*
       * VERROU ATOMIQUE.
       *
       * Une seule requête peut faire :
       *
       * payment_review
       *      ↓
       * payment_confirmed
       */

      const {
        data:
          lockedRequest,
        error:
          lockError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update({
            status:
              "payment_confirmed",

            updated_at:
              now,
          })
          .eq(
            "id",
            id,
          )
          .eq(
            "status",
            "payment_review",
          )
          .select(
            "id",
          )
          .maybeSingle();

      if (
        lockError
      ) {
        throw new Error(
          lockError.message,
        );
      }

      if (
        !lockedRequest
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Le statut du dossier a changé entre-temps. Actualisez la page.",
          },
          409,
        );
      }

      /*
       * Mise à jour conditionnelle du paiement.
       */

      const {
        data:
          updatedPayment,
        error:
          paymentUpdateError,
      } =
        await serviceClient
          .from(
            "payments",
          )
          .update({
            status:
              "confirmed",

            verified_at:
              now,

            verified_by:
              user.id,

            rejection_reason:
              null,
          })
          .eq(
            "id",
            payment.id,
          )
          .eq(
            "status",
            "submitted",
          )
          .select(
            "id",
          )
          .maybeSingle();

      if (
        paymentUpdateError
      ) {
        /*
         * Rollback du verrou.
         */

        const {
          error:
            rollbackError,
        } =
          await serviceClient
            .from(
              "insurance_requests",
            )
            .update({
              status:
                "payment_review",

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              id,
            )
            .eq(
              "status",
              "payment_confirmed",
            );

        if (
          rollbackError
        ) {
          console.error(
            "Rollback payment_confirmed impossible :",
            rollbackError.message,
          );
        }

        throw new Error(
          paymentUpdateError.message,
        );
      }

      if (
        !updatedPayment
      ) {
        const {
          error:
            rollbackError,
        } =
          await serviceClient
            .from(
              "insurance_requests",
            )
            .update({
              status:
                "payment_review",

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              id,
            )
            .eq(
              "status",
              "payment_confirmed",
            );

        if (
          rollbackError
        ) {
          console.error(
            "Rollback payment_confirmed impossible :",
            rollbackError.message,
          );
        }

        return jsonResponse(
          {
            success: false,
            error:
              "Le paiement a changé entre-temps. Actualisez la page.",
          },
          409,
        );
      }

      await safeLogActivity({
        requestId:
          id,

        userId:
          user.id,

        action:
          "payment_confirmed",

        description:
          "Paiement confirmé par un agent.",
      });

      return jsonResponse(
        {
          success: true,

          action:
            body.action,

          status:
            "payment_confirmed",
        },
      );
    }

    /*
     * ============================================
     * REFUSER LE PAIEMENT
     * ============================================
     */

    if (
      body.action ===
      "reject_payment"
    ) {
      if (
        insuranceRequest.status !==
        "payment_review"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Ce paiement ne peut pas être refusé depuis son statut actuel.",
          },
          409,
        );
      }

      const {
        data:
          payment,
        error:
          paymentSearchError,
      } =
        await serviceClient
          .from(
            "payments",
          )
          .select(
            `
              id,
              status
            `,
          )
          .eq(
            "request_id",
            id,
          )
          .maybeSingle();

      if (
        paymentSearchError
      ) {
        throw new Error(
          paymentSearchError.message,
        );
      }

      if (!payment) {
        return jsonResponse(
          {
            success: false,
            error:
              "Aucun paiement n’est associé à ce dossier.",
          },
          404,
        );
      }

      if (
        payment.status !==
        "submitted"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Ce paiement a déjà été traité ou n’est plus en attente de vérification.",
          },
          409,
        );
      }

      /*
       * VERROU ATOMIQUE :
       *
       * payment_review
       *      ↓
       * payment_rejected
       */

      const {
        data:
          lockedRequest,
        error:
          lockError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update({
            status:
              "payment_rejected",

            updated_at:
              now,
          })
          .eq(
            "id",
            id,
          )
          .eq(
            "status",
            "payment_review",
          )
          .select(
            "id",
          )
          .maybeSingle();

      if (
        lockError
      ) {
        throw new Error(
          lockError.message,
        );
      }

      if (
        !lockedRequest
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Le statut du dossier a changé entre-temps. Actualisez la page.",
          },
          409,
        );
      }

      const {
        data:
          updatedPayment,
        error:
          paymentUpdateError,
      } =
        await serviceClient
          .from(
            "payments",
          )
          .update({
            status:
              "rejected",

            verified_at:
              now,

            verified_by:
              user.id,

            rejection_reason:
              rejectionReason,
          })
          .eq(
            "id",
            payment.id,
          )
          .eq(
            "status",
            "submitted",
          )
          .select(
            "id",
          )
          .maybeSingle();

      if (
        paymentUpdateError
      ) {
        const {
          error:
            rollbackError,
        } =
          await serviceClient
            .from(
              "insurance_requests",
            )
            .update({
              status:
                "payment_review",

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              id,
            )
            .eq(
              "status",
              "payment_rejected",
            );

        if (
          rollbackError
        ) {
          console.error(
            "Rollback payment_rejected impossible :",
            rollbackError.message,
          );
        }

        throw new Error(
          paymentUpdateError.message,
        );
      }

      if (
        !updatedPayment
      ) {
        const {
          error:
            rollbackError,
        } =
          await serviceClient
            .from(
              "insurance_requests",
            )
            .update({
              status:
                "payment_review",

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              id,
            )
            .eq(
              "status",
              "payment_rejected",
            );

        if (
          rollbackError
        ) {
          console.error(
            "Rollback payment_rejected impossible :",
            rollbackError.message,
          );
        }

        return jsonResponse(
          {
            success: false,
            error:
              "Le paiement a changé entre-temps. Actualisez la page.",
          },
          409,
        );
      }

      await safeLogActivity({
        requestId:
          id,

        userId:
          user.id,

        action:
          "payment_rejected",

        description:
          `Paiement refusé. Motif : ${rejectionReason}`,
      });

      return jsonResponse(
        {
          success: true,

          action:
            body.action,

          status:
            "payment_rejected",
        },
      );
    }

    /*
     * ============================================
     * COMMENCER LA PRÉPARATION
     * ============================================
     */

    if (
      body.action ===
      "start_policy"
    ) {
      if (
        insuranceRequest.status !==
        "payment_confirmed"
      ) {
        return jsonResponse(
          {
            success: false,

            error:
              "La préparation ne peut commencer qu’après validation du paiement.",
          },
          409,
        );
      }

      /*
       * Transition atomique :
       *
       * payment_confirmed
       *      ↓
       * policy_preparation
       */

      const {
        data:
          updatedRequest,
        error:
          updateError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update({
            status:
              "policy_preparation",

            updated_at:
              now,
          })
          .eq(
            "id",
            id,
          )
          .eq(
            "status",
            "payment_confirmed",
          )
          .select(
            "id",
          )
          .maybeSingle();

      if (
        updateError
      ) {
        throw new Error(
          updateError.message,
        );
      }

      if (
        !updatedRequest
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Le statut du dossier a changé entre-temps. Actualisez la page.",
          },
          409,
        );
      }

      await safeLogActivity({
        requestId:
          id,

        userId:
          user.id,

        action:
          "policy_preparation_started",

        description:
          "Préparation de l’assurance commencée.",
      });

      return jsonResponse(
        {
          success: true,

          action:
            body.action,

          status:
            "policy_preparation",
        },
      );
    }

    /*
     * ============================================
     * ANNULER LE DOSSIER
     * ============================================
     */

    if (
      body.action ===
      "cancel_request"
    ) {
      /*
       * Une police disponible ne doit
       * plus être annulable ici.
       */

      if (
        insuranceRequest.status ===
        "policy_available"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Un dossier dont la police est déjà disponible ne peut pas être annulé.",
          },
          409,
        );
      }

      if (
        insuranceRequest.status ===
        "cancelled"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Ce dossier est déjà annulé.",
          },
          409,
        );
      }

      const previousStatus =
        insuranceRequest.status;

      /*
       * Mise à jour conditionnelle sur
       * l'ancien statut.
       *
       * Ainsi, si une autre action modifie
       * le dossier entre-temps, l'annulation
       * échoue au lieu d'écraser le nouveau
       * statut.
       */

      const {
        data:
          cancelledRequest,
        error:
          updateError,
      } =
        await serviceClient
          .from(
            "insurance_requests",
          )
          .update({
            status:
              "cancelled",

            updated_at:
              now,
          })
          .eq(
            "id",
            id,
          )
          .eq(
            "status",
            previousStatus,
          )
          .select(
            "id",
          )
          .maybeSingle();

      if (
        updateError
      ) {
        throw new Error(
          updateError.message,
        );
      }

      if (
        !cancelledRequest
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Le statut du dossier a changé entre-temps. Actualisez la page.",
          },
          409,
        );
      }

      await safeLogActivity({
        requestId:
          id,

        userId:
          user.id,

        action:
          "request_cancelled",

        description:
          `Dossier annulé. Statut précédent : ${previousStatus}.`,
      });

      return jsonResponse(
        {
          success: true,

          action:
            body.action,

          status:
            "cancelled",
        },
      );
    }

    /*
     * Cette partie ne devrait jamais
     * être atteinte grâce à isAllowedAction.
     */

    return jsonResponse(
      {
        success: false,
        error:
          "Action invalide.",
      },
      400,
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur de mise à jour du statut :",
      error,
    );

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      500,
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  return handleStatusUpdate(
    request,
    context,
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  return handleStatusUpdate(
    request,
    context,
  );
}