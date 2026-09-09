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
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#F6F8F5] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
        {/* HEADER */}

        <header className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 lg:p-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
                Administration
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#102B20] sm:mt-3 sm:text-3xl lg:text-4xl">
                Paramètres
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:mt-3 sm:text-sm sm:leading-7 lg:text-base">
                Gérez les tarifs, les coordonnées bancaires,
                le numéro WhatsApp et les réglages généraux
                du portail IF Sigorta.
              </p>
            </div>

            <Link
              href="/admin/dashboard"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-11 sm:w-auto sm:px-5 sm:text-sm"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        {/* TARIFS */}

        <section className="mt-6 min-w-0 sm:mt-8">
          <div className="mb-4 min-w-0 sm:mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
              Tarification
            </p>

            <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
              Tarifs d’assurance
            </h2>

            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:text-sm">
              Modifiez les tarifs selon l’âge du client et
              la durée de l’assurance.
            </p>
          </div>

          <div className="min-w-0">
            <PriceSettingsForm
              initialRanges={
                ranges
              }
            />
          </div>
        </section>

        {/* COORDONNÉES BANCAIRES */}

        <section className="mt-8 min-w-0 sm:mt-10 lg:mt-12">
          <div className="mb-4 min-w-0 sm:mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
              Paiement
            </p>

            <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
              Coordonnées bancaires
            </h2>

            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:text-sm">
              Ces informations sont utilisées pour les
              virements bancaires effectués par les clients.
            </p>
          </div>

          <div className="min-w-0">
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
          </div>
        </section>

        {/* WHATSAPP */}

        <section className="mt-8 min-w-0 sm:mt-10 lg:mt-12">
          <div className="mb-4 min-w-0 sm:mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0B5D3B] sm:text-xs sm:tracking-[0.16em]">
              Contact
            </p>

            <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#102B20] sm:text-xl">
              WhatsApp IF Sigorta
            </h2>

            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 sm:text-sm">
              Numéro public utilisé par les clients pour
              contacter directement IF Sigorta.
            </p>
          </div>

          <div className="min-w-0">
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
          </div>
        </section>
      </div>
    </main>
  );
}
