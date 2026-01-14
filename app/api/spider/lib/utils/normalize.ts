
export function normalizeString(s: string): string {
    if (!s) return "";

    let normalized = s.normalize('NFKC');

    normalized = normalized.toLowerCase();


    let res = "";
    for (const char of normalized) {
        if (char !== " ") {
            res += char;
        }
    }
    return res;
}

export function normalizeTitleStrict(str: string) {
    if (!str) return ''
    return str
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\s_`'"!@#$%^&*()\[\]{}|\\;:,.<>/?]+/g, '')
}
