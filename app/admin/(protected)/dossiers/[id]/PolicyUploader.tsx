"use client";

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type PolicyUploaderProps = {
  requestId: string;

  insuranceDurationYears:
    | 1
    | 2;

  existingPolicyYears?: number[];

  hasKimlik: boolean;

  kimlikExpirationDate?:
    | string
    | null;

  requestedStartDate?:
    | string
    | null;

  policyStartDate?:
    | string
    | null;

  policyEndDate?:
    | string
    | null;
};

type PolicyYear =
  | 1
  | 2;

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

function formatFileSize(
  size: number,
) {
  if (
    size <
    1024 * 1024
  ) {
    return `${Math.round(
      size / 1024,
    )} Ko`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(
    2,
  )} Mo`;
}

function validatePdf(
  file: File,
): string | null {
  const isPdf =
    file.type ===
      "application/pdf" ||
    file.name
      .toLowerCase()
      .endsWith(
        ".pdf",
      );

  if (!isPdf) {
    return "Seuls les fichiers PDF sont acceptés.";
  }

  if (
    file.size ===
    0
  ) {
    return "Le fichier PDF est vide.";
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    return "Le fichier PDF ne doit pas dépasser 10 Mo.";
  }

  return null;
}

function isValidDate(
  value: string,
) {
  if (!value) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    );

  return !Number.isNaN(
    date.getTime(),
  );
}

function addYearsKeepingMonthAndDay(
  value: string,
  years: 1 | 2,
) {
  if (!isValidDate(value)) {
    return "";
  }

  const [
    yearText,
    monthText,
    dayText,
  ] =
    value.split("-");

  const year =
    Number(yearText);

  const month =
    Number(monthText);

  const day =
    Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return "";
  }

  const targetYear =
    year + years;

  /*
   * Cas spécial :
   * 29 février vers une année non bissextile.
   * On utilise le 28 février.
   */
  if (
    month === 2 &&
    day === 29
  ) {
    const leapYear =
      targetYear % 4 === 0 &&
      (
        targetYear % 100 !== 0 ||
        targetYear % 400 === 0
      );

    if (!leapYear) {
      return `${targetYear}-02-28`;
    }
  }

  return [
    String(targetYear).padStart(
      4,
      "0",
    ),
    String(month).padStart(
      2,
      "0",
    ),
    String(day).padStart(
      2,
      "0",
    ),
  ].join("-");
}

export default function PolicyUploader({
  requestId,
  insuranceDurationYears,
  existingPolicyYears = [],
  hasKimlik,
  kimlikExpirationDate = null,
  requestedStartDate = null,
  policyStartDate = null,
  policyEndDate = null,
}: PolicyUploaderProps) {
  const router =
    useRouter();

  const year1InputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const year2InputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    year1File,
    setYear1File,
  ] =
    useState<File | null>(
      null,
    );

  const [
    year2File,
    setYear2File,
  ] =
    useState<File | null>(
      null,
    );

  const automaticStartDate =
    policyStartDate ??
    (
      hasKimlik
        ? kimlikExpirationDate
        : requestedStartDate
    ) ??
    "";

  const automaticEndDate =
    policyEndDate ??
    addYearsKeepingMonthAndDay(
      automaticStartDate,
      insuranceDurationYears,
    );

  const [
    startDate,
    setStartDate,
  ] =
    useState(
      automaticStartDate,
    );

  const [
    endDate,
    setEndDate,
  ] =
    useState(
      automaticEndDate,
    );

  const [
    draggingYear,
    setDraggingYear,
  ] =
    useState<
      PolicyYear | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      "",
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      "",
    );

  const requiresTwoPolicies =
    insuranceDurationYears ===
    2;

  const year1AlreadyExists =
    existingPolicyYears.includes(
      1,
    );

  const year2AlreadyExists =
    existingPolicyYears.includes(
      2,
    );

  const allRequiredExistingPoliciesArePresent =
    year1AlreadyExists &&
    (
      !requiresTwoPolicies ||
      year2AlreadyExists
    );

  function clearMessages() {
    setErrorMessage(
      "",
    );

    setSuccessMessage(
      "",
    );
  }

  function getInputRef(
    year:
      PolicyYear,
  ) {
    return year ===
      1
      ? year1InputRef
      : year2InputRef;
  }

  function setPolicyFile(
    year:
      PolicyYear,

    file:
      File | null,
  ) {
    if (
      year ===
      1
    ) {
      setYear1File(
        file,
      );

      return;
    }

    setYear2File(
      file,
    );
  }

  function selectFile(
    year:
      PolicyYear,

    selectedFile:
      File,
  ) {
    clearMessages();

    const validationError =
      validatePdf(
        selectedFile,
      );

    if (
      validationError
    ) {
      setPolicyFile(
        year,
        null,
      );

      setErrorMessage(
        `Police année ${year} : ${validationError}`,
      );

      const inputRef =
        getInputRef(
          year,
        );

      if (
        inputRef.current
      ) {
        inputRef.current.value =
          "";
      }

      return;
    }

    setPolicyFile(
      year,
      selectedFile,
    );
  }

  function handleFileChange(
    year:
      PolicyYear,

    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target
        .files?.[0];

    if (
      !selectedFile
    ) {
      return;
    }

    selectFile(
      year,
      selectedFile,
    );
  }

  function handleDragOver(
    year:
      PolicyYear,

    event:
      DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();

    if (
      loading
    ) {
      return;
    }

    setDraggingYear(
      year,
    );
  }

  function handleDragLeave(
    event:
      DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();

    setDraggingYear(
      null,
    );
  }

  function handleDrop(
    year:
      PolicyYear,

    event:
      DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();

    setDraggingYear(
      null,
    );

    if (
      loading
    ) {
      return;
    }

    const selectedFile =
      event.dataTransfer
        .files?.[0];

    if (
      !selectedFile
    ) {
      return;
    }

    selectFile(
      year,
      selectedFile,
    );
  }

  function removeFile(
    year:
      PolicyYear,
  ) {
    setPolicyFile(
      year,
      null,
    );

    clearMessages();

    const inputRef =
      getInputRef(
        year,
      );

    if (
      inputRef.current
    ) {
      inputRef.current.value =
        "";
    }
  }

  function validateDates() {
    if (
      !startDate ||
      !endDate
    ) {
      return "La date de début et la date de fin de l’assurance sont obligatoires.";
    }

    if (
      !isValidDate(
        startDate,
      ) ||
      !isValidDate(
        endDate,
      )
    ) {
      return "Les dates de validité sont invalides.";
    }

    const start =
      new Date(
        `${startDate}T00:00:00`,
      );

    const end =
      new Date(
        `${endDate}T00:00:00`,
      );

    if (
      end.getTime() <
      start.getTime()
    ) {
      return "La date de fin doit être postérieure à la date de début.";
    }

    return null;
  }

  async function uploadPolicies() {
    clearMessages();

    /*
     * ============================
     * VALIDATION DES DATES
     * ============================
     */

    const dateError =
      validateDates();

    if (
      dateError
    ) {
      setErrorMessage(
        dateError,
      );

      return;
    }

    /*
     * ============================
     * VALIDATION DES POLICES
     * ============================
     */

    const year1IsAvailable =
      Boolean(
        year1File,
      ) ||
      year1AlreadyExists;

    const year2IsAvailable =
      Boolean(
        year2File,
      ) ||
      year2AlreadyExists;

    if (
      !year1IsAvailable
    ) {
      setErrorMessage(
        "La police de l’année 1 est obligatoire.",
      );

      return;
    }

    if (
      requiresTwoPolicies &&
      !year2IsAvailable
    ) {
      setErrorMessage(
        "La police de l’année 2 est obligatoire pour une assurance de deux ans.",
      );

      return;
    }

    /*
     * On autorise aussi la sauvegarde
     * uniquement des dates,
     * même sans nouveau PDF.
     */

    const datesChanged =
      startDate !==
        (
          policyStartDate ??
          ""
        ) ||
      endDate !==
        (
          policyEndDate ??
          ""
        );

    const hasNewFile =
      Boolean(
        year1File ||
        year2File,
      );

    if (
      !hasNewFile &&
      !datesChanged
    ) {
      setErrorMessage(
        "Aucune modification à enregistrer.",
      );

      return;
    }

    setLoading(
      true,
    );

    try {
      const formData =
        new FormData();

      /*
       * Durée.
       */

      formData.append(
        "insuranceDurationYears",
        String(
          insuranceDurationYears,
        ),
      );

      /*
       * Dates réelles de la police.
       */

      formData.append(
        "policyStartDate",
        startDate,
      );

      formData.append(
        "policyEndDate",
        endDate,
      );

      /*
       * PDF.
       */

      if (
        year1File
      ) {
        formData.append(
          "policyYear1File",
          year1File,
        );
      }

      if (
        requiresTwoPolicies &&
        year2File
      ) {
        formData.append(
          "policyYear2File",
          year2File,
        );
      }

      const response =
        await fetch(
          `/api/admin/requests/${requestId}/policy`,
          {
            method:
              "POST",

            body:
              formData,
          },
        );

      const contentType =
        response.headers.get(
          "content-type",
        ) ??
        "";

      if (
        !contentType.includes(
          "application/json",
        )
      ) {
        const responseText =
          await response.text();

        console.error(
          "Réponse non JSON reçue :",
          response.status,
          responseText,
        );

        throw new Error(
          `La route de téléversement a renvoyé une erreur (${response.status}).`,
        );
      }

      const result =
        (await response.json()) as {
          success?:
            boolean;

          completed?:
            boolean;

          status?:
            string;

          uploadedYears?:
            number[];

          existingYears?:
            number[];

          policyStartDate?:
            string;

          policyEndDate?:
            string;

          error?:
            string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Impossible d’enregistrer les informations de la police.",
        );
      }

      /*
       * Nettoyage des inputs.
       */

      setYear1File(
        null,
      );

      setYear2File(
        null,
      );

      if (
        year1InputRef.current
      ) {
        year1InputRef.current.value =
          "";
      }

      if (
        year2InputRef.current
      ) {
        year2InputRef.current.value =
          "";
      }

      /*
       * Message succès.
       */

      if (
        result.completed
      ) {
        setSuccessMessage(
          requiresTwoPolicies
            ? "Les polices et leurs dates de validité ont été enregistrées. L’assurance est maintenant disponible pour le client."
            : "La police et ses dates de validité ont été enregistrées. L’assurance est maintenant disponible pour le client.",
        );
      } else {
        setSuccessMessage(
          "Les informations ont été enregistrées avec succès.",
        );
      }

      router.refresh();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof
        Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      {/* TITRE */}

      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Polices d’assurance
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Déposez la police définitive. Les dates de validité sont préremplies automatiquement à partir des informations du dossier.
        </p>
      </div>

      {/* DATES */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div>
          <h3 className="font-bold text-slate-900">
            Période de validité
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Ces dates seront utilisées pour gérer automatiquement les futurs renouvellements.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Date de début
            </span>

            <span className="ml-1 text-red-500">
              *
            </span>

            <input
              type="date"
              value={
                startDate
              }
              onChange={(
                event,
              ) => {
                const nextStartDate =
                  event.target.value;

                setStartDate(
                  nextStartDate,
                );

                setEndDate(
                  addYearsKeepingMonthAndDay(
                    nextStartDate,
                    insuranceDurationYears,
                  ),
                );

                clearMessages();
              }}
              disabled={
                loading
              }
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              {hasKimlik
                ? "Remplie automatiquement avec la date d’expiration du Kimlik."
                : "Remplie automatiquement avec la date de début souhaitée par le client."}
            </p>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Date de fin
            </span>

            <span className="ml-1 text-red-500">
              *
            </span>

            <input
              type="date"
              value={
                endDate
              }
              min={
                startDate ||
                undefined
              }
              onChange={(
                event,
              ) => {
                setEndDate(
                  event.target.value,
                );

                clearMessages();
              }}
              disabled={
                loading
              }
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#2F2963] focus:ring-4 focus:ring-[#2F2963]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Calculée automatiquement en ajoutant{" "}
              {insuranceDurationYears} an
              {insuranceDurationYears === 2
                ? "s"
                : ""}{" "}
              à la date de début, en conservant le jour et le mois.
            </p>
          </label>
        </div>

        {policyStartDate &&
          policyEndDate && (
          <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            ✓ Une période de validité est déjà enregistrée. Vous pouvez la corriger si nécessaire.
          </div>
        )}
      </div>

      {/* INFORMATION POLICES */}

      <div className="mt-6">
        <p className="text-sm leading-6 text-slate-600">
          {requiresTwoPolicies
            ? "Cette demande couvre deux ans. Les PDF des années 1 et 2 doivent être présents avant que l’assurance devienne disponible."
            : "Cette demande couvre un an. Déposez la police définitive au format PDF."}
        </p>
      </div>

      {allRequiredExistingPoliciesArePresent && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-800">
            ✓ Toutes les polices requises sont déjà enregistrées.
          </p>

          <p className="mt-2 text-sm leading-6 text-green-700">
            Vous pouvez modifier uniquement les dates ou remplacer un PDF existant.
          </p>
        </div>
      )}

      {/* PDF */}

      <div className="mt-6 space-y-6">
        <PolicyFileField
          year={
            1
          }
          file={
            year1File
          }
          inputRef={
            year1InputRef
          }
          isDragging={
            draggingYear ===
            1
          }
          alreadyExists={
            year1AlreadyExists
          }
          loading={
            loading
          }
          onFileChange={(
            event,
          ) =>
            handleFileChange(
              1,
              event,
            )
          }
          onDragOver={(
            event,
          ) =>
            handleDragOver(
              1,
              event,
            )
          }
          onDragLeave={
            handleDragLeave
          }
          onDrop={(
            event,
          ) =>
            handleDrop(
              1,
              event,
            )
          }
          onRemove={() =>
            removeFile(
              1,
            )
          }
        />

        {requiresTwoPolicies && (
          <PolicyFileField
            year={
              2
            }
            file={
              year2File
            }
            inputRef={
              year2InputRef
            }
            isDragging={
              draggingYear ===
              2
            }
            alreadyExists={
              year2AlreadyExists
            }
            loading={
              loading
            }
            onFileChange={(
              event,
            ) =>
              handleFileChange(
                2,
                event,
              )
            }
            onDragOver={(
              event,
            ) =>
              handleDragOver(
                2,
                event,
              )
            }
            onDragLeave={
              handleDragLeave
            }
            onDrop={(
              event,
            ) =>
              handleDrop(
                2,
                event,
              )
            }
            onRemove={() =>
              removeFile(
                2,
              )
            }
          />
        )}
      </div>

      {/* ERREUR */}

      {errorMessage && (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {
            errorMessage
          }
        </div>
      )}

      {/* SUCCÈS */}

      {successMessage && (
        <div className="mt-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
          {
            successMessage
          }
        </div>
      )}

      {/* BOUTON */}

      <button
        type="button"
        onClick={
          uploadPolicies
        }
        disabled={
          loading
        }
        className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading
          ? "Enregistrement en cours..."
          : allRequiredExistingPoliciesArePresent
            ? "Enregistrer les modifications"
            : requiresTwoPolicies
              ? "Enregistrer les polices"
              : "Enregistrer la police"}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-slate-400">
        Les dates sont calculées automatiquement, mais peuvent être corrigées si la police définitive indique une période différente.
      </p>
    </section>
  );
}

type PolicyFileFieldProps = {
  year:
    PolicyYear;

  file:
    File | null;

  inputRef:
    React.RefObject<HTMLInputElement | null>;

  isDragging:
    boolean;

  alreadyExists:
    boolean;

  loading:
    boolean;

  onFileChange: (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => void;

  onDragOver: (
    event:
      DragEvent<HTMLDivElement>,
  ) => void;

  onDragLeave: (
    event:
      DragEvent<HTMLDivElement>,
  ) => void;

  onDrop: (
    event:
      DragEvent<HTMLDivElement>,
  ) => void;

  onRemove:
    () => void;
};

function PolicyFileField({
  year,
  file,
  inputRef,
  isDragging,
  alreadyExists,
  loading,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
}: PolicyFileFieldProps) {
  return (
    <article className="rounded-2xl border border-slate-200 p-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Police — Année{" "}
          {
            year
          }
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          {alreadyExists
            ? "Un PDF est déjà enregistré. Sélectionnez un nouveau fichier uniquement si vous souhaitez le remplacer."
            : "Aucun PDF n’est encore enregistré pour cette année."}
        </p>
      </div>

      {alreadyExists && (
        <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          ✓ PDF année{" "}
          {
            year
          }{" "}
          enregistré
        </div>
      )}

      {!file ? (
        <div
          role="button"
          tabIndex={
            0
          }
          onClick={() => {
            if (
              !loading
            ) {
              inputRef.current?.click();
            }
          }}
          onKeyDown={(
            event,
          ) => {
            if (
              loading
            ) {
              return;
            }

            if (
              event.key ===
                "Enter" ||
              event.key ===
                " "
            ) {
              event.preventDefault();

              inputRef.current?.click();
            }
          }}
          onDragOver={
            onDragOver
          }
          onDragLeave={
            onDragLeave
          }
          onDrop={
            onDrop
          }
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
            isDragging
              ? "border-blue-700 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-blue-600 hover:bg-blue-50"
          } ${
            loading
              ? "cursor-not-allowed opacity-60"
              : ""
          }`}
        >
          <span className="text-4xl">
            📄
          </span>

          <p className="mt-3 font-semibold text-blue-700">
            {alreadyExists
              ? `Remplacer le PDF année ${year}`
              : `Choisir le PDF année ${year}`}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            ou glissez-déposez le fichier ici
          </p>

          <p className="mt-3 text-xs text-slate-500">
            PDF uniquement — 10 Mo maximum
          </p>

          <input
            ref={
              inputRef
            }
            type="file"
            accept=".pdf,application/pdf"
            onChange={
              onFileChange
            }
            disabled={
              loading
            }
            className="hidden"
          />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-green-800">
                ✓ Nouveau PDF sélectionné
              </p>

              <p className="mt-1 truncate text-sm font-medium text-slate-800">
                {
                  file.name
                }
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatFileSize(
                  file.size,
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={
                onRemove
              }
              disabled={
                loading
              }
              className="shrink-0 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retirer
            </button>
          </div>
        </div>
      )}
    </article>
  );
}