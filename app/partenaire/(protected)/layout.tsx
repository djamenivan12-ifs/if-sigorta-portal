import type {
  ReactNode,
} from "react";

import PartnerShell from "@/components/partner/layout/PartnerShell";

import {
  requirePartner,
} from "@/lib/auth/requirePartner";

type ProtectedPartnerLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedPartnerLayout({
  children,
}: ProtectedPartnerLayoutProps) {
  const {
    partner,
  } = await requirePartner();

  return (
    <PartnerShell
      companyName={
        partner.companyName
      }
      managerName={
        partner.managerName
      }
      partnerCode={
        partner.code
      }
    >
      {children}
    </PartnerShell>
  );
}