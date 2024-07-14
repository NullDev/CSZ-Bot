export interface SplitOptions {
    charLimitPerChunk?: number;
    chunkOpeningLine?: string;
    chunkClosingLine?: string;
}
export function splitInChunks(
    lines: readonly string[],
    { charLimitPerChunk = 2000, chunkOpeningLine, chunkClosingLine }: SplitOptions,
): string[] {
    const open = chunkOpeningLine ?? "";
    const close = chunkClosingLine ?? "";
    // we need + 1 for line ending if there is an opening
    const chunkOverhead =
        (open.length ? open.length + 1 : 0) + (close.length ? close.length + 1 : 0);

    let currentChunk = open ? [open] : [];
    let charsInChunk = currentChunk.length;
    const chunks = [currentChunk];

    for (const line of lines) {
        const appendedChars = line.length + 1; // + 1 for line ending
        if (charsInChunk + appendedChars + chunkOverhead > charLimitPerChunk) {
            if (charsInChunk === 0) {
                throw new Error(
                    "Tried to create new chunk with line that is too long. Increase `charLimitPerChunk` or fix the line.",
                );
            }

            if (close) {
                currentChunk.push(close);
            }

            charsInChunk = 0;
            currentChunk = open ? [open] : [];
            chunks.push(currentChunk);
        }
        currentChunk.push(line);
        charsInChunk += appendedChars + chunkOverhead;
    }

    return chunks.map(chunk => chunk.join("\n"));
}
