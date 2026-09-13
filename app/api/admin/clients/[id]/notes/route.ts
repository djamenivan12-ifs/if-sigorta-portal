import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/requireApiRole";
import { createServiceClient } from "@/lib/supabase/service";
export async function POST(request: Request, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    const auth = await requireApiRole(["admin", "agent"]);
    if (!auth.success)
        return auth.response;
    const headers = { "Cache-Control": "no-store" };
    const body = await request.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content || content.length > 3000)
        return NextResponse.json({ success: false, error: "La note doit contenir entre 1 et 3 000 caractères." }, { status: 400, headers });
    const { id } = await context.params;
    const db = createServiceClient();
    try {
        let access = db.from("insurance_requests").select("id").eq("client_id", id);
        if (auth.role === "agent")
            access = access.or("assigned_agent_id.is.null,assigned_agent_id.eq." + auth.user.id);
        const { data: requests, error: accessError } = await access.limit(1);
        if (accessError)
            throw accessError;
        if (!requests?.length)
            return NextResponse.json({ success: false, error: "Client introuvable ou inaccessible." }, { status: 404, headers });
        const { data: note, error } = await db.from("client_notes").insert({ client_id: id, user_id: auth.user.id, content }).select("id,client_id,user_id,content,created_at,updated_at").single();
        if (error)
            throw error;
        return NextResponse.json({ success: true, note }, { status: 201, headers });
    }
    catch {
        return NextResponse.json({ success: false, error: "Impossible d’enregistrer la note." }, { status: 500, headers });
    }
}
