import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { createServiceClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RequestRow = {
  id: string;
  status: string;
  insurance_duration_years: number;
  calculated_price:
    | number
    | string
    | null;
  created_at: string;
};

type PaymentRow = {
  expected_amount:
    | number
    | string
    | null;

  verified_at:
    | string
    | null;

  status: string;
};

/*
 * Les polices standard de pdf-lib
 * utilisent WinAnsi.
 *
 * Certains caractères Unicode générés
 * automatiquement par Intl en français
 * doivent être remplacés.
 */
function pdfSafeText(
  value: string,
): string {
  return value
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2026/g, "...");
}

/*
 * Détermine le premier instant
 * du mois et celui du mois suivant
 * en heure de Turquie.
 */
function getMonthRange(
  year: number,
  month: number,
) {
  const monthString =
    String(month).padStart(
      2,
      "0",
    );

  const nextMonth =
    month === 12
      ? 1
      : month + 1;

  const nextYear =
    month === 12
      ? year + 1
      : year;

  const nextMonthString =
    String(
      nextMonth,
    ).padStart(
      2,
      "0",
    );

  const start =
    new Date(
      `${year}-${monthString}-01T00:00:00+03:00`,
    );

  const end =
    new Date(
      `${nextYear}-${nextMonthString}-01T00:00:00+03:00`,
    );

  return {
    start,
    end,
  };
}

function formatCurrency(
  value: number,
) {
  return pdfSafeText(
    `${value.toLocaleString(
      "fr-FR",
      {
        maximumFractionDigits: 2,
      },
    )} TL`,
  );
}

function formatNumber(
  value: number,
) {
  return pdfSafeText(
    value.toLocaleString(
      "fr-FR",
    ),
  );
}

