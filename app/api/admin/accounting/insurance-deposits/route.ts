import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type CreateDepositPayload = {
  insuranceCompanyId?: string;
  amount?: number;
  depositDate?: string;
  paymentMethod?: string | null;
  reference?: string | null;
  note?: string | null;
};

function isValidDateString(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

export async function POST(
  request: Request,
) {
  try {
    const auth =
      await requireRole([
        "admin",
      ]);

    const body =
      (await request.json()) as CreateDepositPayload;

    const insuranceCompanyId =
      body.insuranceCompanyId?.trim();

    const amount =
      Number(
        body.amount,
      );

    const depositDate =
      body.depositDate?.trim();

    const paymentMethod =
      body.paymentMethod?.trim() ||
      null;

    const reference =
      body.reference?.trim() ||
      null;

    const note =
      body.note?.trim() ||
      null;

    if (
      !insuranceCompanyId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Veuillez sélectionner un assureur.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le montant du dépôt est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !depositDate ||
      !isValidDateString(
        depositDate,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La date du dépôt est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    const serviceClient =
      createServiceClient();

    const {
      data: company,
      error: companyError,
    } =
      await serviceClient
        .from(
          "insurance_companies",
        )
        .select(`
          id,
          name,
          is_active
        `)
        .eq(
          "id",
          insuranceCompanyId,
        )
        .maybeSingle();

    if (
      companyError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            companyError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Assureur introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !company.is_active
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cet assureur est actuellement inactif.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: createdDeposit,
      error: insertError,
    } =
      await serviceClient
        .from(
          "insurance_company_deposits",
        )
        .insert({
          insurance_company_id:
            insuranceCompanyId,

          amount,

          deposit_date:
            depositDate,

          payment_method:
            paymentMethod,

          reference,

          note,

          created_by:
            auth.user.id,
        })
        .select(`
          id,
          insurance_company_id,
          amount,
          deposit_date,
          payment_method,
          reference,
          note,
          created_by,
          created_at,
          updated_at
        `)
        .single();

    if (
      insertError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            insertError.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        deposit:
          createdDeposit,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue.",
      },
      {
        status: 500,
      },
    );
  }
}