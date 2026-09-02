"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import PartnerClientStep from "./PartnerClientStep";
import PartnerDocumentsStep from "./PartnerDocumentsStep";
import PartnerInsuranceStep from "./PartnerInsuranceStep";
import PartnerReviewStep from "./PartnerReviewStep";

import {
  initialPartnerRequestData,
} from "./partnerRequestDefaults";

import type {
  PartnerRequestFormData,
} from "./partnerRequestTypes";

type Step = 1 | 2 | 3 | 4;

export default function PartnerRequestForm() {
  const router =
    useRouter();

  const [
    step,
    setStep,
  ] =
    useState<Step>(1);

  const [
    data,
    setData,
  ] =
    useState<PartnerRequestFormData>(
      initialPartnerRequestData,
    );

  const progress =
    `${(step / 4) * 100}%`;

  function goToStep(
    nextStep: Step,
  ) {
    setStep(nextStep);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleCreated({
    requestId,
  }: {
    requestId: string;
    requestCode: string;
  }) {
    router.push(
      `/partenaire/dossiers/${encodeURIComponent(
        requestId,
      )}`,
    );

    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#102B20]">
              Nouvelle demande
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Étape {step} sur 4
            </p>
          </div>

          <span className="rounded-full bg-[#EEF6EC] px-3 py-1.5 text-xs font-black text-[#0B5D3B]">
            {Math.round(
              (step / 4) * 100,
            )}
            %
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#B8E83D] transition-all duration-300"
            style={{
              width: progress,
            }}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7 lg:p-9">
        {step === 1 && (
          <PartnerClientStep
            data={data}
            onChange={
              setData
            }
            onNext={() =>
              goToStep(2)
            }
          />
        )}

        {step === 2 && (
          <PartnerInsuranceStep
            data={data}
            onChange={
              setData
            }
            onPrevious={() =>
              goToStep(1)
            }
            onNext={() =>
              goToStep(3)
            }
          />
        )}

        {step === 3 && (
          <PartnerDocumentsStep
            data={data}
            onChange={
              setData
            }
            onPrevious={() =>
              goToStep(2)
            }
            onNext={() =>
              goToStep(4)
            }
          />
        )}

        {step === 4 && (
          <PartnerReviewStep
            data={data}
            onPrevious={() =>
              goToStep(3)
            }
            onCreated={
              handleCreated
            }
          />
        )}
      </div>
    </div>
  );
}