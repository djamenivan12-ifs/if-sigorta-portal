import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { detectDocumentType } from "./fileSignature";
/** Validate storage metadata before downloading at most the accepted document size. */
export async function verifyStoredDocument(db: ReturnType<typeof createServiceClient>, bucket: string, path: string, pdfOnly = false) {
    const split = path.lastIndexOf("/");
    if (split < 1)
        throw new Error("Chemin de document invalide.");
    const name = path.slice(split + 1);
    const { data: entries, error } = await db.storage.from(bucket).list(path.slice(0, split), { search: name, limit: 100 });
    const entry = entries?.find(item => item.name === name);
    const size = Number(entry?.metadata?.size);
    if (error || !entry || !Number.isFinite(size) || size <= 0 || size > 10 * 1024 * 1024)
        throw new Error("Document introuvable, vide ou supérieur à 10 Mo.");
    const { data: file, error: downloadError } = await db.storage.from(bucket).download(path);
    if (downloadError || !file || file.size !== size)
        throw new Error("Impossible de vérifier le document.");
    const mime = detectDocumentType(new Uint8Array(await file.slice(0, 8).arrayBuffer()));
    if (!mime || (pdfOnly && mime !== "application/pdf"))
        throw new Error("Le contenu du fichier ne correspond pas à un document accepté.");
    return { mimeType: mime, fileSize: size };
}
