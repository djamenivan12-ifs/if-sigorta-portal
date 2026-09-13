import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "./service";
export async function listAllUsers(db: ReturnType<typeof createServiceClient>): Promise<{
    data: {
        users: User[];
    };
    error: Error | null;
}> {
    const users: User[] = [];
    for (let page = 1;; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
        if (error)
            return { data: { users: [] }, error };
        users.push(...data.users);
        if (data.users.length < 200)
            return { data: { users }, error: null };
    }
}
