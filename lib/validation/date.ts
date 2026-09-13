/** Strict calendar dates, without changing the insurer's year-based age rule. */
export function isValidDate(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const date = new Date(value + "T00:00:00.000Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function calculateInsuranceAge(birthDate: string, issueDate = new Date()): number | null {
    if (!isValidDate(birthDate) || !Number.isFinite(issueDate.getTime()))
        return null;
    const today = [issueDate.getFullYear(), String(issueDate.getMonth() + 1).padStart(2, "0"), String(issueDate.getDate()).padStart(2, "0")].join("-");
    if (birthDate > today)
        return null;
    const age = issueDate.getFullYear() - Number(birthDate.slice(0, 4));
    return age >= 0 && age <= 120 ? age : null;
}
