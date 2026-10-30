// TCGdex REST client (D3, D13) — French data, Cardmarket prices in EUR.
// Docs: https://tcgdex.dev/rest — filters are partial and case-insensitive by default,
// `eq:` is exact, `|` separates several values.

const BASE_URL = 'https://api.tcgdex.net/v2/fr';
const TIMEOUT_MS = 8000;

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

async function get<T>(path: string): Promise<T | null> {
	let response: Response;
	try {
		response = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
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

/** Cards whose name contains `name`, newest sets first. */
export async function searchCardsByName(name: string, page: number, perPage: number): Promise<TcgdexCardBrief[]> {
	const params = new URLSearchParams({
		name,
		'sort:field': 'releaseDate',
		'sort:order': 'DESC',
		'pagination:page': String(page),
		'pagination:itemsPerPage': String(perPage)
	});
	return (await get<TcgdexCardBrief[]>(`/cards?${params}`)) ?? [];
}

/** Cards with one of these exact numbers in their set (e.g. "025" or "25"), newest sets first. */
export async function searchCardsByNumber(localIds: string[], page: number, perPage: number): Promise<TcgdexCardBrief[]> {
	const params = new URLSearchParams({
		localId: `eq:${localIds.join('|')}`,
		'sort:field': 'releaseDate',
		'sort:order': 'DESC',
		'pagination:page': String(page),
		'pagination:itemsPerPage': String(perPage)
	});
	return (await get<TcgdexCardBrief[]>(`/cards?${params}`)) ?? [];
}

export const getCard = (id: string) => get<TcgdexCard>(`/cards/${encodeURIComponent(id)}`);

export async function listSets(): Promise<TcgdexSetBrief[]> {
	return (await get<TcgdexSetBrief[]>('/sets')) ?? [];
}
