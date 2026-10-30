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
/** The sets list (names, counts, release order for the search results) is kept in memory. */
const SETS_CACHE_TTL_MS = 24 * 3600 * 1000;

type KnownSet = { set: TcgdexSetBrief; releaseRank: number };

let setsCache: { at: number; byId: Map<string, KnownSet> } | null = null;

/** Sets by id, with their rank in release order (0 = oldest), as TCGdex lists them. */
async function setsById(): Promise<Map<string, KnownSet>> {
	if (setsCache && Date.now() - setsCache.at < SETS_CACHE_TTL_MS) return setsCache.byId;
	const sets = await tcgdex.listSets();
	setsCache = { at: Date.now(), byId: new Map(sets.map((set, releaseRank) => [set.id, { set, releaseRank }])) };
	return setsCache.byId;
}

let englishImagesCache: { at: number; byId: Map<string, string> } | null = null;

/** English card images by card id (kept in memory like the sets list). Empty if unavailable. */
async function englishImages(): Promise<Map<string, string>> {
	if (englishImagesCache && Date.now() - englishImagesCache.at < SETS_CACHE_TTL_MS) return englishImagesCache.byId;
	try {
		const cards = await tcgdex.listEnglishCards();
		const byId = new Map(cards.flatMap((card) => (card.image ? [[card.id, card.image] as const] : [])));
		englishImagesCache = { at: Date.now(), byId };
		return byId;
	} catch (err) {
		if (!(err instanceof TcgdexError)) throw err;
		console.warn('[pokemon-binder] English images unavailable', err.message);
		return new Map();
	}
}

/** The card's image base: the French one, or the English one when TCGdex has none in French. */
async function imageBaseOf(card: { id: string; image?: string }): Promise<string | undefined> {
	return card.image ?? (await englishImages()).get(card.id);
}

/** A card id is `<setId>-<localId>`. */
const setIdOf = (cardId: string, localId: string) => cardId.slice(0, cardId.length - localId.length - 1);

/** "25", "025" or "025/198" → the number in the set (and the printed total, if given). */
function parseNumberQuery(query: string): { number: number; official: number | null } | null {
	const match = /^(\d{1,3})\s*(?:\/\s*(\d{1,3}))?$/.exec(query);
	if (!match) return null;
	return { number: Number(match[1]), official: match[2] ? Number(match[2]) : null };
}

/** Search by name ("pikachu") or by number ("025", "025/198"), newest sets first. */
export async function searchCards(rawQuery: string, page: number): Promise<CardSearchVM> {
	const query = rawQuery.trim();
	const empty: CardSearchVM = { query, page, results: [], hasNextPage: false, unavailable: false };
	if (query.length < 2 && !/^\d+$/.test(query)) return empty;

	try {
		const byNumber = parseNumberQuery(query);
		const [found, sets] = await Promise.all([
			byNumber
				? tcgdex.searchCardsByNumberContaining(String(byNumber.number))
				: tcgdex.searchCardsByName(query),
			setsById().catch(() => new Map<string, KnownSet>())
		]);

		const cards = found
			.map((card) => ({ card, known: sets.get(setIdOf(card.id, card.localId)) }))
			.filter(({ card, known }) => {
				if (!byNumber) return true;
				// "25" also matched 125, 250, SWSH025…: keep the exact printed number only.
				if (!/^\d+$/.test(card.localId) || Number(card.localId) !== byNumber.number) return false;
				// "025/198": keep the sets with 198 printed cards (when the set is known).
				return !byNumber.official || !known || known.set.cardCount.official === byNumber.official;
			})
			// Newest sets first; cards of an unknown set last.
			.sort((a, b) => (b.known?.releaseRank ?? -1) - (a.known?.releaseRank ?? -1));

		const pageCards = cards.slice((page - 1) * PER_PAGE, page * PER_PAGE);
		// Load the English images only when a card of this page needs one.
		const english = pageCards.some(({ card }) => !card.image) ? await englishImages() : null;
		const results = pageCards.map(({ card, known }) => ({
			id: card.id,
			name: card.name,
			localId: card.localId,
			imageUrl: tcgdex.cardImage(card.image ?? english?.get(card.id), 'low'),
			set: known
				? {
						name: known.set.name,
						officialCount: known.set.cardCount.official,
						logoUrl: known.set.logo ? `${known.set.logo}.webp` : null
					}
				: null
		}));

		return { query, page, results, hasNextPage: cards.length > page * PER_PAGE, unavailable: false };
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
export const today = () => new Date(new Date().toISOString().slice(0, 10));

/** Fetch a card from TCGdex and save it with today's price. False: unknown card. */
export async function syncCard(id: string): Promise<boolean> {
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
			imageUrl: tcgdex.cardImage(await imageBaseOf(card), 'high'),
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
