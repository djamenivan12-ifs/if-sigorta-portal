import "server-only";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
import { AccountingError } from "./validation";
export async function accountingMutation(
  request: Request,
  action: string,
  validate: (v: unknown) => Record<string, unknown>,
) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.success) return auth.response;
  try {
    const payload = validate(await request.json().catch(() => null));
    const { data, error } = await createServiceClient().rpc(
      "accounting_write",
      {
        p_action: action,
        p_payload: payload,
        p_actor: auth.user.id,
      },
    );
    if (error) {
      if (["PGRST202", "PGRST205", "42883", "42P01"].includes(error.code))
        throw new AccountingError(
          "La mise à jour de la base comptable doit être appliquée avant cet enregistrement.",
          503,
        );

      if (error.code === "P0001")
        throw new AccountingError(
          "Solde disponible insuffisant ou données incomplètes. Vérifiez les dépôts, coûts et retraits de cet assureur.",
          409,
        );
      if (["23505", "23P01"].includes(error.code))
        throw new AccountingError(
          "Un assureur de ce nom ou une tranche tarifaire correspondante existe déjà. Vérifiez les valeurs.",
          409,
        );
      if (error.code === "40001")
        throw new AccountingError(
          "Cette ligne a changé ou cette opération a déjà été utilisée. Actualisez la page avant de réessayer.",
          409,
        );
      if (error.code === "P0002")
        throw new AccountingError(
          "Cette ligne n’existe plus. Actualisez la page.",
          404,
        );
      if (["22023", "22007", "22008", "23514"].includes(error.code))
        throw new AccountingError(
          "Vérifiez les valeurs et le statut de l’assureur.",
        );
      console.error("Accounting write failed", { code: error.code });
      throw new AccountingError(
        "L’enregistrement est temporairement indisponible. Vos saisies sont conservées ; réessayez plus tard.",
        503,
      );
    }
    revalidatePath("/admin/comptabilite", "layout");
    return NextResponse.json(
      { success: true, ...data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof AccountingError
            ? error.message
            : "Impossible d’enregistrer. Réessayez.",
      },
      {
        status: error instanceof AccountingError ? error.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
