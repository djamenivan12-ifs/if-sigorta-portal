import {
  NextResponse,
} from "next/server";

import {
  createServiceClient,
} from "@/lib/supabase/service";

export async function GET() {
  try {
    const serviceClient =
      createServiceClient();

    const {
      data,
      error,
    } =
      await serviceClient
        .from(
          "contact_settings",
        )
        .select(
          `
            whatsapp_country_code,
            whatsapp_number
          `,
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

    if (error) {
      throw new Error(
        error.message,
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Aucun numéro WhatsApp actif.",
        },
        {
          status:
            404,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const countryCode =
      String(
        data.whatsapp_country_code ??
          "",
      ).replace(
        /\D/g,
        "",
      );

    const number =
      String(
        data.whatsapp_number ??
          "",
      ).replace(
        /\D/g,
        "",
      );

    if (
      !countryCode ||
      !number
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Le numéro WhatsApp est incomplet.",
        },
        {
          status:
            404,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        whatsappNumber:
          `${countryCode}${number}`,
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
      "Erreur récupération WhatsApp public :",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Impossible de récupérer le numéro WhatsApp.",
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