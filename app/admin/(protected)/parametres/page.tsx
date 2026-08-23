import Link from "next/link";

import BankSettingsForm from "./BankSettingsForm";
import ContactSettingsForm from "./ContactSettingsForm";
import PriceSettingsForm from "./PriceSettingsForm";

import { requireRole } from "@/lib/auth/requireRole";
import { createServiceClient } from "@/lib/supabase/service";

type PriceRangeRow = {
  id: number;
  minimum_age: number;
  maximum_age: number;
  one_year_price:
    | number
    | string;
  two_year_price:
    | number
    | string;
  is_active: boolean;
};

type BankSettingRow = {
  beneficiary: string;
  bank_name: string;
  iban: string;
};

type ContactSettingRow = {
  whatsapp_country_code: string;
  whatsapp_number: string;
};

export default async function SettingsPage() {
  await requireRole([
    "admin",
  ]);

  const serviceClient =
    createServiceClient();

  /*
   * ============================
   * TARIFS
   * ============================
   */

  const {
    data: priceRangesData,
    error: priceRangesError,
  } =
    await serviceClient
      .from(
        "insurance_price_ranges",
      )
      .select(
        `
          id,
          minimum_age,
          maximum_age,
          one_year_price,
          two_year_price,
          is_active
        `,
      )
      .order(
        "minimum_age",
        {
          ascending:
            true,
        },
      );

  if (
    priceRangesError
  ) {
    throw new Error(
      priceRangesError.message,
    );
  }

  const ranges =
    (
      priceRangesData ??
      []
    ).map(
      (
        row,
      ) => {
        const item =
          row as PriceRangeRow;

        return {
          id:
            item.id,

          minimumAge:
            item.minimum_age,

          maximumAge:
            item.maximum_age,

          oneYearPrice:
            Number(
              item.one_year_price,
            ),

          twoYearPrice:
            Number(
              item.two_year_price,
            ),

          isActive:
            item.is_active,
        };
      },
    );

  /*
   * ============================
   * COORDONNÉES BANCAIRES
   * ============================
   */

  const {
    data: bankSettingData,
    error: bankSettingError,
  } =
    await serviceClient
      .from(
        "bank_settings",
      )
      .select(
        `
          beneficiary,
          bank_name,
          iban
        `,
      )
      .eq(
        "is_active",
        true,
      )
      .order(
        "id",
        {
          ascending:
            true,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    bankSettingError
  ) {
    throw new Error(
      bankSettingError.message,
    );
  }

  const bankSetting =
    bankSettingData as
      | BankSettingRow
      | null;

  /*
   * ============================
   * WHATSAPP IF SIGORTA
   * ============================
   */

  const {
    data: contactSettingData,
    error: contactSettingError,
  } =
    await serviceClient
      .from(
        "contact_settings",
      )
      .select(
        `
          whatsapp_country_code,
          whatsapp_number
        `,
      )
      .eq(
        "is_active",
        true,
      )
      .order(
        "id",
        {
          ascending:
            true,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    contactSettingError
  ) {
    throw new Error(
      contactSettingError.message,
    );
  }

  const contactSetting =
    contactSettingData as
      | ContactSettingRow
      | null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        {/* HEADER */}

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
                Administration
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Paramètres
              </h1>

              <p className="mt-2 max-w-3xl text-slate-600">
                Gérez les tarifs, les coordonnées bancaires, le numéro WhatsApp et les réglages généraux du portail IF Sigorta.
              </p>
            </div>

            <Link
              href="/admin/tableau-de-bord"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        {/* TARIFS */}

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
              Tarification
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Tarifs d’assurance
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Modifiez les tarifs selon l’âge du client et la durée de l’assurance.
            </p>
          </div>

          <PriceSettingsForm
            initialRanges={
              ranges
            }
          />
        </section>

        {/* COORDONNÉES BANCAIRES */}

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
              Paiement
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Coordonnées bancaires
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Ces informations sont utilisées pour les virements bancaires effectués par les clients.
            </p>
          </div>

          <BankSettingsForm
            initialBeneficiary={
              bankSetting?.beneficiary ??
              ""
            }
            initialBankName={
              bankSetting?.bank_name ??
              ""
            }
            initialIban={
              bankSetting?.iban ??
              ""
            }
          />
        </section>

        {/* WHATSAPP */}

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2F2963]">
              Contact
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              WhatsApp IF Sigorta
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Numéro public utilisé par les clients pour contacter directement IF Sigorta.
            </p>
          </div>

          <ContactSettingsForm
            initialCountryCode={
              contactSetting?.whatsapp_country_code ??
              "+90"
            }
            initialWhatsappNumber={
              contactSetting?.whatsapp_number ??
              ""
            }
          />
        </section>
      </div>
    </main>
  );
}