"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type ClientNote = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  userId:
    | string
    | null;
};

type ClientNotesProps = {
  clientId: string;
  notes: ClientNote[];
  currentUserId: string;
  role:
    | "admin"
    | "agent";
};

export default function ClientNotes({
  clientId,
  notes,
  currentUserId,
  role,
}: ClientNotesProps) {
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
    error,
    setError,
  ] =
    useState("");

  const [
    editingNoteId,
    setEditingNoteId,
  ] =
    useState<
      string | null
    >(null);

  const [
    editingContent,
    setEditingContent,
  ] =
    useState("");

  const [
    actionLoadingId,
    setActionLoadingId,
  ] =
    useState<
      string | null
    >(null);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value =
      content.trim();

    if (!value) {
      setError(
        "Écrivez une note avant de l’enregistrer.",
      );

      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/clients/${clientId}/notes`,
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
                  value,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ??
            "Impossible d’enregistrer la note.",
        );
      }

      setContent("");

      router.refresh();
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
        Error
          ? submitError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  function startEditing(
    note: ClientNote,
  ) {
    setEditingNoteId(
      note.id,
    );

    setEditingContent(
      note.content,
    );

    setError("");
  }

  function cancelEditing() {
    setEditingNoteId(
      null,
    );

    setEditingContent(
      "",
    );
  }

  async function saveEdit(
    noteId: string,
  ) {
    const value =
      editingContent.trim();

    if (!value) {
      setError(
        "La note ne peut pas être vide.",
      );

      return;
    }

    setActionLoadingId(
      noteId,
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/clients/${clientId}/notes/${noteId}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                content:
                  value,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ??
            "Impossible de modifier la note.",
        );
      }

      setEditingNoteId(
        null,
      );

      setEditingContent(
        "",
      );

      router.refresh();
    } catch (
      editError
    ) {
      setError(
        editError instanceof
        Error
          ? editError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setActionLoadingId(
        null,
      );
    }
  }

  async function deleteNote(
    noteId: string,
  ) {
    const confirmed =
      window.confirm(
        "Supprimer cette note ? Cette action est définitive.",
      );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(
      noteId,
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/clients/${clientId}/notes/${noteId}`,
          {
            method:
              "DELETE",
          },
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ??
            "Impossible de supprimer la note.",
        );
      }

      router.refresh();
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof
        Error
          ? deleteError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setActionLoadingId(
        null,
      );
    }
  }

  function canManageNote(
    note:
      ClientNote,
  ) {
    if (
      role ===
      "admin"
    ) {
      return true;
    }

    return (
      note.userId ===
      currentUserId
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B5D3B]">
          CRM
        </p>

        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#102B20]">
          Notes client
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Informations internes utiles pour le suivi de ce client.
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-5"
      >
        <textarea
          value={
            content
          }
          onChange={(
            event,
          ) =>
            setContent(
              event.target.value,
            )
          }
          placeholder="Ex. Préfère être contacté sur WhatsApp après 18 h..."
          rows={
            4
          }
          maxLength={
            3000
          }
          className="w-full resize-y rounded-xl border border-slate-200 bg-[#FAFCFA] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0B5D3B] focus:bg-white focus:ring-4 focus:ring-[#0B5D3B]/10"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {
              content.length
            }
            /3000
          </p>

          <button
            type="submit"
            disabled={
              loading
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0B5D3B] px-5 text-sm font-black text-white transition hover:bg-[#084A2F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Enregistrement..."
              : "Ajouter la note"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {
            error
          }
        </div>
      )}

      <div className="mt-6 border-t border-slate-100 pt-6">
        {notes.length ===
        0 ? (
          <div className="rounded-2xl border border-slate-100 bg-[#FAFCFA] p-5 text-sm text-slate-500">
            Aucune note enregistrée pour ce client.
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map(
              (
                note,
              ) => {
                const editing =
                  editingNoteId ===
                  note.id;

                const canManage =
                  canManageNote(
                    note,
                  );

                const busy =
                  actionLoadingId ===
                  note.id;

                return (
                  <article
                    key={
                      note.id
                    }
                    className="rounded-2xl border border-slate-100 bg-[#FAFCFA] p-4"
                  >
                    {editing ? (
                      <>
                        <textarea
                          value={
                            editingContent
                          }
                          onChange={(
                            event,
                          ) =>
                            setEditingContent(
                              event.target.value,
                            )
                          }
                          rows={
                            4
                          }
                          maxLength={
                            3000
                          }
                          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#0B5D3B]/10"
                        />

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs text-slate-400">
                            {
                              editingContent.length
                            }
                            /3000
                          </span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={
                                busy
                              }
                              onClick={
                                cancelEditing
                              }
                              className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              Annuler
                            </button>

                            <button
                              type="button"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                saveEdit(
                                  note.id,
                                )
                              }
                              className="min-h-9 rounded-lg bg-[#0B5D3B] px-3 text-xs font-bold text-white transition hover:bg-[#084A2F] disabled:opacity-50"
                            >
                              {busy
                                ? "Enregistrement..."
                                : "Enregistrer"}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {
                            note.content
                          }
                        </p>

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span>
                              {
                                note.authorName
                              }
                            </span>

                            <span>
                              {
                                note.createdAt
                              }
                            </span>
                          </div>

                          {canManage && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  startEditing(
                                    note,
                                  )
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                Modifier
                              </button>

                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  deleteNote(
                                    note.id,
                                  )
                                }
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                {busy
                                  ? "..."
                                  : "Supprimer"}
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                );
              },
            )}
          </div>
        )}
      </div>
    </section>
  );
}