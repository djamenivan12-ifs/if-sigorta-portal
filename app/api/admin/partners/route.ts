import { NextResponse } from "next/server";

import {
  requireApiRole,
} from "@/lib/auth/requireApiRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type CreatePartnerPayload = {
  companyName?: string;
  managerName?: string;
  email?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
};

function cleanPhoneNumber(
  value: string,
) {
  return value.replace(
    /\D/g,
    "",
  );
}

function generatePartnerCode() {
  const randomPart =
    crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();

  return `PART-${randomPart}`;
}

export async function POST(
  request: Request,
) {
  try {
    /*
     * Seul un administrateur connecté
     * peut créer un partenaire.
     */
    const auth =
      await requireApiRole([
        "admin",
      ]);

    if (!auth.success) {
      return auth.response;
    }

    /*
     * Lecture du formulaire.
     */
    const body =
      (await request.json()) as CreatePartnerPayload;

    const companyName =
      body.companyName?.trim() ??
      "";

    const managerName =
      body.managerName?.trim() ??
      "";

    const email =
      body.email
        ?.trim()
        .toLowerCase() ??
      "";

    const whatsappCountryCode =
      body.whatsappCountryCode
        ?.trim() ??
      "";

    const whatsappNumber =
      cleanPhoneNumber(
        body.whatsappNumber ??
          "",
      );

    /*
     * Validation.
     */
    if (
      !companyName ||
      !managerName ||
      !email ||
      !whatsappCountryCode ||
      !whatsappNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tous les champs sont obligatoires.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (
      !email.includes("@")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’adresse e-mail est invalide.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const serviceClient =
      createServiceClient();

    /*
     * Vérification de l'adresse e-mail.
     */
    const {
      data: existingPartner,
      error:
        existingPartnerError,
    } =
      await serviceClient
        .from("partners")
        .select("id")
        .eq(
          "email",
          email,
        )
        .maybeSingle();

    if (
      existingPartnerError
    ) {
      throw new Error(
        existingPartnerError.message,
      );
    }

    if (existingPartner) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Un partenaire existe déjà avec cette adresse e-mail.",
        },
        {
          status: 409,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    /*
     * Génération du code partenaire.
     *
     * Une collision est extrêmement improbable,
     * mais plusieurs tentatives sont prévues
     * afin de garantir l'unicité.
     */
    let partnerCode = "";

    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      const candidateCode =
        generatePartnerCode();

      const {
        data: existingCode,
        error:
          existingCodeError,
      } =
        await serviceClient
          .from("partners")
          .select("id")
          .eq(
            "code",
            candidateCode,
          )
          .maybeSingle();

      if (
        existingCodeError
      ) {
        throw new Error(
          existingCodeError.message,
        );
      }

      if (!existingCode) {
        partnerCode =
          candidateCode;

        break;
      }
    }

    if (!partnerCode) {
      throw new Error(
        "Impossible de générer un code partenaire unique.",
      );
    }

    /*
     * Création du partenaire.
     *
     * Aucun compte Supabase Auth n'est encore
     * créé ici. Cette partie sera ajoutée
     * pendant la phase d'authentification
     * partenaire.
     */
    const {
      data: partner,
      error: insertError,
    } =
      await serviceClient
        .from("partners")
        .insert({
          code:
            partnerCode,

          company_name:
            companyName,

          manager_name:
            managerName,

          email,

          whatsapp_country_code:
            whatsappCountryCode,

          whatsapp_number:
            whatsappNumber,

          is_active:
            true,
        })
        .select(
          `
            id,
            code,
            company_name,
            manager_name,
            email,
            whatsapp_country_code,
            whatsapp_number,
            is_active,
            created_at
          `,
        )
        .single();

    if (insertError) {
      const normalizedMessage =
        insertError.message
          .toLowerCase();

      if (
        normalizedMessage.includes(
          "duplicate",
        ) ||
        normalizedMessage.includes(
          "unique",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un partenaire existe déjà avec ces informations.",
          },
          {
            status: 409,
            headers: {
              "Cache-Control":
                "no-store",
            },
          },
        );
      }

      throw new Error(
        insertError.message,
      );
    }

    return NextResponse.json(
      {
        success: true,

        partnerId:
          partner.id,

        partnerCode:
          partner.code,

        partner,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erreur de création du partenaire :",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}