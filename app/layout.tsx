import DocumentLanguage from "@/components/DocumentLanguage";
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "IF Sigorta",
  description: "Demandez votre assurance en Turquie et suivez votre dossier avec IF Sigorta.",
  icons: {
    icon: "/icon.png?v=2",
    apple: "/apple-icon.png?v=2",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><DocumentLanguage />{children}</body>
    </html>
  );
}
