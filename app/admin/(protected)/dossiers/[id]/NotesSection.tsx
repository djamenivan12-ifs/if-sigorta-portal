"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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

  const [content, setContent] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

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
            method: "POST",

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
    } catch (error) {
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
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        Notes internes
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Ces notes sont visibles uniquement par les agents et administrateurs.
      </p>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-6"
      >
        <label
          htmlFor="internal-note"
          className="mb-2 block text-sm font-semibold text-slate-800"
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
          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {content.length} / 2000
          </p>

          <button
            type="submit"
            disabled={
              loading ||
              !content.trim()
            }
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading
              ? "Ajout en cours..."
              : "Ajouter la note"}
          </button>
        </div>
      </form>

      {errorMessage && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">
            Notes enregistrées
          </h3>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {notes.length}
          </span>
        </div>

        {notes.length ===
        0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Aucune note interne pour ce dossier.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {notes.map(
              (note) => (
                <article
                  key={
                    note.id
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {
                      note.content
                    }
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                    <p className="text-xs font-semibold text-slate-600">
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