import { accountingMutation } from "@/lib/accounting/api";
import {
  withdrawalBody,
  cancelWithdrawalBody,
} from "@/lib/accounting/validation";
export async function POST(request: Request) {
  return accountingMutation(request, "withdrawal", withdrawalBody);
}
export async function PATCH(request: Request) {
  return accountingMutation(request, "cancel_withdrawal", cancelWithdrawalBody);
}
