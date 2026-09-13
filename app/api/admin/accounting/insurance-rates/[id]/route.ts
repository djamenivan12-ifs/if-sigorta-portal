import { accountingMutation } from "@/lib/accounting/api";
import { rateBody, uuid } from "@/lib/accounting/validation";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return accountingMutation(request, "update_rate", (v) => ({ ...rateBody(v), id: uuid(id) }));
}
