export type PaymentStatus = "pending" | "review" | "confirmed" | "rejected" | "unknown";
/** Never infer successful payment from a verification timestamp or policy lifecycle. */
export function normalizePaymentStatus(status:string|null|undefined,requestStatus?:string):PaymentStatus {
  switch(status){
    case "confirmed": case "verified": case "payment_confirmed": return "confirmed";
    case "rejected": case "payment_rejected": return "rejected";
    case "submitted": case "review": case "payment_review": return "review";
    case "pending": return "pending";
    case "": case null: case undefined:
      if(requestStatus === "payment_confirmed") return "confirmed";
      if(requestStatus === "payment_rejected") return "rejected";
      if(requestStatus === "payment_review") return "review";
      return "unknown";
    default: return "unknown";
  }
}
