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
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(issueDate);
    const part=(name:string)=>parts.find(p=>p.type===name)!.value;
    const today=part("year")+"-"+part("month")+"-"+part("day");
    if (birthDate > today)
        return null;
    const age = Number(part("year")) - Number(birthDate.slice(0, 4));
    return age >= 0 && age <= 120 ? age : null;
}
