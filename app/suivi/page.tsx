import SuiviClient from "./SuiviClient";

type SuiviPageProps = {
  searchParams: Promise<{
    code?: string | string[];
    country?: string | string[];
    phone?: string | string[];
  }>;
};

export default async function SuiviPage({
  searchParams,
}: SuiviPageProps) {
  const params = await searchParams;

  const rawCode = Array.isArray(params.code)
    ? params.code[0]
    : params.code;

  const rawCountry = Array.isArray(params.country)
    ? params.country[0]
    : params.country;

  const rawPhone = Array.isArray(params.phone)
    ? params.phone[0]
    : params.phone;

  const initialCode =
    rawCode?.trim().toUpperCase() ?? "";

  const initialCountry =
    rawCountry?.trim() || "+90";

  const initialPhone =
    rawPhone?.replace(/\D/g, "") ?? "";

  return (
    <SuiviClient
      initialCode={initialCode}
      initialCountry={initialCountry}
      initialPhone={initialPhone}
    />
  );
}