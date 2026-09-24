"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { accounting, money, cents, dateLabel, day, csv, type AccountingData, type Filters } from "@/lib/accounting/model";
const field = "w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const methods: Record<string,string> = {bank_transfer:"Virement bancaire",cash:"Espèces",card:"Carte bancaire",other:"Autre"};
export default function Refunds({data,filter,requestId=""}:{data:AccountingData;filter:Filters;requestId?:string}) {
 const router=useRouter();
 const report=accounting(data,filter);
 const [search,setSearch]=useState("");
 const [paymentId,setPaymentId]=useState("");
 const [operationId,setOperationId]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [voidId,setVoidId]=useState("");
 const [voidReason,setVoidReason]=useState("");
 const ready=!data.missingTables?.includes("client_refunds");
 const selected=report.refundBalances.find(b=>b.payment.id===paymentId);
 const balances=report.refundBalances.filter(b=>(!requestId||b.payment.request_id===requestId)&&(!search||b.request?.request_code.toLowerCase().includes(search.toLowerCase())));
 const history=(data.refunds??[]).filter(r=> (!filter.company||data.requests.some(d=>d.id===r.request_id&&d.insurance_company_id===filter.company)) && (!filter.from||r.refund_date>=filter.from) && (!filter.to||r.refund_date<=filter.to) && (!requestId||r.request_id===requestId));
 const due=balances.filter(b=>b.request?.status==="cancelled").reduce((s,b)=>s+(b.remaining??0),0);
 function open(id:string){setPaymentId(id);setOperationId(crypto.randomUUID());setNotice("");}
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault(); if(busy)return;
  const body=new FormData(event.currentTarget);body.set("paymentId",paymentId);body.set("operationId",operationId);
  setBusy(true);setNotice("");
  try{const response=await fetch("/api/admin/accounting/refunds",{method:"POST",body});const result=await response.json();if(!response.ok||!result.success)throw Error(result.error||"Enregistrement impossible.");setPaymentId("");setNotice("Remboursement enregistré. Les chiffres sont actualisés.");router.refresh();}
  catch(e){setNotice(e instanceof Error?e.message:"Connexion interrompue. Actualisez avant de réessayer.");}
  finally{setBusy(false);}
 }
 async function voidEntry(event:React.FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);
  try{const response=await fetch("/api/admin/accounting/refunds",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:voidId,reason:voidReason})});const result=await response.json();if(!response.ok||!result.success)throw Error(result.error||"Correction impossible.");setVoidId("");setVoidReason("");setNotice("Saisie annulée et conservée dans l’historique.");router.refresh();}
  catch(e){setNotice(e instanceof Error?e.message:"Erreur de connexion.");}finally{setBusy(false);}
 }
 function exportRows(){const content=csv([["Dossier","Date","Montant TRY","Moyen","Référence","Motif","Statut","Annulé le","Motif de correction"],...history.map(r=>[data.requests.find(d=>d.id===r.request_id)?.request_code??r.request_id,r.refund_date,r.amount,methods[r.payment_method],r.reference,r.reason,r.voided_at?"Saisie annulée":"Enregistré",r.voided_at??"",r.void_reason??""])]);const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="remboursements.csv";a.click();URL.revokeObjectURL(url);}
 return <section className="space-y-5" aria-label="Gestion des remboursements">
  <div className="rounded-xl border border-slate-200 bg-white p-5">
   <h2 className="text-xl font-bold text-slate-950">Remboursements clients</h2>
   <p className="mt-2 text-sm text-slate-600">Enregistrez un remboursement déjà effectué. Aucun virement n’est déclenché par cette page. Les avances aux assureurs restent indépendantes.</p>
   {!ready&&<p role="alert" className="mt-3 text-amber-800">La mise à jour de la base est requise avant tout enregistrement.</p>}
   <div className="mt-5 grid gap-3 sm:grid-cols-3">
    {[['Remboursé sur la période',money(report.refunded)],['Encaissements nets sur la période',money(report.netCollected)],['Reste à rembourser · dossiers annulés',ready?money(due):"À compléter"]].map(([label,value])=><div key={label} className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">{label}</div><strong className="mt-2 block text-xl text-emerald-950">{value}</strong></div>)}
   </div>
  </div>
  {notice&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">{notice}</p>}
  {selected&&<form onSubmit={submit} className="rounded-xl border border-emerald-200 bg-white p-5">
   <h3 className="font-bold">Enregistrer un remboursement · {selected.request?.request_code}</h3>
   <p className="mt-1 text-sm text-slate-600">Montant encore remboursable : <strong>{money(selected.remaining)}</strong></p>
   <fieldset disabled={busy} className="mt-4 grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-medium">Montant (TL)<input className={field} name="amount" type="number" min="0.01" max={(selected.remaining??0)/100} step="0.01" required /></label>
    <label className="text-sm font-medium">Date du remboursement<input className={field} name="date" type="date" defaultValue={day(data.loadedAt)} min={day(selected.payment.verified_at)} max={day(data.loadedAt)} required /></label>
    <label className="text-sm font-medium">Moyen<select name="method" className={field}>{Object.entries(methods).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label className="text-sm font-medium">Référence du virement ou du reçu<input name="reference" className={field} maxLength={200} required /></label>
    <label className="text-sm font-medium sm:col-span-2">Motif<textarea name="reason" className={field} maxLength={1000} required placeholder="Ex. annulation de la demande" /></label>
    <label className="text-sm font-medium sm:col-span-2">Justificatif facultatif · PDF, JPEG ou PNG · 4 Mo maximum<input name="proof" type="file" accept="application/pdf,image/jpeg,image/png" className={field}/></label>
    <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" required className="mt-1"/>Je confirme avoir déjà reversé ce montant au client ou au partenaire concerné.</label>
    <div className="flex flex-wrap gap-3 sm:col-span-2"><button type="submit" className="rounded-lg bg-emerald-900 px-4 py-3 font-semibold text-white">{busy?"Enregistrement…":"Confirmer le remboursement"}</button><button type="button" onClick={()=>setPaymentId("")} className="rounded-lg border px-4 py-3">Fermer</button></div>
   </fieldset>
  </form>}
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
   <div className="p-5"><h3 className="font-bold">Paiements et reste remboursable</h3><p className="mt-1 text-xs text-slate-500">Cumul par paiement, toutes dates confondues. Chaque remboursement est rattaché à son paiement d’origine.</p><input aria-label="Rechercher un dossier à rembourser" placeholder="Rechercher une référence de dossier…" value={search} onChange={e=>setSearch(e.target.value)} className={`${field} mt-3`}/></div>
   <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{['Dossier','Encaissement','Reçu','Remboursé','Reste','Action'].map(h=><th key={h} className="whitespace-nowrap p-3">{h}</th>)}</tr></thead><tbody>{balances.map(b=><tr key={b.payment.id} className="border-t border-slate-100"><td className="p-3"><Link className="font-semibold text-emerald-900 underline" href={`/admin/dossiers/${b.payment.request_id}`}>{b.request?.request_code??b.payment.request_id}</Link><div className="text-xs text-slate-500">{b.request?.status==='cancelled'?'Dossier annulé':b.request?.partner_id?'Partenaire':'Client direct'}</div></td><td className="p-3">{dateLabel(b.payment.verified_at)}</td><td className="whitespace-nowrap p-3">{money(b.collected)}</td><td className="whitespace-nowrap p-3">{money(b.refunded)}</td><td className="whitespace-nowrap p-3 font-semibold">{money(b.remaining)}</td><td className="p-3"><button onClick={()=>open(b.payment.id)} disabled={!ready||busy||!b.payment.verified_at||b.remaining===null||b.remaining<=0} className="rounded-lg border border-emerald-200 px-3 py-2 font-semibold text-emerald-900 disabled:opacity-40">{b.remaining===0?'Remboursé':'Rembourser'}</button></td></tr>)}{!balances.length&&<tr><td colSpan={6} className="p-6 text-center text-slate-500">Aucun paiement confirmé correspondant.</td></tr>}</tbody></table></div>
  </div>
  <div className="rounded-xl border border-slate-200 bg-white p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Historique des remboursements</h3><button onClick={exportRows} className="rounded-lg border px-3 py-2 text-sm">Exporter CSV</button></div>
   {!history.length&&<p className="mt-4 text-sm text-slate-500">Aucun remboursement enregistré sur cette période.</p>}
   <div className="mt-4 space-y-3">{history.map(r=><article key={r.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{data.requests.find(d=>d.id===r.request_id)?.request_code} · {money(cents(r.amount))}</strong><span className="text-sm">{dateLabel(r.refund_date)} · {r.voided_at?'Saisie annulée':'Enregistré'}</span></div><p className="mt-2 break-words text-sm text-slate-600">{methods[r.payment_method]} · {r.reference} — {r.reason}</p><p className="mt-1 text-xs text-slate-500">Enregistré par {data.authors[r.created_by]??'Administrateur'} le {dateLabel(r.created_at)}</p>{r.voided_at&&<p className="mt-2 text-sm text-amber-800">Correction du {dateLabel(r.voided_at)} : {r.void_reason}</p>}<div className="mt-3 flex flex-wrap gap-4 text-sm">{r.proof_path&&<a className="font-semibold text-emerald-900 underline" href={`/api/admin/accounting/refunds/${r.id}/proof`}>Télécharger le justificatif</a>}{!r.voided_at&&<button disabled={busy} onClick={()=>{setVoidId(r.id);setVoidReason("");}} className="text-rose-800 underline">Corriger une saisie erronée</button>}</div>{voidId===r.id&&<form onSubmit={voidEntry} className="mt-3 space-y-3"><p className="text-sm text-rose-800">Cette correction annule uniquement l’écriture comptable. Elle ne récupère pas l’argent déjà versé.</p><input aria-label="Motif de correction" required maxLength={1000} value={voidReason} onChange={e=>setVoidReason(e.target.value)} className={field} placeholder="Motif de l’erreur"/><button disabled={busy} className="rounded-lg bg-rose-800 px-4 py-2 text-white">Annuler cette saisie</button><button type="button" disabled={busy} onClick={()=>setVoidId("")} className="ml-3 underline">Fermer</button></form>}</article>)}</div>
  </div>
 </section>;
}
