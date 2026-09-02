import ExcelJS from "exceljs";

import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ClientRelation =
  | {
      first_name: string | null;
      last_name: string | null;
      nationality: string | null;
      whatsapp_country_code: string | null;
      whatsapp_number: string | null;
    }
  | Array<{
      first_name: string | null;
      last_name: string | null;
      nationality: string | null;
      whatsapp_country_code: string | null;
      whatsapp_number: string | null;
    }>
  | null;

type PartnerRelation =
  | {
      code: string | null;
      company_name: string | null;
    }
  | Array<{
      code: string | null;
      company_name: string | null;
    }>
  | null;

type RequestRow = {
  id: string;
  request_code: string;
  source: string;
  partner_id: string | null;
  status: string;
  passport_number: string | null;
  kimlik_number: string | null;
  insurance_duration_years: number;
  calculated_age: number | null;
  calculated_price: number | string | null;
  insurance_start_date: string | null;
  created_at: string;
  client: ClientRelation;
  partner: PartnerRelation;
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  waiting_payment: "Paiement attendu",
  payment_review: "Paiement à vérifier",
  payment_confirmed: "Paiement confirmé",
  payment_rejected: "Paiement refusé",
  policy_preparation: "Assurance en préparation",
  policy_available: "Assurance disponible",
  cancelled: "Dossier annulé",
};

