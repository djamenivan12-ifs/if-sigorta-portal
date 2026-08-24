"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type RequestNote = {
  id: string;
  content: string;
  created_at: string;
  author?: string | null;
};

type NotesSectionProps = {
  requestId: string;
  notes: RequestNote[];
};

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export default function NotesSection({
  requestId,
  notes,
}: NotesSectionProps) {
  const router =
    useRouter();

  const [
    content,
    setContent,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedContent =
      content.trim();

    if (!trimmedContent) {
      setErrorMessage(
        "Écrivez une note avant de l’ajouter.",
      );

      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/requests/${requestId}/notes`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                content:
                  trimmedContent,
              }),
          },
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Impossible d’ajouter la note.",
        );
      }

      setContent("");

      setSuccessMessage(
        "Note ajoutée avec succès.",
      );

      router.refresh();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
          Collaboration
        </p>

        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
          Notes internes
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Ces notes sont visibles uniquement par les agents et administrateurs.
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-6"
      >
        <label
          htmlFor="internal-note"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Ajouter une note
        </label>

        <textarea
          id="internal-note"
          value={content}
          onChange={(
            event,
          ) =>
            setContent(
              event.target.value,
            )
          }
          maxLength={2000}
          rows={5}
          placeholder="Ex. : Client rappelé, en attente d’un nouveau passeport..."
          className="w-full resize-y rounded-2xl border border-slate-200 bg-[#FAFCFA] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:bg-white focus:ring-4 focus:ring-[#0B5D3B]/10"
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            {content.length} / 2000
          </p>

          <button
            type="submit"
            disabled={
              loading ||
              !content.trim()
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading
              ? "Ajout en cours..."
              : "Ajouter la note"}
          </button>
        </div>
      </form>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="mt-8 border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#102B20]">
            Notes enregistrées
          </h3>

          <span className="rounded-full bg-[#EEF6EC] px-2.5 py-1 text-xs font-black text-[#0B5D3B]">
            {notes.length}
          </span>
        </div>

        {notes.length ===
        0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm text-slate-500">
              Aucune note interne pour ce dossier.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {notes.map(
              (note) => (
                <article
                  key={
                    note.id
                  }
                  className="rounded-2xl border border-slate-100 bg-[#FAFCFA] p-4"
                >
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {
                      note.content
                    }
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-[#31513B]">
                      {note.author ||
                        "Utilisateur"}
                    </p>

                    <p className="text-xs text-slate-400">
                      {formatDate(
                        note.created_at,
                      )}
                    </p>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}