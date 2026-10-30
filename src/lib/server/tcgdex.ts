// TCGdex REST client (D3, D13) — French data, Cardmarket prices in EUR.
// Docs: https://tcgdex.dev/rest — filters are partial and case-insensitive by default,
// `eq:` is exact, `|` separates several values.

const API_URL = 'https://api.tcgdex.net/v2';
const TIMEOUT_MS = 8000;
/** The full English card list is bigger: give it more time. */
const LIST_TIMEOUT_MS = 30000;

/** TCGdex is unreachable or answered with an error. */
export class TcgdexError extends Error {}

export type TcgdexCardBrief = {
	id: string;
	localId: string;
	name: string;
	/** Base URL: append `/low.webp` or `/high.webp`. Missing for some cards. */
	image?: string;
};

export type TcgdexSetBrief = {
	id: string;
	name: string;
	logo?: string;
	symbol?: string;
	cardCount: { official: number; total: number };
};

export type TcgdexCardmarketPricing = {
	updated: string;
	unit: string;
	avg?: number | null;
	low?: number | null;
	trend?: number | null;
	'trend-holo'?: number | null;
};

export type TcgdexCard = TcgdexCardBrief & {
	rarity?: string;
	set: TcgdexSetBrief;
	variants?: { normal?: boolean; reverse?: boolean; holo?: boolean; firstEdition?: boolean };
	thirdParty?: { cardmarket?: number | null };
	pricing?: { cardmarket?: TcgdexCardmarketPricing | null };
};

async function get<T>(path: string, { lang = 'fr', timeoutMs = TIMEOUT_MS } = {}): Promise<T | null> {
	let response: Response;
	try {
		response = await fetch(`${API_URL}/${lang}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
	} catch (err) {
		throw new TcgdexError(`TCGdex unreachable: ${(err as Error).message}`);
	}
	// A real "not found" from the API is JSON; when the API is down, its host answers a plain-text
	// 404 page — that one is an outage, not an unknown card.
	const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
	if (response.status === 404 && isJson) return null;
	if (!response.ok || !isJson) throw new TcgdexError(`TCGdex answered ${response.status} on ${path}`);
	return (await response.json()) as T;
}

export const cardImage = (base: string | undefined, quality: 'low' | 'high') =>
	base ? `${base}/${quality}.webp` : null;

// Verified on the live API (2026-10-30): cards have no `releaseDate`, so `sort:field=releaseDate`
// is ignored on /cards; and `localId=eq:025` finds nothing (compared as the number 25). The search
// therefore fetches every match and sorts / filters / paginates on our side.

/** Every card whose name contains `name` (case-insensitive), unsorted. */
export async function searchCardsByName(name: string): Promise<TcgdexCardBrief[]> {
	return (await get<TcgdexCardBrief[]>(`/cards?${new URLSearchParams({ name })}`)) ?? [];
}

/** Every card whose number CONTAINS `digits` ("25" → 25, 025, 125, 250…): filter exactly afterwards. */
export async function searchCardsByNumberContaining(digits: string): Promise<TcgdexCardBrief[]> {
	return (await get<TcgdexCardBrief[]>(`/cards?${new URLSearchParams({ localId: digits })}`)) ?? [];
}

export const getCard = (id: string) => get<TcgdexCard>(`/cards/${encodeURIComponent(id)}`);

export type TcgdexSet = TcgdexSetBrief & { cards: TcgdexCardBrief[] };

/** A set with all its cards. Null: unknown set. */
export const getSet = (id: string) => get<TcgdexSet>(`/sets/${encodeURIComponent(id)}`);

/** Every set, oldest first (TCGdex's default order is the release date). */
export async function listSets(): Promise<TcgdexSetBrief[]> {
	return (await get<TcgdexSetBrief[]>('/sets')) ?? [];
}

/**
 * Every English card (id → image), for the French cards TCGdex has no image for: same card id,
 * same artwork. Measured 2026-10-30: 3 856 / 22 201 French cards without image, 2 186 of them
 * with an English one. One call (~2 MB) instead of one per card.
 */
export async function listEnglishCards(): Promise<TcgdexCardBrief[]> {
	return (await get<TcgdexCardBrief[]>('/cards', { lang: 'en', timeoutMs: LIST_TIMEOUT_MS })) ?? [];
}
