export function detectDocumentType(bytes: Uint8Array): string | null {
    if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-")
        return "application/pdf";
    if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b))
        return "image/png";
    if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
        return "image/jpeg";
    return null;
}
