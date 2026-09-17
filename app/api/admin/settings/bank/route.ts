import { NextResponse } from "next/server";
import { normalizeIban, isValidIban } from "@/lib/validation/iban";

import {
  requireApiRole,
} from "@/lib/auth/requireApiRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type RequestBody = {
  expected?: {beneficiary:string;bankName:string;iban:string};
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

    const iban = normalizeIban(body.iban);

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

    if (!isValidIban(iban)) {
      return NextResponse.json({ success: false, error: "L’IBAN est invalide. Vérifiez le pays, la longueur et les chiffres de contrôle." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const serviceClient =
      createServiceClient();

    /*
     * ============================================
     * 5. RECHERCHE DES PARAMÈTRES ACTUELS
     * ============================================
     */

    if(!body.expected)return NextResponse.json({success:false,error:"Actualisez les coordonnées avant de les enregistrer."},{status:400});
    const {data:saved,error:saveError}=await serviceClient.rpc("save_bank_settings",{p_actor:auth.user.id,p_expected:body.expected,p_values:{beneficiary,bankName,iban}});
    if(saveError)return NextResponse.json({success:false,error:saveError.code==="40001"?"Les coordonnées ont été modifiées. Actualisez avant de réessayer.":"Les coordonnées n’ont pas pu être enregistrées."},{status:saveError.code==="40001"?409:saveError.code==="PGRST202"?503:500});
    return NextResponse.json(
      {
        success:
          true,
        saved,
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