import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link
      href="/admin/tableau-de-bord"
      className="group flex items-center gap-3"
    >
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md">
        <Image
          src="/if-sigorta-logo.png"
          alt="IF Sigorta"
          width={42}
          height={42}
          priority
          className="object-contain"
        />
      </div>

      <div className="min-w-0">
        <h1 className="text-base font-bold tracking-tight text-[#2F2963]">
          IF Sigorta
        </h1>

        <p className="text-xs text-slate-500">
          Insurance Portal
        </p>
      </div>
    </Link>
  );
}