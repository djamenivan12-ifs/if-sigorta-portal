"use client";

import {
  useState,
  useRef,
  useEffect,
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

export default function PartnerRequestForm({initialDraft,initialVersion,initialSubmissionId}:{initialDraft:Partial<PartnerRequestFormData>|null;initialVersion:number;initialSubmissionId:string}) {
  const [submissionId]=useState(initialSubmissionId);
  const draftVersion=useRef(initialVersion);
  const saveQueue=useRef(Promise.resolve());
  const warned=useRef(false);
  const completed=useRef(false);
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
      {...initialPartnerRequestData,...initialDraft,passportFile:null,kimlikFrontFile:null,kimlikBackFile:null},
    );

  useEffect(()=>{
    const timer=setTimeout(()=>{
      if(completed.current)return;
      const payload=JSON.parse(JSON.stringify({...data,submissionId},(_key,value)=>typeof File!=="undefined"&&value instanceof File?undefined:value));
      saveQueue.current=saveQueue.current.then(async()=>{
        if(completed.current)return;
        const response=await fetch("/api/partner/draft",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:draftVersion.current,payload})});
        const result=await response.json();if(!response.ok||!result.success)throw Error(result.error||"Brouillon non enregistré.");draftVersion.current=result.version;
      }).catch(()=>{if(!warned.current&&!completed.current){warned.current=true;window.alert("Le brouillon n’a pas pu être enregistré. Gardez cette fenêtre ouverte ; vérifiez votre session ou les autres fenêtres avant de continuer.");}});
    },700);
    return ()=>clearTimeout(timer);
  },[data,submissionId]);
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
    completed.current=true;
    router.push(
      `/partenaire/dossiers/${encodeURIComponent(
        requestId,
      )}`,
    );

    router.refresh();
  }

  return (
    <div className="min-w-0">
      <div className="mb-5 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:mb-6 sm:px-5">
        <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black text-[#102B20]">
              Nouvelle demande
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Étape {step} sur 4
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-[#EEF6EC] px-3 py-1.5 text-xs font-black text-[#0B5D3B]">
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

      <div className="min-w-0 rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-7 lg:p-9">
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
            submissionId={submissionId}
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
