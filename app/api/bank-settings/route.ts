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
          "bank_settings",
        )
        .select(
          `
            beneficiary,
            bank_name,
            iban
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
            "Aucune coordonnée bancaire active n'est configurée.",
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

    const beneficiary =
      String(
        data.beneficiary ??
          "",
      ).trim();

    const bankName =
      String(
        data.bank_name ??
          "",
      ).trim();

    const iban =
      String(
        data.iban ??
          "",
      )
        .trim()
        .toUpperCase();

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
            "Les coordonnées bancaires sont incomplètes.",
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

        beneficiary,

        bankName,

        iban,
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
      "Erreur récupération coordonnées bancaires :",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Impossible de récupérer les coordonnées bancaires.",
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