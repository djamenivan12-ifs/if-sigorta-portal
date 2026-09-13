/** Page through a complete result without silently trusting the API row cap. */
export async function collectRows<T>(load: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: {
        message: string;
    } | null;
}>): Promise<{
    data: T[];
    error: {
        message: string;
    } | null;
}> {
    const rows: T[] = [];
    for (;;) {
        const { data, error } = await load(rows.length, rows.length + 249);
        if (error)
            return { data: [], error };
        if (!data?.length)
            return { data: rows, error: null };
        rows.push(...data);
    }
}
