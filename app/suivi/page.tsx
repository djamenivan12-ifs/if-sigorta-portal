import SuiviClient from "./SuiviClient";

type SuiviPageProps = {
  searchParams: Promise<{
    code?: string | string[];
    country?: string | string[];
    phone?: string | string[];
  }>;
};

function getValue(
  value: string | string[] | undefined,
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function SuiviPage({
  searchParams,
}: SuiviPageProps) {
  const params =
    await searchParams;

  const initialCode =
    getValue(params.code)
      .trim()
      .toUpperCase();

  const initialCountry =
    getValue(params.country)
      .trim() || "+90";

  const initialPhone =
    getValue(params.phone)
      .replace(/\D/g, "");

  return (
    <SuiviClient
      initialCode={initialCode}
      initialCountry={initialCountry}
      initialPhone={initialPhone}
    />
  );
}
