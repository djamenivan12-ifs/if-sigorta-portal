import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link
      href="/admin/tableau-de-bord"
      className="group flex items-center"
      aria-label="IF Sigorta - Tableau de bord"
    >
      <div className="relative h-[82px] w-[220px]">
        <Image
          src="/if-sigorta-logo-light.png"
          alt="IF Sigorta"
          fill
          priority
          sizes="220px"
          className="object-contain object-left transition duration-200 group-hover:scale-[1.02]"
        />
      </div>
    </Link>
  );
}