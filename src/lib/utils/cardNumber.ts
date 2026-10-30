/**
 * A card of the printed numbering (D19): a number from 1 to the set's official count.
 * Anything else is a secret / special card: "205" in a set of 198, but also "TG01", "GG35"…
 */
export function isOfficialNumber(localId: string, officialCount: number): boolean {
	if (!/^\d+$/.test(localId)) return false;
	const number = Number(localId);
	return number >= 1 && number <= officialCount;
}
