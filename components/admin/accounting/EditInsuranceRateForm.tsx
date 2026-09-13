import Link from "next/link";
export default function Legacy({
  rate,
}: {
  rate: {
    id: string;
    minAge: number;
    maxAge: number;
    durationYears: number;
    realCost: number;
    effectiveFrom: string;
    isActive: boolean;
  };
}) {
  return (
    <Link href={"/admin/comptabilite?tab=rates&edit=" + rate.id}>
      Modifier dans la rubrique comptabilité →
    </Link>
  );
}
