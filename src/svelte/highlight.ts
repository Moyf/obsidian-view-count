/**
 * Escape HTML special characters in a string so it can be safely inserted
 * via {@html} in Svelte.
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Wrap every case-insensitive occurrence of `query` inside `text` with
 * `<span class="search-result-file-matched-text">…</span>` (Obsidian's native
 * matched-text styling).
 *
 * Returns `null` when there is nothing to highlight (empty/whitespace query,
 * or no match). Callers should fall back to plain text rendering in that case
 * so the default Svelte escaping still applies.
 *
 * The surrounding text is HTML-escaped, so this is safe to use with values
 * sourced from filenames or frontmatter.
 */
export function highlightMatchHtml(text: string, query: string): string | null {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return null;
	}

	const lowerText = text.toLowerCase();
	const lowerQuery = trimmedQuery.toLowerCase();
	if (!lowerText.includes(lowerQuery)) {
		return null;
	}

	const queryLength = trimmedQuery.length;
	let result = "";
	let i = 0;

	while (i < text.length) {
		const found = lowerText.indexOf(lowerQuery, i);
		if (found === -1) {
			result += escapeHtml(text.slice(i));
			break;
		}
		result += escapeHtml(text.slice(i, found));
		result += `<span class="search-result-file-matched-text">${escapeHtml(
			text.slice(found, found + queryLength),
		)}</span>`;
		i = found + queryLength;
	}

	return result;
}
