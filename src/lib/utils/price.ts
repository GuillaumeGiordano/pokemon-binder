import type { CardVariant } from '$lib/records/card';

/**
 * The market price of a variant (D14): `trend`, or `trend-holo` for a reverse / holo copy.
 * Falls back to `trend` when the holo price is unknown (e.g. a card printed holo only).
 */
export function referencePrice(
	variant: CardVariant,
	price: { trend: number | null; trendHolo: number | null } | null
): number | null {
	if (!price) return null;
	if (variant === 'REVERSE' || variant === 'HOLO') return price.trendHolo ?? price.trend;
	return price.trend;
}

/** Rounded to the cent: sums of prices must not show floating-point noise (0.1 + 0.2). */
export const roundCents = (value: number) => Math.round(value * 100) / 100;

/** Value of lots (D23): quantity × unit market price; cards without a price are counted apart. */
export function valueOf(lots: { quantity: number; unitPrice: number | null }[]) {
	let value = 0;
	let unpricedCount = 0;
	for (const lot of lots) {
		if (lot.unitPrice === null) unpricedCount += lot.quantity;
		else value += lot.quantity * lot.unitPrice;
	}
	return { value: roundCents(value), unpricedCount };
}

/** How much `current` moved from `reference` (D17): amount and percentage. Null if unknown. */
export function priceChange(
	current: number | null,
	reference: number | null
): { amount: number; percent: number | null } | null {
	if (current === null || reference === null) return null;
	const amount = current - reference;
	return { amount, percent: reference === 0 ? null : (amount / reference) * 100 };
}

/** Form input "5,50" or "5.5" → "5.50"; empty → null; anything else → undefined (invalid). */
export function parseEuroInput(raw: string): string | null | undefined {
	const value = raw.trim().replace(',', '.');
	if (value === '') return null;
	if (!/^\d{1,6}(\.\d{1,2})?$/.test(value)) return undefined;
	return Number(value).toFixed(2);
}
