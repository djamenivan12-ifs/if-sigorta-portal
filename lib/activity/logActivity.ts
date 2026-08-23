import { createServiceClient } from "@/lib/supabase/service";

type LogActivityInput = {
  requestId: string;
  userId?: string | null;
  action: string;
  description?: string;
};

export async function logActivity({
  requestId,
  userId,
  action,
  description,
}: LogActivityInput) {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("activity_logs")
    .insert({
      request_id: requestId,
      user_id: userId ?? null,
      action,
      description: description ?? null,
    });

  if (error) {
    console.error(
      "Erreur lors de l'enregistrement de l'activité :",
      error,
    );
  }
}