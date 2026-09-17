import {requirePartner} from "@/lib/auth/requirePartner";
import {createServiceClient} from "@/lib/supabase/service";
import PartnerRequestForm from "./PartnerRequestForm";

export default async function NewPartnerRequestPage() {
 const {partner}=await requirePartner();const {data,error}=await createServiceClient().from("partner_request_drafts").select("payload,version,expires_at").eq("partner_id",partner.id).maybeSingle();
 if(error)throw Error("Le brouillon est temporairement indisponible. Vérifiez la mise à jour de la base.");
 const current=data&&new Date(data.expires_at)>new Date()?data:null;
 const initialSubmissionId=current?.payload?.submissionId||crypto.randomUUID();
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1100px] overflow-x-hidden px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mb-6 sm:mb-7">
        <h1 className="text-2xl font-black tracking-tight text-[#102B20] sm:text-3xl">
          Nouvelle demande
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Créez une assurance pour l’un de vos clients.
        </p>
      </div>

      <PartnerRequestForm initialDraft={current?.payload??null} initialVersion={Number(data?.version??0)} initialSubmissionId={initialSubmissionId}/>
    </div>
  );
}
