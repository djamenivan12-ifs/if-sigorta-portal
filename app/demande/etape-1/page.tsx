"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import AddressSelector from "@/components/AddressSelector";
import PhoneInput from "@/components/PhoneInput";
import { useInsuranceRequest } from "@/context/InsuranceRequestContext";

type Language =
  | "fr"
  | "en"
  | "tr";

const translations = {
  fr: {
    backHome: "← Retour à l’accueil",
    step: "Étape 1 sur 5",
    title: "Informations personnelles",
    description:
      "Saisissez les informations exactement comme elles apparaissent sur vos documents officiels.",

    lastName: "Nom complet",
    firstName: "Prénom complet",
    fatherName: "Nom complet du père",
    birthDate: "Date de naissance",
    gender: "Sexe",
    select: "Sélectionner",
    male: "Homme",
    female: "Femme",
    nationality: "Nationalité",

    cancel: "Annuler",
    next: "Suivant →",

    genderError:
      "Veuillez sélectionner le sexe.",
    requiredError:
      "Veuillez remplir toutes les informations personnelles obligatoires.",
  },

  en: {
    backHome: "← Back to home",
    step: "Step 1 of 5",
    title: "Personal information",
    description:
      "Enter the information exactly as it appears on your official documents.",

    lastName: "Full surname",
    firstName: "Full first name",
    fatherName: "Father's full name",
    birthDate: "Date of birth",
    gender: "Gender",
    select: "Select",
    male: "Male",
    female: "Female",
    nationality: "Nationality",

    cancel: "Cancel",
    next: "Next →",

    genderError:
      "Please select your gender.",
    requiredError:
      "Please complete all required personal information.",
  },

  tr: {
    backHome: "← Ana sayfaya dön",
    step: "5 adımın 1.'si",
    title: "Kişisel bilgiler",
    description:
      "Bilgilerinizi resmi belgelerinizde göründüğü şekilde girin.",

    lastName: "Soyad",
    firstName: "Ad",
    fatherName: "Babanın tam adı",
    birthDate: "Doğum tarihi",
    gender: "Cinsiyet",
    select: "Seçiniz",
    male: "Erkek",
    female: "Kadın",
    nationality: "Uyruk",

    cancel: "İptal",
    next: "İleri →",

    genderError:
      "Lütfen cinsiyet seçin.",
    requiredError:
      "Lütfen zorunlu kişisel bilgilerin tamamını doldurun.",
  },
};

