export function isCongoBrazzaville(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const name = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return [
    "cg",
    "cog",
    "congo",
    "congo-brazzaville",
    "congo brazzaville",
    "republique du congo",
    "republic of the congo",
    "congolaise (congo-brazzaville)",
  ].includes(name);
}

export function isSkyline(value: string): boolean {
  return ["skyline", "skyline sigorta"].includes(value.trim().toLowerCase());
}
