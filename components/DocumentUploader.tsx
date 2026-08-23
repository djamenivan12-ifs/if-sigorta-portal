"use client";

import {
  ChangeEvent,
  useRef,
} from "react";

export type Language =
  | "fr"
  | "en"
  | "tr";

type DocumentUploaderProps = {
  label: string;
  description: string;
  file: File | null;
  language?: Language;
  onChange: (
    file: File | null,
  ) => void;
};

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const translations = {
  fr: {
    invalidFormat:
      "Format non accepté. Utilisez un fichier PDF, JPG, JPEG ou PNG.",

    tooLarge:
      "Le fichier ne doit pas dépasser 10 Mo.",

    chooseFile:
      "Choisir un fichier",

    acceptedFormats:
      "PDF, JPG ou PNG — 10 Mo maximum",

    documentAdded:
      "✓ Document ajouté",

    remove:
      "Retirer",

    kb:
      "Ko",

    mb:
      "Mo",
  },

  en: {
    invalidFormat:
      "Unsupported format. Use a PDF, JPG, JPEG or PNG file.",

    tooLarge:
      "The file must not exceed 10 MB.",

    chooseFile:
      "Choose a file",

    acceptedFormats:
      "PDF, JPG or PNG — maximum 10 MB",

    documentAdded:
      "✓ Document added",

    remove:
      "Remove",

    kb:
      "KB",

    mb:
      "MB",
  },

  tr: {
    invalidFormat:
      "Dosya formatı kabul edilmiyor. PDF, JPG, JPEG veya PNG kullanın.",

    tooLarge:
      "Dosya boyutu 10 MB’ı geçmemelidir.",

    chooseFile:
      "Dosya seç",

    acceptedFormats:
      "PDF, JPG veya PNG — maksimum 10 MB",

    documentAdded:
      "✓ Belge eklendi",

    remove:
      "Kaldır",

    kb:
      "KB",

    mb:
      "MB",
  },
};

export default function DocumentUploader({
  label,
  description,
  file,
  language = "fr",
  onChange,
}: DocumentUploaderProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const safeLanguage: Language =
    language === "fr" ||
    language === "en" ||
    language === "tr"
      ? language
      : "fr";

  const t =
    translations[
      safeLanguage
    ];

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      !ALLOWED_FILE_TYPES.includes(
        selectedFile.type,
      )
    ) {
      alert(
        t.invalidFormat,
      );

      event.target.value =
        "";

      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      alert(
        t.tooLarge,
      );

      event.target.value =
        "";

      return;
    }

    onChange(
      selectedFile,
    );
  }

  function removeFile() {
    onChange(
      null,
    );

    if (
      inputRef.current
    ) {
      inputRef.current.value =
        "";
    }
  }

  function formatFileSize(
    size: number,
  ) {
    if (
      size <
      1024 * 1024
    ) {
      return `${Math.round(
        size / 1024,
      )} ${t.kb}`;
    }

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(2)} ${t.mb}`;
  }

  return (
    <div>
      <div>
        <p className="font-medium text-slate-800">
          {label}

          <span className="ml-1 text-red-500">
            *
          </span>
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {!file ? (
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center transition hover:border-blue-600 hover:bg-blue-50">
          <span className="text-3xl">
            📄
          </span>

          <span className="mt-3 font-semibold text-blue-700">
            {t.chooseFile}
          </span>

          <span className="mt-1 text-sm text-slate-500">
            {t.acceptedFormats}
          </span>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={
              handleFileChange
            }
            className="hidden"
          />
        </label>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-green-50 p-4">
          <div className="min-w-0">
            <p className="font-semibold text-green-800">
              {t.documentAdded}
            </p>

            <p className="truncate text-sm text-slate-700">
              {file.name}
            </p>

            <p className="text-xs text-slate-500">
              {formatFileSize(
                file.size,
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={
              removeFile
            }
            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            {t.remove}
          </button>
        </div>
      )}
    </div>
  );
}