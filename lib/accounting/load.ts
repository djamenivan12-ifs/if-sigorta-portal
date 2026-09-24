import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { readAccountingRows } from "./readRows";

import { dateLabel, type AccountingData, type History } from "./model";

export async function loadAccounting(): Promise<AccountingData> {
  const db = createServiceClient();

  const missingTables: string[] = [];
  async function rows(table: string, columns: string) {
    const result = await readAccountingRows(table, (from, to) =>
      db.from(table).select(columns).order("id").range(from, to),
    );
    if (result.missing) missingTables.push(table);
    return result.data;
  }

  const [
    companies,
    rates,
    deposits,
    withdrawals,
    nationalityRates,
    refunds,
    requests,
    payments,
    policies,
    rateHistory,
    partners,
    requestEvents,
    captureMetadata,
  ] = await Promise.all([
    rows("insurance_companies", "id,name,is_active,updated_at"),

    rows(
      "insurance_cost_rates",
      "id,insurance_company_id,min_age,max_age,duration_years,real_cost,effective_from,is_active,updated_at",
    ),

    rows(
      "insurance_company_deposits",
      "id,insurance_company_id,amount,deposit_date,payment_method,reference,note,created_by,created_at",
    ),

    rows(
      "insurance_company_withdrawals",
      "id,insurance_company_id,amount,withdrawal_date,reason,reference,created_by,created_at,cancelled_at,cancelled_by",
    ),
    rows("insurance_nationality_rates", "*"),
    rows("client_refunds", "*"),
    rows(
      "insurance_requests",
      "id,request_code,partner_id,insurance_company_id,calculated_age,insurance_duration_years,actual_insurance_cost,insurance_company_selected_at,status",
    ),

    rows("payments", "id,request_id,expected_amount,status,verified_at"),

    rows(
      "insurance_policies",
      "id,request_id,policy_number,issue_date,expiration_date,uploaded_at,created_at",
    ),

    rows(
      "insurance_cost_rate_history",
      "id,insurance_company_id,insurance_cost_rate_id,min_age,max_age,duration_years,real_cost,effective_from,is_active,changed_by,changed_at",
    ),

    rows("partners", "id,code,company_name,manager_name,is_active"),

    rows("insurer_request_events","id,request_id,captured_at,event_type,snapshot"),
    rows("accounting_capture_metadata","id,started_at"),
  ]);

  /*
   * Index des dossiers.
   */
  const requestsById = new Map(
    requests.map((request) => [String(request.id), request]),
  );

  /*
   * Index des partenaires.
   */
  const partnersById = new Map(
    partners.map((partner) => [String(partner.id), partner]),
  );

  /*
   * Détermine si un dossier est :
   * - Client direct
   * - Partenaire
   */
  function requestOrigin(request: Record<string, unknown> | undefined) {
    if (!request?.partner_id) {
      return {
        origin: "client" as const,
        partner_id: null,
        partner_name: null,
      };
    }

    const partnerId = String(request.partner_id);

    const partner = partnersById.get(partnerId);

    return {
      origin: "partner" as const,

      partner_id: partnerId,

      partner_name: partner?.company_name
        ? String(partner.company_name)
        : "Partenaire",
    };
  }

  /*
   * Historique comptable global.
   */
  const history: History[] = [];

  /*
   * 1. DÉPÔTS ASSUREURS
   */
  for (const deposit of deposits) {
    history.push({
      id: `deposit-${deposit.id}`,

      type: "deposit",

      occurred_at: String(deposit.created_at || deposit.deposit_date || ""),

      insurance_company_id: deposit.insurance_company_id
        ? String(deposit.insurance_company_id)
        : null,

      request_id: null,
      request_code: null,

      origin: null,
      partner_id: null,
      partner_name: null,

      title: "Dépôt assureur",

      description: deposit.reference
        ? `Référence : ${deposit.reference}`
        : deposit.payment_method
          ? String(deposit.payment_method)
          : "Dépôt enregistré",

      amount:
        deposit.amount === null || deposit.amount === undefined
          ? null
          : (deposit.amount as number | string),

      direction: "in",

      author_id: deposit.created_by ? String(deposit.created_by) : null,
    });
  }

  for (const w of withdrawals) {
    const common = {
      insurance_company_id: String(w.insurance_company_id),
      request_id: null,
      request_code: null,
      origin: null,
      partner_id: null,
      partner_name: null,
      amount: w.amount as number | string,
    };
    history.push({
      ...common,
      id: "withdrawal-" + w.id,
      type: "withdrawal",
      occurred_at: String(w.withdrawal_date),
      title: "Retrait assureur",
      description: String(w.reason) + (w.reference ? " · " + w.reference : ""),
      direction: "out",
      author_id: String(w.created_by),
    });
    if (w.cancelled_at)
      history.push({
        ...common,
        id: "withdrawal-cancelled-" + w.id,
        type: "withdrawal_cancelled",
        occurred_at: String(w.cancelled_at),
        title: "Retrait annulé",
        description: "Annulation · " + w.reason,
        direction: "in",
        author_id: String(w.cancelled_by),
      });
  }
  /*
   * 2. PAIEMENTS CONFIRMÉS
   */
  for (const payment of payments) {
    if (payment.status !== "confirmed" || !payment.verified_at) {
      continue;
    }

    const request = requestsById.get(String(payment.request_id));

    const origin = requestOrigin(request);

    history.push({
      id: `payment-${payment.id}`,

      type: "payment",

      occurred_at: String(payment.verified_at),

      insurance_company_id: request?.insurance_company_id
        ? String(request.insurance_company_id)
        : null,

      request_id: payment.request_id ? String(payment.request_id) : null,

      request_code: request?.request_code ? String(request.request_code) : null,

      origin: origin.origin,

      partner_id: origin.partner_id,

      partner_name: origin.partner_name,

      title:
        origin.origin === "partner" ? "Paiement partenaire" : "Paiement client",

      description:
        origin.origin === "partner"
          ? `Paiement confirmé — ${origin.partner_name ?? "Partenaire"}${
              request?.request_code ? ` — ${request.request_code}` : ""
            }`
          : request?.request_code
            ? `Paiement confirmé — ${request.request_code}`
            : "Paiement confirmé",

      amount:
        payment.expected_amount === null ||
        payment.expected_amount === undefined
          ? null
          : (payment.expected_amount as number | string),

      direction: "in",

      author_id: null,
    });
  }

  /*
   * 3. ASSURANCES DISPONIBLES
   *
   * Le coût réel de l'assurance est
   * enregistré dans l'historique lorsque
   * la police existe réellement.
   *
   * uploaded_at est utilisé en priorité.
   */
  for (const policy of policies) {
    const request = requestsById.get(String(policy.request_id));

    if (!request) {
      continue;
    }

    const origin = requestOrigin(request);

    const occurredAt =
      policy.uploaded_at || policy.created_at || policy.issue_date;

    if (!occurredAt) {
      continue;
    }

    history.push({
      id: `policy-${policy.id}`,

      type: "policy",

      occurred_at: String(occurredAt),

      insurance_company_id: request.insurance_company_id
        ? String(request.insurance_company_id)
        : null,

      request_id: String(request.id),

      request_code: request.request_code ? String(request.request_code) : null,

      origin: origin.origin,

      partner_id: origin.partner_id,

      partner_name: origin.partner_name,

      title: "Assurance disponible",

      description: policy.policy_number
        ? `Police ${policy.policy_number}${
            request.request_code ? ` — ${request.request_code}` : ""
          }`
        : request.request_code
          ? `Police disponible — ${request.request_code}`
          : "Police disponible",

      amount:
        request.actual_insurance_cost === null ||
        request.actual_insurance_cost === undefined
          ? null
          : (request.actual_insurance_cost as number | string),

      direction: "out",

      author_id: null,
    });
  }

  /*
   * 4. MODIFICATIONS DE TARIFS
   */
  for (const item of rateHistory) {
    history.push({
      id: `rate-${item.id}`,

      type: "rate",

      occurred_at: String(item.changed_at || ""),

      insurance_company_id: item.insurance_company_id
        ? String(item.insurance_company_id)
        : null,

      request_id: null,
      request_code: null,

      origin: null,
      partner_id: null,
      partner_name: null,

      title: "Modification tarifaire",

      description:
        `${item.min_age}–${item.max_age} ans · ` +
        `${item.duration_years} an(s) · ` +
        `${item.is_active ? "ancien tarif actif" : "ancien tarif inactif"}`,

      amount:
        item.real_cost === null || item.real_cost === undefined
          ? null
          : (item.real_cost as number | string),

      direction: "neutral",

      author_id: item.changed_by ? String(item.changed_by) : null,
    });
  }

  /*
   * Plus récent en premier.
   */

  /*
   * Récupération des noms
   * des administrateurs/auteurs.
   */
  for (const refund of refunds) {
    const request = requestsById.get(String(refund.request_id));
    const common = {
      insurance_company_id: request?.insurance_company_id ? String(request.insurance_company_id) : null,
      request_id: String(refund.request_id), request_code: request ? String(request.request_code) : null,
      ...requestOrigin(request), amount: refund.amount as string | number,
    };
    history.push({...common, id: "refund-" + refund.id, type: "refund", occurred_at: String(refund.created_at),
      title: "Remboursement client", description: "Remboursé le " + dateLabel(String(refund.refund_date)) + " · " + String(refund.reason) + " · " + String(refund.reference), direction: "out", author_id: String(refund.created_by)});
    if (refund.voided_at) history.push({...common, id: "refund-void-" + refund.id, type: "refund_voided", occurred_at: String(refund.voided_at),
      title: "Saisie de remboursement annulée", description: String(refund.void_reason), direction: "neutral", author_id: String(refund.voided_by)});
  }

  history.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  const authorIds = new Set(
    history
      .map((item) => item.author_id)
      .filter((id): id is string => Boolean(id)),
  );

  const users:{data:{users:import("@supabase/supabase-js").User[]}}={data:{users:[]}};
  const ids=Array.from(authorIds);for(let offset=0;offset<ids.length;offset+=10){const resolved=await Promise.all(ids.slice(offset,offset+10).map(id=>db.auth.admin.getUserById(id)));for(const result of resolved){if(result.error)throw Error("Les auteurs du journal sont temporairement indisponibles.");if(result.data.user)users.data.users.push(result.data.user);}}
  const authors = Object.fromEntries(
    users.data.users
      .filter((user) => authorIds.has(user.id))
      .map((user) => [
        user.id,

        String(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email ||
            "Administrateur",
        ),
      ]),
  );

  return {
    missingTables,
    companies,
    rates,
    deposits,
    withdrawals,
    nationalityRates,
    refunds,
    requests,
    payments,
    history,
    authors,

    requestEvents,
    captureStartedAt:captureMetadata[0]?.started_at,
    loadedAt: new Date().toISOString(),
  } as unknown as AccountingData;
}
