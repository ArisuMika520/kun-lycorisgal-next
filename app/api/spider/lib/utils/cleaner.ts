import striptags from 'striptags';

export function cleanText(text: string | null | undefined): string | null {
    if (!text) return null;

    let cleaned = striptags(text);

    cleaned = cleaned
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");

    cleaned = cleaned.replace(/\[url=.*?\](.*?)\[\/url\]/g, '$1');
    cleaned = cleaned.replace(/\[b\](.*?)\[\/b\]/g, '$1');
    cleaned = cleaned.replace(/\[i\](.*?)\[\/i\]/g, '$1');
    cleaned = cleaned.replace(/\[.*?\]/g, '');

    return cleaned.trim();
}

export function isJapanese(text: string): boolean {
    if (!text) return false;
    const kanaCount = (text.match(/[\u3040-\u30FF]/g) || []).length;
    const totalLength = text.length;

    return (kanaCount / totalLength) > 0.05;
}

export function isEnglish(text: string): boolean {
    if (!text) return false;
    const asciiCount = (text.match(/[a-zA-Z\s,.]/g) || []).length;
    return (asciiCount / text.length) > 0.8;
}
