import { accountingMutation } from "@/lib/accounting/api";
import { ratesBody } from "@/lib/accounting/validation";
export async function POST(request: Request) {
  return accountingMutation(request, "create_rates", ratesBody);
}
