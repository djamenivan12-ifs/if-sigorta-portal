"use client";
import { useLanguage } from "@/lib/useLanguage";





type RequestCodeCardProps = {
  requestCode: string;
};

const translations = {
  fr: {
    title: "Code du dossier",
    generating: "Génération du code...",
    copy: "Copier le code",
    copied: "Code du dossier copié.",
    copyFailed:
      "Impossible de copier automatiquement le code. Vous pouvez le copier manuellement.",
    description:
      "Conservez ce code. Il servira de référence pour le virement et permettra ensuite de suivre votre demande.",
  },
  en: {
    title: "Request code",
    generating: "Generating code...",
    copy: "Copy code",
    copied: "Request code copied.",
    copyFailed:
      "Unable to copy the code automatically. You can copy it manually.",
    description:
      "Keep this code. It will be used as the bank transfer reference and will allow you to track your request later.",
  },
  tr: {
    title: "Başvuru kodu",
    generating: "Kod oluşturuluyor...",
    copy: "Kodu kopyala",
    copied: "Başvuru kodu kopyalandı.",
    copyFailed:
      "Kod otomatik olarak kopyalanamadı. Kodu manuel olarak kopyalayabilirsiniz.",
    description:
      "Bu kodu saklayın. Banka havalesinde referans olarak kullanılacak ve daha sonra başvurunuzu takip etmenizi sağlayacaktır.",
  },
};

export default function RequestCodeCard({ requestCode }: RequestCodeCardProps) {
  const [language] = useLanguage();



  const t = translations[language];

  async function copyRequestCode() {
    if (!requestCode) return;

    try {
      await navigator.clipboard.writeText(requestCode);
      alert(t.copied);
    } catch {
      alert(t.copyFailed);
    }
  }

  return (
    <section className="min-w-0 rounded-[1.5rem] border border-[#DCE9DD] bg-white p-4 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B5D3B]">
        01
      </p>

      <h2 className="mt-1 text-lg font-semibold text-slate-900">
        {t.title}
      </h2>

      <div className="mt-4 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-all rounded-xl bg-[#F3F8F2] px-3 py-3 font-mono text-base font-black tracking-wide text-[#0B5D3B] sm:px-4 sm:text-xl">
          {requestCode || t.generating}
        </p>

        <button
          type="button"
          disabled={!requestCode}
          onClick={copyRequestCode}
          className="w-full shrink-0 rounded-xl border border-[#CFE3CF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B5D3B] transition hover:bg-[#F3F8F2] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {t.copy}
        </button>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">
        {t.description}
      </p>
    </section>
  );
}
