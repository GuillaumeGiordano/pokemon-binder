import * as tcgdex from '$lib/server/tcgdex';
import { TcgdexError, type TcgdexCard, type TcgdexSetBrief } from '$lib/server/tcgdex';
import * as cardRepository from '$lib/server/repositories/cardRepository';
import { toCardDetailVM } from '$lib/server/mappers/cardMapper';
import type { CardVariant } from '$lib/records/card';
import type { CardDetailVM, CardSearchVM } from '$lib/viewmodels/card';

// Card search (live on TCGdex) and card details (local cache refreshed from TCGdex, D4).

const PER_PAGE = 30;
/** A cached card older than this is refreshed from TCGdex. */
const CARD_CACHE_TTL_MS = 24 * 3600 * 1000;
/** The sets list (names + counts for the search results) is kept in memory. */
const SETS_CACHE_TTL_MS = 24 * 3600 * 1000;

let setsCache: { at: number; byId: Map<string, TcgdexSetBrief> } | null = null;

async function setsById(): Promise<Map<string, TcgdexSetBrief>> {
	if (setsCache && Date.now() - setsCache.at < SETS_CACHE_TTL_MS) return setsCache.byId;
	const sets = await tcgdex.listSets();
	setsCache = { at: Date.now(), byId: new Map(sets.map((set) => [set.id, set])) };
	return setsCache.byId;
}

/** A card id is `<setId>-<localId>`. */
const setIdOf = (cardId: string, localId: string) => cardId.slice(0, cardId.length - localId.length - 1);

/** "25", "025" or "025/198" → the number in the set (and the printed total, if given). */
function parseNumberQuery(query: string): { localIds: string[]; official: number | null } | null {
	const match = /^(\d{1,3})\s*(?:\/\s*(\d{1,3}))?$/.exec(query);
	if (!match) return null;
	const number = String(Number(match[1]));
	return {
		localIds: [...new Set([number, number.padStart(3, '0')])],
		official: match[2] ? Number(match[2]) : null
	};
}

/** Search by name ("pikachu") or by number ("025", "025/198"). */
export async function searchCards(rawQuery: string, page: number): Promise<CardSearchVM> {
	const query = rawQuery.trim();
	const empty: CardSearchVM = { query, page, results: [], hasNextPage: false, unavailable: false };
	if (query.length < 2 && !/^\d+$/.test(query)) return empty;

	try {
		const byNumber = parseNumberQuery(query);
		const [cards, sets] = await Promise.all([
			byNumber
				? tcgdex.searchCardsByNumber(byNumber.localIds, page, PER_PAGE)
				: tcgdex.searchCardsByName(query, page, PER_PAGE),
			setsById().catch(() => new Map<string, TcgdexSetBrief>())
		]);

		const results = cards
			.map((card) => {
				const set = sets.get(setIdOf(card.id, card.localId));
				return {
					id: card.id,
					name: card.name,
					localId: card.localId,
					imageUrl: tcgdex.cardImage(card.image, 'low'),
					set: set ? { name: set.name, officialCount: set.cardCount.official } : null
				};
			})
			// "025/198": keep the sets with 198 printed cards (when the sets list is known).
			.filter((card) => !byNumber?.official || !card.set || card.set.officialCount === byNumber.official);

		return { query, page, results, hasNextPage: cards.length === PER_PAGE, unavailable: false };
	} catch (err) {
		if (!(err instanceof TcgdexError)) throw err;
		console.error('[pokemon-binder] card search failed', err.message);
		return { ...empty, unavailable: true };
	}
}

function variantsOf(card: TcgdexCard): CardVariant[] {
	const variants: CardVariant[] = [];
	if (card.variants?.normal) variants.push('NORMAL');
	if (card.variants?.reverse) variants.push('REVERSE');
	if (card.variants?.holo) variants.push('HOLO');
	if (card.variants?.firstEdition) variants.push('FIRST_EDITION');
	return variants;
}

/** Today, as a date without time (UTC), for the daily price snapshot. */
const today = () => new Date(new Date().toISOString().slice(0, 10));

async function syncCard(id: string): Promise<boolean> {
	const card = await tcgdex.getCard(id);
	if (!card) return false;
	const cardmarket = card.pricing?.cardmarket;
	await cardRepository.saveCard(
		{
			id: card.set.id,
			name: card.set.name,
			logoUrl: card.set.logo ? `${card.set.logo}.webp` : null,
			symbolUrl: card.set.symbol ? `${card.set.symbol}.webp` : null,
			officialCount: card.set.cardCount.official,
			totalCount: card.set.cardCount.total
		},
		{
			id: card.id,
			setId: card.set.id,
			localId: card.localId,
			name: card.name,
			imageUrl: tcgdex.cardImage(card.image, 'high'),
			rarity: card.rarity ?? null,
			variants: variantsOf(card),
			cardmarketId: card.thirdParty?.cardmarket ?? null
		},
		cardmarket
			? {
					trend: cardmarket.trend ?? null,
					trendHolo: cardmarket['trend-holo'] ?? null,
					low: cardmarket.low ?? null,
					avg: cardmarket.avg ?? null
				}
			: null,
		today()
	);
	return true;
}

/**
 * A card's details: from the cache when it is fresh, otherwise refreshed from TCGdex.
 * If TCGdex is down, a cached card is still served (marked stale). Null: unknown card.
 */
export async function getCardDetail(id: string): Promise<CardDetailVM | null> {
	const cached = await cardRepository.findCardWithLatestPrice(id);
	if (cached && Date.now() - cached.syncedAt.getTime() < CARD_CACHE_TTL_MS) return toCardDetailVM(cached, false);

	try {
		if (!(await syncCard(id))) return null;
	} catch (err) {
		if (!(err instanceof TcgdexError) || !cached) throw err;
		console.error('[pokemon-binder] card refresh failed, serving the cache', err.message);
		return toCardDetailVM(cached, true);
	}
	const fresh = await cardRepository.findCardWithLatestPrice(id);
	return fresh && toCardDetailVM(fresh, false);
}
