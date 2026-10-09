import Image from "next/image";

type BrandLogoProps = {
  tone?: "dark" | "light";
};

/** The same horizontal wordmark and intrinsic ratio on every application page. */
export default function BrandLogo({ tone = "dark" }: BrandLogoProps) {
  return (
    <Image
      src="/brand/if-sigorta-wordmark.png"
      alt="IF Sigorta"
      width={1413}
      height={285}
      sizes="(max-width: 359px) 136px, (max-width: 639px) 160px, 208px"
      className={`h-auto w-[136px] max-w-full min-[360px]:w-[160px] sm:w-[208px] ${tone === "light" ? "brightness-0 invert" : ""}`}
    />
  );
}
