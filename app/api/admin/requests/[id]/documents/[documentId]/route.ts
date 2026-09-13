import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
export async function GET(_request: Request, { params }: {
    params: Promise<{
        id: string;
        documentId: string;
    }>;
}) {
    const auth = await requireApiRole(["admin", "agent"]);
    if (!auth.success)
        return auth.response;
    const { id, documentId } = await params, db = createServiceClient();
    const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
    const { data: dossier, error } = await db.from("insurance_requests").select("assigned_agent_id").eq("id", id).maybeSingle();
    if (error)
        return NextResponse.json({ error: "Document temporairement indisponible." }, { status: 503, headers });
    if (!dossier || (auth.role === "agent" && dossier.assigned_agent_id && dossier.assigned_agent_id !== auth.user.id))
        return NextResponse.json({ error: "Document introuvable." }, { status: 404, headers });
    const { data: document, error: docError } = await db.from("uploaded_documents").select("storage_path").eq("id", documentId).eq("request_id", id).maybeSingle();
    if (docError || !document)
        return NextResponse.json({ error: "Document introuvable." }, { status: 404, headers });
    const { data: link, error: linkError } = await db.storage.from("insurance-documents").createSignedUrl(document.storage_path, 300);
    if (linkError || !link)
        return NextResponse.json({ error: "Document temporairement indisponible." }, { status: 503, headers });
    return NextResponse.redirect(link.signedUrl, { status: 302, headers });
}
