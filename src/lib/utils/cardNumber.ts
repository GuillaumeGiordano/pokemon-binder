/**
 * The printed number in text read from a card photo (OCR): "025/198" from "...Lv 025 / 198 •".
 * A "number/total" pair is required: a lone number could be the HP or an attack's damage.
 * Null when nothing plausible is found.
 */
export function parseCardNumber(text: string): string | null {
	for (const match of text.matchAll(/(\d{1,3})\s*\/\s*(\d{2,3})/g)) {
		const number = Number(match[1]);
		const total = Number(match[2]);
		// Secret cards go beyond the total (e.g. 205/198), but not by hundreds.
		if (number >= 1 && total >= 1 && number <= total + 150) return `${match[1]}/${match[2]}`;
	}
	return null;
}

/**
 * A card of the printed numbering (D19): a number from 1 to the set's official count.
 * Anything else is a secret / special card: "205" in a set of 198, but also "TG01", "GG35"…
 */
export function isOfficialNumber(localId: string, officialCount: number): boolean {
	if (!/^\d+$/.test(localId)) return false;
	const number = Number(localId);
	return number >= 1 && number <= officialCount;
}