export async function GET(
  request: Request,
) {
  try {
    /*
     * Vérification de la session.
     */
    const sessionClient =
      await createServerSupabaseClient();

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await sessionClient.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return Response.json(
        {
          error:
            "Vous devez être connecté.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Autorisations.
     */
    const role =
      user.app_metadata?.role;

    if (
      role !== "agent" &&
      role !== "admin"
    ) {
      return Response.json(
        {
          error:
            "Vous n’avez pas l’autorisation de générer ce rapport.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Lecture des paramètres.
     */
    const url =
      new URL(
        request.url,
      );

    const now =
      new Date();

    const year =
      Number(
        url.searchParams.get(
          "year",
        ) ??
          now.getFullYear(),
      );

    const month =
      Number(
        url.searchParams.get(
          "month",
        ) ??
          now.getMonth() +
            1,
      );

    /*
     * Validation.
     */
    if (
      !Number.isInteger(
        year,
      ) ||
      year < 2020 ||
      year > 2100 ||
      !Number.isInteger(
        month,
      ) ||
      month < 1 ||
      month > 12
    ) {
      return Response.json(
        {
          error:
            "La période demandée est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    const {
      start,
      end,
    } =
      getMonthRange(
        year,
        month,
      );

    const serviceClient =
      createServiceClient();

    /*
     * Chargement parallèle.
     */
    const [
      requestsResult,
      paymentsResult,
    ] =
      await Promise.all([
        serviceClient
          .from(
            "insurance_requests",
          )
          .select(
            `
              id,
              status,
              insurance_duration_years,
              calculated_price,
              created_at
            `,
          )
          .gte(
            "created_at",
            start.toISOString(),
          )
          .lt(
            "created_at",
            end.toISOString(),
          ),

        serviceClient
          .from(
            "payments",
          )
          .select(
            `
              expected_amount,
              verified_at,
              status
            `,
          )
          .gte(
            "verified_at",
            start.toISOString(),
          )
          .lt(
            "verified_at",
            end.toISOString(),
          ),
      ]);

    if (
      requestsResult.error
    ) {
      throw new Error(
        requestsResult.error.message,
      );
    }

    if (
      paymentsResult.error
    ) {
      throw new Error(
        paymentsResult.error.message,
      );
    }

    const requests =
      (requestsResult.data ??
        []) as RequestRow[];

    const payments =
      (paymentsResult.data ??
        []) as PaymentRow[];

    /*
     * Statistiques dossiers.
     */
    const totalRequests =
      requests.length;

    const oneYearRequests =
      requests.filter(
        (
          item,
        ) =>
          item.insurance_duration_years ===
          1,
      ).length;

    const twoYearRequests =
      requests.filter(
        (
          item,
        ) =>
          item.insurance_duration_years ===
          2,
      ).length;

    const availablePolicies =
      requests.filter(
        (
          item,
        ) =>
          item.status ===
          "policy_available",
      ).length;

    const rejectedRequests =
      requests.filter(
        (
          item,
        ) =>
          item.status ===
          "payment_rejected",
      ).length;

    const cancelledRequests =
      requests.filter(
        (
          item,
        ) =>
          item.status ===
          "cancelled",
      ).length;

    /*
     * Paiements.
     */
    const confirmedPayments =
      payments.filter(
        (
          item,
        ) =>
          item.status ===
          "confirmed",
      );

    const confirmedPaymentsCount =
      confirmedPayments.length;

    const revenue =
      confirmedPayments.reduce(
        (
          total,
          payment,
        ) =>
          total +
          Number(
            payment.expected_amount ??
              0,
          ),
        0,
      );

    /*
     * Création du document.
     */
    const pdf =
      await PDFDocument.create();

    const reportIdentifier =
      `${year}-${String(
        month,
      ).padStart(
        2,
        "0",
      )}`;

    pdf.setTitle(
      `IF Sigorta - Rapport ${reportIdentifier}`,
    );

    pdf.setAuthor(
      "IF Sigorta",
    );

    pdf.setCreator(
      "IF Sigorta Portal",
    );

    pdf.setProducer(
      "IF Sigorta Portal",
    );

    pdf.setCreationDate(
      new Date(),
    );

    /*
     * Polices intégrées.
     */
    const regularFont =
      await pdf.embedFont(
        StandardFonts.Helvetica,
      );

    const boldFont =
      await pdf.embedFont(
        StandardFonts.HelveticaBold,
      );

    /*
     * Page A4.
     */
    const page =
      pdf.addPage([
        595.28,
        841.89,
      ]);

    const {
      width,
      height,
    } =
      page.getSize();

    /*
     * En-tête.
     */
    page.drawRectangle({
      x: 0,
      y:
        height - 120,
      width,
      height:
        120,
      color:
        rgb(
          0.184,
          0.161,
          0.388,
        ),
    });

    page.drawText(
      "IF Sigorta",
      {
        x: 45,
        y:
          height - 60,
        size:
          24,
        font:
          boldFont,
        color:
          rgb(
            1,
            1,
            1,
          ),
      },
    );

    page.drawText(
      "Rapport mensuel",
      {
        x: 45,
        y:
          height - 90,
        size:
          14,
        font:
          regularFont,
        color:
          rgb(
            0.9,
            0.9,
            0.95,
          ),
      },
    );

    /*
     * Libellé du mois.
     */
    const monthLabel =
      pdfSafeText(
        new Intl.DateTimeFormat(
          "fr-FR",
          {
            month:
              "long",
            year:
              "numeric",
            timeZone:
              "Europe/Istanbul",
          },
        ).format(
          start,
        ),
      );

    page.drawText(
      monthLabel,
      {
        x: 390,
        y:
          height - 70,
        size:
          14,
        font:
          boldFont,
        color:
          rgb(
            1,
            1,
            1,
          ),
      },
    );

    /*
     * Carte statistique.
     */
    function drawStatCard({
      x,
      y,
      label,
      value,
    }: {
      x: number;
      y: number;
      label: string;
      value: string;
    }) {
      page.drawRectangle({
        x,
        y,
        width:
          235,
        height:
          78,
        borderWidth:
          1,
        borderColor:
          rgb(
            0.86,
            0.87,
            0.9,
          ),
        color:
          rgb(
            0.98,
            0.98,
            0.99,
          ),
      });

      page.drawText(
        pdfSafeText(
          label,
        ),
        {
          x:
            x + 16,
          y:
            y + 50,
          size:
            10,
          font:
            regularFont,
          color:
            rgb(
              0.38,
              0.4,
              0.45,
            ),
        },
      );

      page.drawText(
        pdfSafeText(
          value,
        ),
        {
          x:
            x + 16,
          y:
            y + 20,
          size:
            19,
          font:
            boldFont,
          color:
            rgb(
              0.12,
              0.13,
              0.16,
            ),
        },
      );
    }

    /*
     * Cartes principales.
     */
    drawStatCard({
      x: 45,
      y: 605,
      label:
        "Dossiers créés",
      value:
        formatNumber(
          totalRequests,
        ),
    });

    drawStatCard({
      x: 315,
      y: 605,
      label:
        "Chiffre d'affaires",
      value:
        formatCurrency(
          revenue,
        ),
    });

    drawStatCard({
      x: 45,
      y: 505,
      label:
        "Paiements validés",
      value:
        formatNumber(
          confirmedPaymentsCount,
        ),
    });

    drawStatCard({
      x: 315,
      y: 505,
      label:
        "Assurances disponibles",
      value:
        formatNumber(
          availablePolicies,
        ),
    });

    /*
     * Répartition.
     */
    page.drawText(
      "Répartition des dossiers",
      {
        x: 45,
        y: 455,
        size:
          15,
        font:
          boldFont,
        color:
          rgb(
            0.12,
            0.13,
            0.16,
          ),
      },
    );

    const reportRows = [
      {
        label:
          "Assurances 1 an",
        value:
          oneYearRequests,
      },

      {
        label:
          "Assurances 2 ans",
        value:
          twoYearRequests,
      },

      {
        label:
          "Paiements refusés",
        value:
          rejectedRequests,
      },

      {
        label:
          "Dossiers annulés",
        value:
          cancelledRequests,
      },
    ];

    let rowY =
      420;

    for (
      const reportRow of
      reportRows
    ) {
      page.drawRectangle({
        x: 45,
        y:
          rowY - 8,
        width:
          505,
        height:
          36,
        color:
          rgb(
            0.97,
            0.97,
            0.98,
          ),
      });

      page.drawText(
        pdfSafeText(
          reportRow.label,
        ),
        {
          x: 60,
          y:
            rowY + 4,
          size:
            11,
          font:
            regularFont,
          color:
            rgb(
              0.25,
              0.27,
              0.31,
            ),
        },
      );

      page.drawText(
        formatNumber(
          reportRow.value,
        ),
        {
          x: 500,
          y:
            rowY + 4,
          size:
            11,
          font:
            boldFont,
          color:
            rgb(
              0.12,
              0.13,
              0.16,
            ),
        },
      );

      rowY -=
        50;
    }

    /*
     * Résumé.
     */
    page.drawText(
      "Résumé",
      {
        x: 45,
        y: 205,
        size:
          15,
        font:
          boldFont,
        color:
          rgb(
            0.12,
            0.13,
            0.16,
          ),
      },
    );

    const summaryText =
      pdfSafeText(
        `Sur ${formatNumber(
          totalRequests,
        )} dossier${
          totalRequests ===
          1
            ? ""
            : "s"
        } créé${
          totalRequests ===
          1
            ? ""
            : "s"
        } pendant cette période, ${formatNumber(
          availablePolicies,
        )} assurance${
          availablePolicies ===
          1
            ? ""
            : "s"
        } ${
          availablePolicies ===
          1
            ? "est disponible"
            : "sont disponibles"
        }.`,
      );

    page.drawText(
      summaryText,
      {
        x: 45,
        y: 175,
        size:
          10,
        font:
          regularFont,
        color:
          rgb(
            0.35,
            0.37,
            0.42,
          ),
        maxWidth:
          500,
        lineHeight:
          15,
      },
    );

    /*
     * Pied de page.
     */
    page.drawLine({
      start: {
        x: 45,
        y: 90,
      },
      end: {
        x: 550,
        y: 90,
      },
      thickness:
        1,
      color:
        rgb(
          0.85,
          0.85,
          0.88,
        ),
    });

    page.drawText(
      "Rapport généré automatiquement par le portail IF Sigorta.",
      {
        x: 45,
        y: 65,
        size:
          9,
        font:
          regularFont,
        color:
          rgb(
            0.45,
            0.47,
            0.52,
          ),
      },
    );

    /*
     * Date de génération.
     */
    const generatedAt =
      pdfSafeText(
        new Intl.DateTimeFormat(
          "fr-FR",
          {
            dateStyle:
              "medium",
            timeStyle:
              "short",
            timeZone:
              "Europe/Istanbul",
          },
        ).format(
          new Date(),
        ),
      );

    page.drawText(
      pdfSafeText(
        `Généré le ${generatedAt}`,
      ),
      {
        x: 45,
        y: 48,
        size:
          9,
        font:
          regularFont,
        color:
          rgb(
            0.45,
            0.47,
            0.52,
          ),
      },
    );

    /*
     * Génération du PDF.
     */
    const pdfBytes =
      await pdf.save();

    /*
     * Conversion explicite en ArrayBuffer.
     *
     * Cela évite l'erreur TypeScript :
     * Uint8Array<ArrayBufferLike>
     * not assignable to BodyInit.
     */
    const pdfArrayBuffer =
      new ArrayBuffer(
        pdfBytes.byteLength,
      );

    const pdfArrayView =
      new Uint8Array(
        pdfArrayBuffer,
      );

    pdfArrayView.set(
      pdfBytes,
    );

    const fileName =
      `IF-Sigorta-Rapport-${reportIdentifier}.pdf`;

    return new Response(
      pdfArrayBuffer,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Content-Length":
            pdfBytes.byteLength.toString(),

          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Erreur de génération du rapport PDF :",
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