/** Apply mandatory role scope before optional user-supplied filters. */
export function applyRequestScope<T extends { or(value: string): T; eq(column: string, value: string): T; is(column: string, value: null): T }>(query: T, role: "admin" | "agent", userId: string, agent = ""): T {
  if (role === "agent") query = query.or("assigned_agent_id.is.null,assigned_agent_id.eq." + userId);
  if (agent === "me") return query.eq("assigned_agent_id", userId);
  if (agent === "unassigned") return query.is("assigned_agent_id", null);
  if (agent && role === "admin") return query.eq("assigned_agent_id", agent);
  return query;
}

/** An agent must still own the dossier when its conditional write commits. */
export function applyRequestMutationScope<T extends { eq(column: string, value: string): T }>(query: T, role: "admin" | "agent", userId: string): T {
  return role === "agent" ? query.eq("assigned_agent_id", userId) : query;
}
