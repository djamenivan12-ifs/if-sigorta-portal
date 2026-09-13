export function hasOverlappingRanges(ranges: ReadonlyArray<{
    minimumAge: number;
    maximumAge: number;
    isActive: boolean;
}>): boolean {
    const sorted = ranges.filter(r => r.isActive).slice().sort((a, b) => a.minimumAge - b.minimumAge);
    return sorted.some((range, index) => index > 0 && range.minimumAge <= sorted[index - 1].maximumAge);
}
