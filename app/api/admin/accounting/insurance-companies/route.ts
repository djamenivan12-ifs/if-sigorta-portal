import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type CreateInsuranceCompanyPayload = {
  name?: string;
  isActive?: boolean;
};

export async function GET() {
  try {
    await requireRole(["admin"]);

    const serviceClient =
      createServiceClient();

    const {
      data: companies,
      error,
    } = await serviceClient
      .from("insurance_companies")
      .select(`
        id,
        name,
        is_active,
        created_at,
        updated_at
      `)
      .order("name", {
        ascending: true,
      });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      companies: companies ?? [],
    });
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

export async function POST(
  request: Request,
) {
  try {
    await requireRole(["admin"]);

    const body =
      (await request.json()) as CreateInsuranceCompanyPayload;

    const name =
      body.name?.trim();

    const isActive =
      body.isActive ?? true;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom de l’assureur est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    const serviceClient =
      createServiceClient();

    const {
      data: existingCompany,
      error: existingCompanyError,
    } = await serviceClient
      .from("insurance_companies")
      .select(`
        id,
        name
      `)
      .ilike("name", name)
      .maybeSingle();

    if (existingCompanyError) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingCompanyError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (existingCompany) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cet assureur existe déjà.",
        },
        {
          status: 409,
        },
      );
    }

    const {
      data: createdCompany,
      error: insertError,
    } = await serviceClient
      .from("insurance_companies")
      .insert({
        name,
        is_active: isActive,
      })
      .select(`
        id,
        name,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (insertError) {
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
        company: createdCompany,
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