function toUpperCaseValue(
  value: string,
): string {
  return value.toLocaleUpperCase(
    "tr-TR",
  );
}
const countries = [
  { value: "Afghanistan", fr: "Afghanistan", en: "Afghanistan", tr: "Afganistan" },
  { value: "Afrique du Sud", fr: "Afrique du Sud", en: "South Africa", tr: "Güney Afrika" },
  { value: "Albanie", fr: "Albanie", en: "Albania", tr: "Arnavutluk" },
  { value: "Algérie", fr: "Algérie", en: "Algeria", tr: "Cezayir" },
  { value: "Allemagne", fr: "Allemagne", en: "Germany", tr: "Almanya" },
  { value: "Angola", fr: "Angola", en: "Angola", tr: "Angola" },
  { value: "Arabie saoudite", fr: "Arabie saoudite", en: "Saudi Arabia", tr: "Suudi Arabistan" },
  { value: "Argentine", fr: "Argentine", en: "Argentina", tr: "Arjantin" },
  { value: "Arménie", fr: "Arménie", en: "Armenia", tr: "Ermenistan" },
  { value: "Australie", fr: "Australie", en: "Australia", tr: "Avustralya" },
  { value: "Autriche", fr: "Autriche", en: "Austria", tr: "Avusturya" },
  { value: "Azerbaïdjan", fr: "Azerbaïdjan", en: "Azerbaijan", tr: "Azerbaycan" },
  { value: "Bahreïn", fr: "Bahreïn", en: "Bahrain", tr: "Bahreyn" },
  { value: "Bangladesh", fr: "Bangladesh", en: "Bangladesh", tr: "Bangladeş" },
  { value: "Belgique", fr: "Belgique", en: "Belgium", tr: "Belçika" },
  { value: "Bénin", fr: "Bénin", en: "Benin", tr: "Benin" },
  { value: "Bolivie", fr: "Bolivie", en: "Bolivia", tr: "Bolivya" },
  { value: "Bosnie-Herzégovine", fr: "Bosnie-Herzégovine", en: "Bosnia and Herzegovina", tr: "Bosna-Hersek" },
  { value: "Botswana", fr: "Botswana", en: "Botswana", tr: "Botsvana" },
  { value: "Brésil", fr: "Brésil", en: "Brazil", tr: "Brezilya" },
  { value: "Bulgarie", fr: "Bulgarie", en: "Bulgaria", tr: "Bulgaristan" },
  { value: "Burkina Faso", fr: "Burkina Faso", en: "Burkina Faso", tr: "Burkina Faso" },
  { value: "Burundi", fr: "Burundi", en: "Burundi", tr: "Burundi" },

  { value: "Cameroun", fr: "Cameroun", en: "Cameroon", tr: "Kamerun" },
  { value: "Canada", fr: "Canada", en: "Canada", tr: "Kanada" },
  { value: "Cap-Vert", fr: "Cap-Vert", en: "Cape Verde", tr: "Yeşil Burun Adaları" },
  { value: "Chili", fr: "Chili", en: "Chile", tr: "Şili" },
  { value: "Chine", fr: "Chine", en: "China", tr: "Çin" },
  { value: "Chypre", fr: "Chypre", en: "Cyprus", tr: "Kıbrıs" },
  { value: "Colombie", fr: "Colombie", en: "Colombia", tr: "Kolombiya" },
  { value: "Comores", fr: "Comores", en: "Comoros", tr: "Komorlar" },
  { value: "Congo", fr: "Congo", en: "Congo", tr: "Kongo" },
  { value: "Corée du Sud", fr: "Corée du Sud", en: "South Korea", tr: "Güney Kore" },
  { value: "Costa Rica", fr: "Costa Rica", en: "Costa Rica", tr: "Kosta Rika" },
  { value: "Côte d’Ivoire", fr: "Côte d’Ivoire", en: "Ivory Coast", tr: "Fildişi Sahili" },
  { value: "Croatie", fr: "Croatie", en: "Croatia", tr: "Hırvatistan" },
  { value: "Cuba", fr: "Cuba", en: "Cuba", tr: "Küba" },

  { value: "Danemark", fr: "Danemark", en: "Denmark", tr: "Danimarka" },
  { value: "Djibouti", fr: "Djibouti", en: "Djibouti", tr: "Cibuti" },

  { value: "Égypte", fr: "Égypte", en: "Egypt", tr: "Mısır" },
  { value: "Émirats arabes unis", fr: "Émirats arabes unis", en: "United Arab Emirates", tr: "Birleşik Arap Emirlikleri" },
  { value: "Équateur", fr: "Équateur", en: "Ecuador", tr: "Ekvador" },
  { value: "Érythrée", fr: "Érythrée", en: "Eritrea", tr: "Eritre" },
  { value: "Espagne", fr: "Espagne", en: "Spain", tr: "İspanya" },
  { value: "Estonie", fr: "Estonie", en: "Estonia", tr: "Estonya" },
  { value: "Eswatini", fr: "Eswatini", en: "Eswatini", tr: "Esvatini" },
  { value: "États-Unis", fr: "États-Unis", en: "United States", tr: "Amerika Birleşik Devletleri" },
  { value: "Éthiopie", fr: "Éthiopie", en: "Ethiopia", tr: "Etiyopya" },

  { value: "Finlande", fr: "Finlande", en: "Finland", tr: "Finlandiya" },
  { value: "France", fr: "France", en: "France", tr: "Fransa" },

  { value: "Gabon", fr: "Gabon", en: "Gabon", tr: "Gabon" },
  { value: "Gambie", fr: "Gambie", en: "Gambia", tr: "Gambiya" },
  { value: "Géorgie", fr: "Géorgie", en: "Georgia", tr: "Gürcistan" },
  { value: "Ghana", fr: "Ghana", en: "Ghana", tr: "Gana" },
  { value: "Grèce", fr: "Grèce", en: "Greece", tr: "Yunanistan" },
  { value: "Guinée", fr: "Guinée", en: "Guinea", tr: "Gine" },
  { value: "Guinée-Bissau", fr: "Guinée-Bissau", en: "Guinea-Bissau", tr: "Gine-Bissau" },
  { value: "Guinée équatoriale", fr: "Guinée équatoriale", en: "Equatorial Guinea", tr: "Ekvator Ginesi" },

  { value: "Haïti", fr: "Haïti", en: "Haiti", tr: "Haiti" },
  { value: "Hongrie", fr: "Hongrie", en: "Hungary", tr: "Macaristan" },

  { value: "Inde", fr: "Inde", en: "India", tr: "Hindistan" },
  { value: "Indonésie", fr: "Indonésie", en: "Indonesia", tr: "Endonezya" },
  { value: "Irak", fr: "Irak", en: "Iraq", tr: "Irak" },
  { value: "Iran", fr: "Iran", en: "Iran", tr: "İran" },
  { value: "Irlande", fr: "Irlande", en: "Ireland", tr: "İrlanda" },
  { value: "Islande", fr: "Islande", en: "Iceland", tr: "İzlanda" },
  { value: "Israël", fr: "Israël", en: "Israel", tr: "İsrail" },
  { value: "Italie", fr: "Italie", en: "Italy", tr: "İtalya" },

  { value: "Japon", fr: "Japon", en: "Japan", tr: "Japonya" },
  { value: "Jordanie", fr: "Jordanie", en: "Jordan", tr: "Ürdün" },

  { value: "Kazakhstan", fr: "Kazakhstan", en: "Kazakhstan", tr: "Kazakistan" },
  { value: "Kenya", fr: "Kenya", en: "Kenya", tr: "Kenya" },
  { value: "Kirghizistan", fr: "Kirghizistan", en: "Kyrgyzstan", tr: "Kırgızistan" },
  { value: "Koweït", fr: "Koweït", en: "Kuwait", tr: "Kuveyt" },

  { value: "Liban", fr: "Liban", en: "Lebanon", tr: "Lübnan" },
  { value: "Libéria", fr: "Libéria", en: "Liberia", tr: "Liberya" },
  { value: "Libye", fr: "Libye", en: "Libya", tr: "Libya" },
  { value: "Luxembourg", fr: "Luxembourg", en: "Luxembourg", tr: "Lüksemburg" },

  { value: "Madagascar", fr: "Madagascar", en: "Madagascar", tr: "Madagaskar" },
  { value: "Malaisie", fr: "Malaisie", en: "Malaysia", tr: "Malezya" },
  { value: "Malawi", fr: "Malawi", en: "Malawi", tr: "Malavi" },
  { value: "Mali", fr: "Mali", en: "Mali", tr: "Mali" },
  { value: "Malte", fr: "Malte", en: "Malta", tr: "Malta" },
  { value: "Maroc", fr: "Maroc", en: "Morocco", tr: "Fas" },
  { value: "Maurice", fr: "Maurice", en: "Mauritius", tr: "Mauritius" },
  { value: "Mauritanie", fr: "Mauritanie", en: "Mauritania", tr: "Moritanya" },
  { value: "Mexique", fr: "Mexique", en: "Mexico", tr: "Meksika" },
  { value: "Moldavie", fr: "Moldavie", en: "Moldova", tr: "Moldova" },
  { value: "Mongolie", fr: "Mongolie", en: "Mongolia", tr: "Moğolistan" },
  { value: "Monténégro", fr: "Monténégro", en: "Montenegro", tr: "Karadağ" },
  { value: "Mozambique", fr: "Mozambique", en: "Mozambique", tr: "Mozambik" },

  { value: "Namibie", fr: "Namibie", en: "Namibia", tr: "Namibya" },
  { value: "Népal", fr: "Népal", en: "Nepal", tr: "Nepal" },
  { value: "Niger", fr: "Niger", en: "Niger", tr: "Nijer" },
  { value: "Nigeria", fr: "Nigeria", en: "Nigeria", tr: "Nijerya" },
  { value: "Norvège", fr: "Norvège", en: "Norway", tr: "Norveç" },
  { value: "Nouvelle-Zélande", fr: "Nouvelle-Zélande", en: "New Zealand", tr: "Yeni Zelanda" },

  { value: "Oman", fr: "Oman", en: "Oman", tr: "Umman" },
  { value: "Ouganda", fr: "Ouganda", en: "Uganda", tr: "Uganda" },
  { value: "Ouzbékistan", fr: "Ouzbékistan", en: "Uzbekistan", tr: "Özbekistan" },

  { value: "Pakistan", fr: "Pakistan", en: "Pakistan", tr: "Pakistan" },
  { value: "Palestine", fr: "Palestine", en: "Palestine", tr: "Filistin" },
  { value: "Panama", fr: "Panama", en: "Panama", tr: "Panama" },
  { value: "Paraguay", fr: "Paraguay", en: "Paraguay", tr: "Paraguay" },
  { value: "Pays-Bas", fr: "Pays-Bas", en: "Netherlands", tr: "Hollanda" },
  { value: "Pérou", fr: "Pérou", en: "Peru", tr: "Peru" },
  { value: "Philippines", fr: "Philippines", en: "Philippines", tr: "Filipinler" },
  { value: "Pologne", fr: "Pologne", en: "Poland", tr: "Polonya" },
  { value: "Portugal", fr: "Portugal", en: "Portugal", tr: "Portekiz" },

  { value: "Qatar", fr: "Qatar", en: "Qatar", tr: "Katar" },

  { value: "République centrafricaine", fr: "République centrafricaine", en: "Central African Republic", tr: "Orta Afrika Cumhuriyeti" },
  { value: "République démocratique du Congo", fr: "République démocratique du Congo", en: "Democratic Republic of the Congo", tr: "Kongo Demokratik Cumhuriyeti" },
  { value: "République dominicaine", fr: "République dominicaine", en: "Dominican Republic", tr: "Dominik Cumhuriyeti" },
  { value: "République tchèque", fr: "République tchèque", en: "Czech Republic", tr: "Çekya" },
  { value: "Roumanie", fr: "Roumanie", en: "Romania", tr: "Romanya" },
  { value: "Royaume-Uni", fr: "Royaume-Uni", en: "United Kingdom", tr: "Birleşik Krallık" },
  { value: "Russie", fr: "Russie", en: "Russia", tr: "Rusya" },
  { value: "Rwanda", fr: "Rwanda", en: "Rwanda", tr: "Ruanda" },

  { value: "Sénégal", fr: "Sénégal", en: "Senegal", tr: "Senegal" },
  { value: "Serbie", fr: "Serbie", en: "Serbia", tr: "Sırbistan" },
  { value: "Sierra Leone", fr: "Sierra Leone", en: "Sierra Leone", tr: "Sierra Leone" },
  { value: "Singapour", fr: "Singapour", en: "Singapore", tr: "Singapur" },
  { value: "Slovaquie", fr: "Slovaquie", en: "Slovakia", tr: "Slovakya" },
  { value: "Slovénie", fr: "Slovénie", en: "Slovenia", tr: "Slovenya" },
  { value: "Somalie", fr: "Somalie", en: "Somalia", tr: "Somali" },
  { value: "Soudan", fr: "Soudan", en: "Sudan", tr: "Sudan" },
  { value: "Soudan du Sud", fr: "Soudan du Sud", en: "South Sudan", tr: "Güney Sudan" },
  { value: "Sri Lanka", fr: "Sri Lanka", en: "Sri Lanka", tr: "Sri Lanka" },
  { value: "Suède", fr: "Suède", en: "Sweden", tr: "İsveç" },
  { value: "Suisse", fr: "Suisse", en: "Switzerland", tr: "İsviçre" },
  { value: "Syrie", fr: "Syrie", en: "Syria", tr: "Suriye" },

  { value: "Tadjikistan", fr: "Tadjikistan", en: "Tajikistan", tr: "Tacikistan" },
  { value: "Tanzanie", fr: "Tanzanie", en: "Tanzania", tr: "Tanzanya" },
  { value: "Tchad", fr: "Tchad", en: "Chad", tr: "Çad" },
  { value: "Thaïlande", fr: "Thaïlande", en: "Thailand", tr: "Tayland" },
  { value: "Togo", fr: "Togo", en: "Togo", tr: "Togo" },
  { value: "Tunisie", fr: "Tunisie", en: "Tunisia", tr: "Tunus" },
  { value: "Turkménistan", fr: "Turkménistan", en: "Turkmenistan", tr: "Türkmenistan" },
  { value: "Türkiye", fr: "Turquie", en: "Türkiye", tr: "Türkiye" },

  { value: "Ukraine", fr: "Ukraine", en: "Ukraine", tr: "Ukrayna" },
  { value: "Uruguay", fr: "Uruguay", en: "Uruguay", tr: "Uruguay" },

  { value: "Venezuela", fr: "Venezuela", en: "Venezuela", tr: "Venezuela" },
  { value: "Vietnam", fr: "Vietnam", en: "Vietnam", tr: "Vietnam" },

  { value: "Yémen", fr: "Yémen", en: "Yemen", tr: "Yemen" },

  { value: "Zambie", fr: "Zambie", en: "Zambia", tr: "Zambiya" },
  { value: "Zimbabwe", fr: "Zimbabwe", en: "Zimbabwe", tr: "Zimbabve" },
];
export default function Etape1Page() {
  const router =
    useRouter();

  const {
    requestData,
    updateRequestData,
  } =
    useInsuranceRequest();

  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "fr",
    );

  useEffect(() => {
    const savedLanguage =
      window.localStorage.getItem(
        "if-sigorta-language",
      );

    if (
      savedLanguage === "fr" ||
      savedLanguage === "en" ||
      savedLanguage === "tr"
    ) {
      setLanguage(
        savedLanguage,
      );
    }

    function handleLanguageChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          language:
            Language;
        }>;

      const nextLanguage =
        customEvent.detail?.language;

      if (
        nextLanguage === "fr" ||
        nextLanguage === "en" ||
        nextLanguage === "tr"
      ) {
        setLanguage(
          nextLanguage,
        );
      }
    }

    window.addEventListener(
      "if-sigorta-language-change",
      handleLanguageChange,
    );

    return () => {
      window.removeEventListener(
        "if-sigorta-language-change",
        handleLanguageChange,
      );
    };
  }, []);

  const t =
    translations[
      language
    ];

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget,
      );

    const lastName =
      toUpperCaseValue(
        formData
          .get("lastName")
          ?.toString()
          .trim() ?? "",
      );

    const firstName =
      toUpperCaseValue(
        formData
          .get("firstName")
          ?.toString()
          .trim() ?? "",
      );

    const fatherName =
      toUpperCaseValue(
        formData
          .get("fatherName")
          ?.toString()
          .trim() ?? "",
      );

    const birthDate =
      formData
        .get("birthDate")
        ?.toString() ?? "";

    const rawGender =
      formData.get(
        "gender",
      );

    if (
      rawGender !== "male" &&
      rawGender !== "female"
    ) {
      alert(
        t.genderError,
      );

      return;
    }

    const nationality =
      formData
        .get("nationality")
        ?.toString()
        .trim() ?? "";

    if (
      !lastName ||
      !firstName ||
      !fatherName ||
      !birthDate ||
      !nationality
    ) {
      alert(
        t.requiredError,
      );

      return;
    }

    updateRequestData({
      lastName,
      firstName,
      fatherName,
      birthDate,
      gender:
        rawGender,
      nationality,
    });

    router.push(
      "/demande/etape-2",
    );
  }

  const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10";

  const fieldLabelClassName =
    "mb-2 block text-sm font-semibold text-slate-700";

  const formEyebrow =
    language === "fr"
      ? "Votre demande"
      : language === "en"
        ? "Your application"
        : "Başvurunuz";

  const sideTitle =
    language === "fr"
      ? "Une demande simple, étape par étape."
      : language === "en"
        ? "A simple application, step by step."
        : "Kolay bir başvuru, adım adım.";

  const sideText =
    language === "fr"
      ? "Vos informations sont enregistrées au fur et à mesure. Vous pourrez continuer votre demande sans tout recommencer."
      : language === "en"
        ? "Your information is saved as you go. You can continue your application without starting over."
        : "Bilgileriniz ilerledikçe kaydedilir. Başvurunuza baştan başlamadan devam edebilirsiniz.";

  const exactInfo =
    language === "fr"
      ? "Utilisez exactement les informations figurant sur vos documents."
      : language === "en"
        ? "Use exactly the information shown on your official documents."
        : "Resmi belgelerinizde yer alan bilgileri aynen kullanın.";

  const protectedData =
    language === "fr"
      ? "Vos informations sont utilisées uniquement pour le traitement de votre demande."
      : language === "en"
        ? "Your information is used only to process your insurance application."
        : "Bilgileriniz yalnızca sigorta başvurunuzun işlenmesi için kullanılır.";

  return (
    <main className="min-h-screen bg-[#F6F8F5]">
      {/* TOP BAR */}

      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <a
  href="/"
  className="flex items-center"
  aria-label="IF Sigorta"
>
  <img
    src="/if-sigorta-logo-light.png"
    alt="IF Sigorta"
    className="h-[72px] w-auto object-contain object-left sm:h-[82px]"
  />
</a>

          <a
            href="/"
            className="text-sm font-semibold text-slate-500 transition hover:text-[#0B5D3B]"
          >
            {t.backHome}
          </a>
        </div>
      </div>

      {/* PAGE */}

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10 xl:gap-14">
          {/* LEFT PANEL */}

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#123F2C] px-6 py-8 text-white sm:px-8 lg:min-h-[560px] lg:px-8 lg:py-10">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#B8E83D]/10" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/5" />

              <div className="relative z-10 flex h-full flex-col">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B8E83D]">
                    {formEyebrow}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-white/60">
                    {t.step}
                  </p>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-1/5 rounded-full bg-[#B8E83D]" />
                  </div>

                  <h2 className="mt-8 max-w-sm text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-4xl">
                    {sideTitle}
                  </h2>

                  <p className="mt-5 max-w-sm text-sm leading-7 text-white/65 sm:text-base">
                    {sideText}
                  </p>
                </div>

                <div className="mt-10 space-y-4 lg:mt-auto">
                  <div className="flex gap-3 border-t border-white/10 pt-5">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B8E83D] text-xs font-black text-[#15311F]">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {exactInfo}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">
                      ✓
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {protectedData}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* FORM */}

          <section className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.24)] sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0B5D3B]">
                {t.step}
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102B20] sm:text-4xl">
                {t.title}
              </h1>

              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                {t.description}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-9 space-y-10"
            >
              {/* PERSONAL INFORMATION */}

              <section>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="firstName"
                      className={fieldLabelClassName}
                    >
                      {t.firstName}
                    </label>

                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={requestData.firstName ?? ""}
                      onChange={(event) =>
                        updateRequestData({
                          firstName:
                            toUpperCaseValue(
                              event.target.value,
                            ),
                        })
                      }
                      required
                      autoComplete="given-name"
                      className={`${inputClassName} uppercase`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className={fieldLabelClassName}
                    >
                      {t.lastName}
                    </label>

                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={requestData.lastName ?? ""}
                      onChange={(event) =>
                        updateRequestData({
                          lastName:
                            toUpperCaseValue(
                              event.target.value,
                            ),
                        })
                      }
                      required
                      autoComplete="family-name"
                      className={`${inputClassName} uppercase`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="fatherName"
                      className={fieldLabelClassName}
                    >
                      {t.fatherName}
                    </label>

                    <input
                      id="fatherName"
                      name="fatherName"
                      type="text"
                      value={requestData.fatherName ?? ""}
                      onChange={(event) =>
                        updateRequestData({
                          fatherName:
                            toUpperCaseValue(
                              event.target.value,
                            ),
                        })
                      }
                      required
                      className={`${inputClassName} uppercase`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="birthDate"
                      className={fieldLabelClassName}
                    >
                      {t.birthDate}
                    </label>

                    <input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      defaultValue={requestData.birthDate ?? ""}
                      required
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="gender"
                      className={fieldLabelClassName}
                    >
                      {t.gender}
                    </label>

                    <select
                      id="gender"
                      name="gender"
                      defaultValue={requestData.gender ?? ""}
                      required
                      className={inputClassName}
                    >
                      <option
                        value=""
                        disabled
                      >
                        {t.select}
                      </option>

                      <option value="male">
                        {t.male}
                      </option>

                      <option value="female">
                        {t.female}
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="nationality"
                      className={fieldLabelClassName}
                    >
                      {t.nationality}
                    </label>

                    <select
                      id="nationality"
                      name="nationality"
                      value={requestData.nationality ?? ""}
                      onChange={(event) =>
                        updateRequestData({
                          nationality:
                            event.target.value,
                        })
                      }
                      required
                      className={inputClassName}
                    >
                      <option
                        value=""
                        disabled
                      >
                        {language === "fr"
                          ? "Sélectionner un pays"
                          : language === "en"
                            ? "Select a country"
                            : "Ülke seçin"}
                      </option>

                      {countries.map((country) => (
                        <option
                          key={country.value}
                          value={country.value}
                        >
                          {country[language]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* CONTACT */}

              <section className="border-t border-slate-100 pt-8">
                <PhoneInput
                  countryCode={
                    requestData.whatsappCountryCode ??
                    "+90"
                  }
                  phoneNumber={
                    requestData.whatsappNumber ??
                    ""
                  }
                  onCountryCodeChange={(value) =>
                    updateRequestData({
                      whatsappCountryCode:
                        value,
                    })
                  }
                  onPhoneNumberChange={(value) =>
                    updateRequestData({
                      whatsappNumber:
                        value,
                    })
                  }
                />
              </section>

              {/* ADDRESS */}

              <section className="border-t border-slate-100 pt-8">
                <AddressSelector
                  value={requestData.address}
                  onChange={(address) =>
                    updateRequestData({
                      address,
                    })
                  }
                />
              </section>

              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-7 sm:flex-row sm:items-center sm:justify-between">
                <a
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {t.cancel}
                </a>

                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0B5D3B] px-7 text-sm font-black text-white shadow-lg shadow-[#0B5D3B]/10 transition hover:-translate-y-0.5 hover:bg-[#084A2F]"
                >
                  {t.next}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}