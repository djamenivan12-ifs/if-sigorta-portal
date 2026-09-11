import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateInsuranceCompanyPayload = {
  name?: string;
  isActive?: boolean;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    await requireRole(["admin"]);

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Assureur invalide." },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();

    const { data: company, error } = await serviceClient
      .from("insurance_companies")
      .select(`
        id,
        name,
        is_active,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Assureur introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      company,
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
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    await requireRole(["admin"]);

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Assureur invalide." },
        { status: 400 },
      );
    }

    const body =
      (await request.json()) as UpdateInsuranceCompanyPayload;

    const hasName = typeof body.name === "string";
    const hasIsActive =
      typeof body.isActive === "boolean";

    if (!hasName && !hasIsActive) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucune modification valide n’a été fournie.",
        },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();

    const {
      data: existingCompany,
      error: existingCompanyError,
    } = await serviceClient
      .from("insurance_companies")
      .select(`
        id,
        name,
        is_active
      `)
      .eq("id", id)
      .maybeSingle();

    if (existingCompanyError) {
      return NextResponse.json(
        {
          success: false,
          error: existingCompanyError.message,
        },
        { status: 500 },
      );
    }

    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: "Assureur introuvable." },
        { status: 404 },
      );
    }

    const updatePayload: {
      name?: string;
      is_active?: boolean;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (hasName) {
      const name = body.name?.trim() ?? "";

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: "Le nom de l’assureur est obligatoire.",
          },
          { status: 400 },
        );
      }

      const {
        data: duplicateCompany,
        error: duplicateError,
      } = await serviceClient
        .from("insurance_companies")
        .select("id")
        .ilike("name", name)
        .neq("id", id)
        .limit(1)
        .maybeSingle();

      if (duplicateError) {
        return NextResponse.json(
          {
            success: false,
            error: duplicateError.message,
          },
          { status: 500 },
        );
      }

      if (duplicateCompany) {
        return NextResponse.json(
          {
            success: false,
            error: "Un autre assureur porte déjà ce nom.",
          },
          { status: 409 },
        );
      }

      updatePayload.name = name;
    }

    if (hasIsActive) {
      updatePayload.is_active = body.isActive;
    }

    const {
      data: updatedCompany,
      error: updateError,
    } = await serviceClient
      .from("insurance_companies")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        id,
        name,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      company: updatedCompany,
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
      { status: 500 },
    );
  }
}
