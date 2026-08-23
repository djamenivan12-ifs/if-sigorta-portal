import { NextResponse } from "next/server";

import {
  requireApiRole,
} from "@/lib/auth/requireApiRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type RequestBody = {
  beneficiary?: string;
  bankName?: string;
  iban?: string;
};

export async function PUT(
  request: Request,
) {
  /*
   * ============================================
   * 1. AUTHENTIFICATION + AUTORISATION
   * ============================================
   */

  const auth =
    await requireApiRole([
      "admin",
    ]);

  if (!auth.success) {
    return auth.response;
  }

  try {
    /*
     * ============================================
     * 2. LECTURE DES DONNÉES
     * ============================================
     */

    const body =
      (await request.json()) as RequestBody;

    const beneficiary =
      body.beneficiary?.trim() ??
      "";

    const bankName =
      body.bankName?.trim() ??
      "";

    const iban =
      body.iban
        ?.trim()
        .toUpperCase() ??
      "";

    /*
     * ============================================
     * 3. VALIDATION
     * ============================================
     */

    if (
      !beneficiary ||
      !bankName ||
      !iban
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Toutes les coordonnées bancaires sont obligatoires.",
        },
        {
          status:
            400,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * ============================================
     * 4. CLIENT SUPABASE SERVEUR
     * ============================================
     */

    const serviceClient =
      createServiceClient();

    /*
     * ============================================
     * 5. RECHERCHE DES PARAMÈTRES ACTUELS
     * ============================================
     */

    const {
      data:
        currentSetting,
      error:
        searchError,
    } =
      await serviceClient
        .from(
          "bank_settings",
        )
        .select(
          "id",
        )
        .eq(
          "is_active",
          true,
        )
        .order(
          "id",
          {
            ascending:
              true,
          },
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (searchError) {
      throw new Error(
        searchError.message,
      );
    }

    const now =
      new Date().toISOString();

    /*
     * ============================================
     * 6. MISE À JOUR
     * ============================================
     */

    if (currentSetting) {
      const {
        error:
          updateError,
      } =
        await serviceClient
          .from(
            "bank_settings",
          )
          .update({
            beneficiary,

            bank_name:
              bankName,

            iban,

            updated_at:
              now,
          })
          .eq(
            "id",
            currentSetting.id,
          );

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }
    } else {
      /*
       * ============================================
       * 7. CRÉATION SI AUCUN PARAMÈTRE N'EXISTE
       * ============================================
       */

      const {
        error:
          insertError,
      } =
        await serviceClient
          .from(
            "bank_settings",
          )
          .insert({
            beneficiary,

            bank_name:
              bankName,

            iban,

            is_active:
              true,
          });

      if (insertError) {
        throw new Error(
          insertError.message,
        );
      }
    }

    /*
     * ============================================
     * 8. SUCCÈS
     * ============================================
     */

    return NextResponse.json(
      {
        success:
          true,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erreur paramètres bancaires :",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}