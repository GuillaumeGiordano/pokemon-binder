import type { CardVariant } from '$lib/records/card';

/** A card in the search results. */
export type CardSearchResultVM = {
	id: string;
	name: string;
	localId: string;
	imageUrl: string | null;
	/** Null when the set is not known (sets list unavailable). */
	set: { name: string; officialCount: number; logoUrl: string | null } | null;
};

export type CardSearchVM = {
	query: string;
	page: number;
	results: CardSearchResultVM[];
	hasNextPage: boolean;
	/** TCGdex unavailable: results could not be loaded. */
	unavailable: boolean;
};

/** A card's detail page. */
export type CardDetailVM = {
	id: string;
	name: string;
	localId: string;
	imageUrl: string | null;
	rarity: string | null;
	set: { id: string; name: string; officialCount: number; logoUrl: string | null };
	variants: CardVariant[];
	/** Latest Cardmarket prices, in EUR (D14: `trend` is the reference). */
	price: { trend: number | null; trendHolo: number | null; date: string } | null;
	/** Served from the cache because TCGdex is unavailable. */
	stale: boolean;
};
