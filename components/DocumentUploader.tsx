"use client";

import { ChangeEvent, useRef } from "react";

type DocumentUploaderProps = {
  label: string;
  description: string;
  file: File | null;
  onChange: (file: File | null) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export default function DocumentUploader({
  label,
  description,
  file,
  onChange,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      alert(
        "Format non accepté. Utilisez un fichier PDF, JPG, JPEG ou PNG.",
      );

      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      alert("Le fichier ne doit pas dépasser 10 Mo.");

      event.target.value = "";
      return;
    }

    onChange(selectedFile);
  }

  function removeFile() {
    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function formatFileSize(size: number) {
    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)} Ko`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} Mo`;
  }

  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4">
      <div className="mb-3">
        <p className="font-semibold text-slate-900">
          {label}
          <span className="ml-1 text-red-600">*</span>
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {!file ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center transition hover:border-blue-600 hover:bg-blue-50">
          <span className="text-3xl">📄</span>

          <span className="mt-3 font-semibold text-blue-700">
            Choisir un fichier
          </span>

          <span className="mt-1 text-sm text-slate-500">
            PDF, JPG ou PNG — 10 Mo maximum
          </span>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-green-50 p-4">
          <div className="min-w-0">
            <p className="font-semibold text-green-800">
              ✓ Document ajouté
            </p>

            <p className="truncate text-sm text-slate-700">
              {file.name}
            </p>

            <p className="text-xs text-slate-500">
              {formatFileSize(file.size)}
            </p>
          </div>

          <button
            type="button"
            onClick={removeFile}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Retirer
          </button>
        </div>
      )}
    </div>
  );
}