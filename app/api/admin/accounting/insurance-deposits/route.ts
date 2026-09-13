import { accountingMutation } from "@/lib/accounting/api";
import { depositBody } from "@/lib/accounting/validation";
export async function POST(request: Request) {
  return accountingMutation(request, "deposit", depositBody);
}