function normalizeRelation<T>(
  relation: T | T[] | null | undefined,
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function safeExcelText(
  value: string | null | undefined,
): string {
  const text = value?.toString().trim() ?? "";

  if (!text) {
    return "";
  }

  /*
   * Protection contre les formules Excel injectées
   * dans les données utilisateur.
   */
  if (/^[=+\-@]/.test(text)) {
    return `'${text}`;
  }

  return text;
}

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function createStartDate(value: string) {
  return new Date(`${value}T00:00:00+03:00`);
}

function createEndDate(value: string) {
  return new Date(`${value}T23:59:59.999+03:00`);
}

export async function GET(request: Request) {
  try {
    /*
     * Authentification.
     */
    const sessionClient =
      await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser();

    if (userError || !user) {
      return Response.json(
        {
          error: "Vous devez être connecté.",
        },
        {
          status: 401,
        },
      );
    }

    const role = user.app_metadata?.role;

    if (role !== "agent" && role !== "admin") {
      return Response.json(
        {
          error:
            "Vous n’avez pas l’autorisation d’exporter les dossiers.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Filtres URL.
     */
    const url = new URL(request.url);

    const search =
      url.searchParams.get("q")?.trim() ?? "";

    const status =
      url.searchParams.get("status")?.trim() ?? "";

    const source =
      url.searchParams.get("source")?.trim() ?? "";

    const nationality =
      url.searchParams.get("nationality")?.trim() ?? "";

    const duration =
      url.searchParams.get("duration")?.trim() ?? "";

    const dateFrom =
      url.searchParams.get("dateFrom")?.trim() ?? "";

    const dateTo =
      url.searchParams.get("dateTo")?.trim() ?? "";

    const serviceClient = createServiceClient();

    /*
     * Requête principale.
     */
    let query = serviceClient
      .from("insurance_requests")
      .select(
        `
          id,
          request_code,
          source,
          partner_id,
          status,
          passport_number,
          kimlik_number,
          insurance_duration_years,
          calculated_age,
          calculated_price,
          insurance_start_date,
          created_at,

          client:clients (
            first_name,
            last_name,
            nationality,
            whatsapp_country_code,
            whatsapp_number
          ),

          partner:partners (
            code,
            company_name
          )
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    /*
     * Source.
     *
     * On accepte uniquement les deux valeurs connues.
     * Toute autre valeur est ignorée.
     */
    if (source === "direct" || source === "partner") {
      query = query.eq("source", source);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (duration === "1" || duration === "2") {
      query = query.eq(
        "insurance_duration_years",
        Number(duration),
      );
    }

    if (dateFrom) {
      const startDate = createStartDate(dateFrom);

      if (!Number.isNaN(startDate.getTime())) {
        query = query.gte(
          "created_at",
          startDate.toISOString(),
        );
      }
    }

    if (dateTo) {
      const endDate = createEndDate(dateTo);

      if (!Number.isNaN(endDate.getTime())) {
        query = query.lte(
          "created_at",
          endDate.toISOString(),
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    let requests =
      (data ?? []) as unknown as RequestRow[];

    /*
     * Nationalité.
     */
    if (nationality) {
      const normalizedNationality =
        nationality.toLocaleLowerCase("fr-FR");

      requests = requests.filter(
        (insuranceRequest) => {
          const client =
            normalizeRelation(insuranceRequest.client);

          return (
            (client?.nationality ?? "")
              .trim()
              .toLocaleLowerCase("fr-FR") ===
            normalizedNationality
          );
        },
      );
    }

    /*
     * Recherche texte.
     *
     * La recherche couvre maintenant également
     * le nom et le code du partenaire.
     */
    if (search) {
      const normalizedSearch =
        search.toLocaleLowerCase("fr-FR");

      const normalizedPhoneSearch =
        search.replace(/\D/g, "");

      requests = requests.filter(
        (insuranceRequest) => {
          const client =
            normalizeRelation(insuranceRequest.client);

          const partner =
            normalizeRelation(insuranceRequest.partner);

          const firstName =
            client?.first_name ?? "";

          const lastName =
            client?.last_name ?? "";

          const fullName =
            `${firstName} ${lastName}`;

          const reverseFullName =
            `${lastName} ${firstName}`;

          const whatsapp = client
            ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`
            : "";

          const normalizedWhatsapp =
            whatsapp.replace(/\D/g, "");

          const passport =
            insuranceRequest.passport_number ?? "";

          const kimlik =
            insuranceRequest.kimlik_number ?? "";

          const partnerName =
            partner?.company_name ?? "";

          const partnerCode =
            partner?.code ?? "";

          return (
            insuranceRequest.request_code
              .toLocaleLowerCase("fr-FR")
              .includes(normalizedSearch) ||

            firstName
              .toLocaleLowerCase("fr-FR")
              .includes(normalizedSearch) ||

            lastName
              .toLocaleLowerCase("fr-FR")
              .includes(normalizedSearch) ||

            fullName
              .toLocaleLowerCase("fr-FR")
              .includes(normalizedSearch) ||

            reverseFullName
              .toLocaleLowerCase("fr-FR")
              .includes(normalizedSearch) ||

            passport
              .toLocaleLowerCase("fr-FR")
              .includes(normalizedSearch) ||

            kimlik
              .toLocaleLowerCase("fr-FR")
              .includes(normalizedSearch) ||

            partnerName
              .toLocaleLowerCase("fr-FR")
              .includes(normalizedSearch) ||

            partnerCode
              .toLocaleLowerCase("fr-FR")
              .includes(normalizedSearch) ||

            Boolean(
              normalizedPhoneSearch &&
                normalizedWhatsapp.includes(
                  normalizedPhoneSearch,
                ),
            )
          );
        },
      );
    }

    /*
     * Création Excel.
     */
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "IF Sigorta";
    workbook.created = new Date();

    const worksheet =
      workbook.addWorksheet("Dossiers");

    worksheet.columns = [
      {
        header: "Matricule",
        key: "requestCode",
        width: 22,
      },
      {
        header: "Source",
        key: "source",
        width: 18,
      },
      {
        header: "Partenaire",
        key: "partnerName",
        width: 26,
      },
      {
        header: "Code partenaire",
        key: "partnerCode",
        width: 20,
      },
      {
        header: "Nom",
        key: "lastName",
        width: 22,
      },
      {
        header: "Prénom",
        key: "firstName",
        width: 22,
      },
      {
        header: "Nationalité",
        key: "nationality",
        width: 20,
      },
      {
        header: "WhatsApp",
        key: "whatsapp",
        width: 20,
      },
      {
        header: "Passeport",
        key: "passport",
        width: 20,
      },
      {
        header: "Kimlik",
        key: "kimlik",
        width: 18,
      },
      {
        header: "Âge",
        key: "age",
        width: 10,
      },
      {
        header: "Durée",
        key: "duration",
        width: 12,
      },
      {
        header: "Prix (TL)",
        key: "price",
        width: 15,
      },
      {
        header: "Statut",
        key: "status",
        width: 28,
      },
      {
        header: "Début assurance",
        key: "insuranceStartDate",
        width: 20,
      },
      {
        header: "Date de création",
        key: "createdAt",
        width: 22,
      },
    ];

    for (const insuranceRequest of requests) {
      const client =
        normalizeRelation(insuranceRequest.client);

      const partner =
        normalizeRelation(insuranceRequest.partner);

      const whatsapp = client
        ? `${client.whatsapp_country_code ?? ""}${client.whatsapp_number ?? ""}`
        : "";

      const isPartner =
        insuranceRequest.source === "partner";

      worksheet.addRow({
        requestCode: safeExcelText(
          insuranceRequest.request_code,
        ),

        source: isPartner
          ? "Partenaire"
          : "Client direct",

        partnerName: isPartner
          ? safeExcelText(partner?.company_name)
          : "",

        partnerCode: isPartner
          ? safeExcelText(partner?.code)
          : "",

        lastName: safeExcelText(
          client?.last_name,
        ),

        firstName: safeExcelText(
          client?.first_name,
        ),

        nationality: safeExcelText(
          client?.nationality,
        ),

        whatsapp: safeExcelText(whatsapp),

        passport: safeExcelText(
          insuranceRequest.passport_number,
        ),

        kimlik: safeExcelText(
          insuranceRequest.kimlik_number,
        ),

        age:
          insuranceRequest.calculated_age ?? "",

        duration:
          `${insuranceRequest.insurance_duration_years} an${
            insuranceRequest.insurance_duration_years === 2
              ? "s"
              : ""
          }`,

        price: Number(
          insuranceRequest.calculated_price ?? 0,
        ),

        status:
          statusLabels[insuranceRequest.status] ??
          insuranceRequest.status,

        insuranceStartDate:
          insuranceRequest.insurance_start_date ?? "",

        createdAt: formatDate(
          insuranceRequest.created_at,
        ),
      });
    }

    /*
     * Style Excel.
     */
    const headerRow = worksheet.getRow(1);

    headerRow.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF2F2963",
      },
    };

    headerRow.alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    headerRow.height = 24;

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    /*
     * 16 colonnes : A → P.
     */
    worksheet.autoFilter = {
      from: "A1",
      to: "P1",
    };

    worksheet.getColumn("price").numFmt =
      '#,##0.00 "TL"';

    worksheet.eachRow((row, rowNumber) => {
      row.alignment = {
        vertical: "middle",
      };

      if (rowNumber > 1) {
        row.height = 20;
      }
    });

    /*
     * Génération du fichier.
     */
    const excelBuffer =
      await workbook.xlsx.writeBuffer();

    const fileBytes =
      new Uint8Array(excelBuffer);

    const today =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

    const fileName =
      `IF-Sigorta-Dossiers-${today}.xlsx`;

    return new Response(fileBytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="${fileName}"`,

        "Cache-Control":
          "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Erreur export Excel des dossiers :",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      },
      {
        status: 500,
      },
    );
  }
}