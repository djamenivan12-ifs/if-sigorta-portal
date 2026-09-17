import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";

export class PaymentDecisionError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export type PaymentDecision = {
  requestId: string;
  paymentId: string;
  submittedAt: string | null;
  action: "confirm_payment" | "reject_payment";
  reason: string;
  actor: string;
  operationId: string;
};
export async function decidePayment(db: ReturnType<typeof createServiceClient>, decision: PaymentDecision) {
  const {data,error} = await db.rpc("decide_payment",{
    p_request_id:decision.requestId,p_payment_id:decision.paymentId,
    p_submitted_at:decision.submittedAt,p_action:decision.action,p_reason:decision.reason,
    p_actor:decision.actor,p_operation_id:decision.operationId,
  });
  if(error){
    if(error.code==="42501") throw new PaymentDecisionError("Vous n’êtes plus autorisé à traiter ce dossier. Actualisez la page.",403);
    if(error.code==="P0002") throw new PaymentDecisionError("Le dossier ou le paiement est introuvable.",404);
    if(error.code==="40001") throw new PaymentDecisionError("Le dossier, le justificatif ou la décision a changé. Actualisez la page.",409);
    if(["22023","22P02","22007","22008"].includes(error.code)) throw new PaymentDecisionError("La décision de paiement est invalide.",400);
    if(["PGRST202","42883"].includes(error.code)) throw new PaymentDecisionError("La validation sécurisée des paiements n’est pas encore installée. Aucun paiement n’a été modifié.",503);
    throw new PaymentDecisionError("L’enregistrement de la décision a échoué. Réessayez la même action ; les données seront vérifiées.",500);
  }
  if(!data || data.success!==true || data.action!==decision.action || !["payment_confirmed","payment_rejected"].includes(data.status))
    throw new PaymentDecisionError("La réponse de validation du paiement est invalide. Actualisez la page.",500);
  return data as {success:true;action:PaymentDecision["action"];status:string};
}
