import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";

type LogoProps = { href?: string; label?: string };

export default function Logo({
  href = "/admin/dashboard",
  label = "IF Sigorta - Tableau de bord",
}: LogoProps) {
  return (
    <Link href={href} className="flex min-w-0 items-center py-4" aria-label={label}>
      <BrandLogo />
    </Link>
  );
}
