import Link from "next/link";
export default function Legacy({
  company,
}: {
  company: { id: string; name: string; isActive: boolean };
}) {
  return <Link href={"/admin/comptabilite/assureurs/" + company.id}>Gérer cet assureur →</Link>;
}
