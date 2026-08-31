import {
  NextResponse,
} from "next/server";

import {
  requireApiRole,
} from "@/lib/auth/requireApiRole";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type UpdatePartnerPayload = {
  companyName?: string;
  managerName?: string;
  email?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
  isActive?: boolean;
};

function cleanPhoneNumber(
  value: string,
) {
  return value.replace(
    /\D/g,
    "",
  );
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth =
      await requireApiRole([
        "admin",
      ]);

    if (
      !auth.success
    ) {
      return auth.response;
    }

    const {
      id,
    } =
      await params;

    if (
      !id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant partenaire invalide.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      (await request.json()) as UpdatePartnerPayload;

    const companyName =
      body.companyName
        ?.trim();

    const managerName =
      body.managerName
        ?.trim();

    const email =
      body.email
        ?.trim()
        .toLowerCase();

    const whatsappCountryCode =
      body.whatsappCountryCode
        ?.trim();

    const whatsappNumber =
      body.whatsappNumber !==
      undefined
        ? cleanPhoneNumber(
            body.whatsappNumber,
          )
        : undefined;

    if (
      companyName !==
        undefined &&
      !companyName
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom du partenaire est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      managerName !==
        undefined &&
      !managerName
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom du responsable est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email !== undefined
    ) {
      if (
        !email ||
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
          },
        );
      }
    }

    if (
      whatsappCountryCode !==
        undefined &&
      !whatsappCountryCode
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L’indicatif WhatsApp est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      whatsappNumber !==
        undefined &&
      !whatsappNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le numéro WhatsApp est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      createServiceClient();

    const {
      data: existingPartner,
      error:
        existingPartnerError,
    } =
      await supabase
        .from("partners")
        .select(
          `
            id,
            email
          `,
        )
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (
      existingPartnerError
    ) {
      throw new Error(
        existingPartnerError.message,
      );
    }

    if (
      !existingPartner
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Partenaire introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      email !== undefined &&
      email !==
        existingPartner.email
    ) {
      const {
        data:
          partnerWithSameEmail,
        error:
          duplicateEmailError,
      } =
        await supabase
          .from("partners")
          .select("id")
          .eq(
            "email",
            email,
          )
          .neq(
            "id",
            id,
          )
          .maybeSingle();

      if (
        duplicateEmailError
      ) {
        throw new Error(
          duplicateEmailError.message,
        );
      }

      if (
        partnerWithSameEmail
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un autre partenaire utilise déjà cette adresse e-mail.",
          },
          {
            status: 409,
          },
        );
      }
    }

    const updates: {
      company_name?: string;
      manager_name?: string;
      email?: string;
      whatsapp_country_code?: string;
      whatsapp_number?: string;
      is_active?: boolean;
      updated_at: string;
    } = {
      updated_at:
        new Date().toISOString(),
    };

    if (
      companyName !==
      undefined
    ) {
      updates.company_name =
        companyName;
    }

    if (
      managerName !==
      undefined
    ) {
      updates.manager_name =
        managerName;
    }

    if (
      email !== undefined
    ) {
      updates.email =
        email;
    }

    if (
      whatsappCountryCode !==
      undefined
    ) {
      updates.whatsapp_country_code =
        whatsappCountryCode;
    }

    if (
      whatsappNumber !==
      undefined
    ) {
      updates.whatsapp_number =
        whatsappNumber;
    }

    if (
      typeof body.isActive ===
      "boolean"
    ) {
      updates.is_active =
        body.isActive;
    }

    const {
      data: partner,
      error: updateError,
    } =
      await supabase
        .from("partners")
        .update(
          updates,
        )
        .eq(
          "id",
          id,
        )
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
            created_at,
            updated_at
          `,
        )
        .single();

    if (
      updateError
    ) {
      const message =
        updateError.message
          .toLowerCase();

      if (
        message.includes(
          "duplicate",
        ) ||
        message.includes(
          "unique",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Un partenaire utilise déjà ces informations.",
          },
          {
            status: 409,
          },
        );
      }

      throw new Error(
        updateError.message,
      );
    }

    return NextResponse.json(
      {
        success: true,
        partner,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur modification partenaire :",
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
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth =
      await requireApiRole([
        "admin",
      ]);

    if (
      !auth.success
    ) {
      return auth.response;
    }

    const {
      id,
    } =
      await params;

    if (
      !id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant partenaire invalide.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      createServiceClient();

    const {
      data: partner,
      error: partnerError,
    } =
      await supabase
        .from("partners")
        .select(
          `
            id,
            company_name
          `,
        )
        .eq(
          "id",
          id,
        )
        .maybeSingle();

    if (
      partnerError
    ) {
      throw new Error(
        partnerError.message,
      );
    }

    if (
      !partner
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Partenaire introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Un partenaire ayant déjà créé des dossiers
     * ne doit pas être supprimé afin de préserver
     * l'historique et la traçabilité.
     */
    const {
      count:
        requestCount,
      error:
        requestCountError,
    } =
      await supabase
        .from(
          "insurance_requests",
        )
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          },
        )
        .eq(
          "partner_id",
          id,
        );

    if (
      requestCountError
    ) {
      throw new Error(
        requestCountError.message,
      );
    }

    if (
      (requestCount ??
        0) > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ce partenaire possède déjà des dossiers. Il ne peut pas être supprimé. Désactivez-le afin de conserver l’historique.",
        },
        {
          status: 409,
        },
      );
    }

    const {
      error: deleteError,
    } =
      await supabase
        .from("partners")
        .delete()
        .eq(
          "id",
          id,
        );

    if (
      deleteError
    ) {
      throw new Error(
        deleteError.message,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Partenaire supprimé avec succès.",
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "Erreur suppression partenaire :",
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
      },
    );
  }
}