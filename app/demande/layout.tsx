import { ReactNode } from "react";

import {
  InsuranceRequestProvider,
} from "@/context/InsuranceRequestContext";

type DemandeLayoutProps = {
  children: ReactNode;
};

export default function DemandeLayout({
  children,
}: DemandeLayoutProps) {
  return (
    <InsuranceRequestProvider>
      {children}
    </InsuranceRequestProvider>
  );
}