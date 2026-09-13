export function normalizeActivityAction(action: string): string {
    if (action === "policy_whatsapp_sent" || action === "partner_policy_whatsapp_sent")
        return "whatsapp_sent";
    if (action === "policy_whatsapp_failed" || action === "partner_policy_whatsapp_failed")
        return "whatsapp_failed";
    return action;
}
