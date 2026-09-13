import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./PageFrame.module.css";
export default function PageFrame({
  children,
  section,
  href,
  detail = false,
  sections = [],
}: {
  children: ReactNode;
  section: string;
  href: string;
  detail?: boolean;
  sections?: { id: string; label: string }[];
}) {
  return (
    <section className={styles.page} aria-label={section}>
      <nav aria-label="Fil d’Ariane" className={styles.breadcrumb}>
        <Link href="/admin/dashboard">Tableau de bord</Link>
        <span aria-hidden="true">/</span>
        {detail ? (
          <>
            <Link href={href}>{section}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Fiche</span>
          </>
        ) : (
          <span aria-current="page">{section}</span>
        )}
      </nav>
      {sections.length > 1 && (
        <nav aria-label="Sections de la page" className={styles.sections}>
          {sections.map((item) => (
            <a key={item.id} href={"#" + item.id}>
              {item.label}
            </a>
          ))}
        </nav>
      )}
      {children}
    </section>
  );
}
