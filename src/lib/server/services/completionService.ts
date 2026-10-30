import * as cardRepository from '$lib/server/repositories/cardRepository';
import * as itemRepository from '$lib/server/repositories/collectionItemRepository';
import { englishImages } from '$lib/server/services/cardService';
import * as tcgdex from '$lib/server/tcgdex';
import type { TcgdexSet } from '$lib/server/tcgdex';
import { isOfficialNumber } from '$lib/utils/cardNumber';
import type { SetCardVM, SetCompletionVM, SetDetailVM } from '$lib/viewmodels/completion';

// Completion per set (D16), over all the user's binders (D18): a card counts once whatever its
// variant, official numbering and secret cards apart (D19). Only sets with at least one owned card.

export async function getSetCompletions(ownerSub: string): Promise<SetCompletionVM[]> {
	const cards = await cardRepository.findOwnedCards(ownerSub);
	const bySet = new Map<string, SetCompletionVM>();

	for (const card of cards) {
		const { set } = card;
		let completion = bySet.get(set.id);
		if (!completion) {
			completion = {
				id: set.id,
				name: set.name,
				logoUrl: set.logoUrl,
				officialCount: set.officialCount,
				ownedOfficial: 0,
				ownedSecret: 0,
				secretCount: Math.max(0, set.totalCount - set.officialCount),
				percent: 0
			};
			bySet.set(set.id, completion);
		}
		if (isOfficialNumber(card.localId, set.officialCount)) completion.ownedOfficial++;
		else completion.ownedSecret++;
	}

	return [...bySet.values()]
		.map((completion) => ({
			...completion,
			percent: completion.officialCount > 0 ? Math.round((completion.ownedOfficial / completion.officialCount) * 100) : 0
		}))
		.sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, 'fr'));
}

// --- One set, card by card: owned or missing ---

/** A set's card list rarely changes: kept in memory, per set. */
const SET_CACHE_TTL_MS = 24 * 3600 * 1000;
const setCache = new Map<string, { at: number; set: TcgdexSet }>();

async function fetchSet(id: string): Promise<TcgdexSet | null> {
	const cached = setCache.get(id);
	if (cached && Date.now() - cached.at < SET_CACHE_TTL_MS) return cached.set;
	const set = await tcgdex.getSet(id);
	if (set) setCache.set(id, { at: Date.now(), set });
	return set;
}

/**
 * Every card of a set with the quantity the user owns (0: missing), printed numbering first and
 * secret cards after (D19). Null: unknown set. Throws TcgdexError when TCGdex is down.
 */
export async function getSetDetail(ownerSub: string, setId: string): Promise<SetDetailVM | null> {
	const set = await fetchSet(setId);
	if (!set) return null;
	const owned = await itemRepository.ownedQuantitiesInSet(ownerSub, setId);
	const english = set.cards.some((card) => !card.image) ? await englishImages() : null;

	const cards: SetCardVM[] = set.cards.map((card) => ({
		id: card.id,
		localId: card.localId,
		name: card.name,
		imageUrl: tcgdex.cardImage(card.image ?? english?.get(card.id), 'low'),
		quantity: owned.get(card.id) ?? 0,
		secret: !isOfficialNumber(card.localId, set.cardCount.official)
	}));
	// Stable sort: TCGdex's order inside each group, printed numbering first.
	cards.sort((a, b) => Number(a.secret) - Number(b.secret));

	const ownedOfficial = cards.filter((card) => !card.secret && card.quantity > 0).length;
	const official = set.cardCount.official;
	return {
		id: set.id,
		name: set.name,
		logoUrl: set.logo ? `${set.logo}.webp` : null,
		officialCount: official,
		ownedOfficial,
		ownedSecret: cards.filter((card) => card.secret && card.quantity > 0).length,
		secretCount: cards.filter((card) => card.secret).length,
		percent: official > 0 ? Math.round((ownedOfficial / official) * 100) : 0,
		cards
	};
}
