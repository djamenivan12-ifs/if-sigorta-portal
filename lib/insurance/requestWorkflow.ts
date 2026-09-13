/** States accepted by the atomic claim API and the common queue. */
export const CLAIMABLE_STATUSES = [
  "waiting_payment",
  "payment_review",
  "payment_confirmed",
  "policy_preparation",
] as const;
