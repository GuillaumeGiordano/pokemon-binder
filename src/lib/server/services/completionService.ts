import * as itemRepository from '$lib/server/repositories/collectionItemRepository';
import * as profileRepository from '$lib/server/repositories/profileRepository';
import { unitMarketPrice } from '$lib/server/mappers/collectionMapper';
import { englishImages } from '$lib/server/services/cardService';
import * as tcgdex from '$lib/server/tcgdex';
import type { TcgdexSet } from '$lib/server/tcgdex';
import { isOfficialNumber } from '$lib/utils/cardNumber';
import type { SetCardLotVM, SetCardVM, SetDetailVM } from '$lib/viewmodels/completion';

// One set, card by card, for one profile (D29, D30): owned (with its lots, D32) or missing.

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
 * Every card of a set with the profile's lots (none: missing), printed numbering first and secret
 * cards after (D19). Null: unknown profile (or another account's) or unknown set.
 * Throws TcgdexError when TCGdex is down.
 */
export async function getSetDetail(ownerSub: string, profileId: string, setId: string): Promise<SetDetailVM | null> {
	const profile = await profileRepository.findOwnedSummary(profileId, ownerSub);
	if (!profile) return null;
	const set = await fetchSet(setId);
	if (!set) return null;

	const lotsByCard = new Map<string, SetCardLotVM[]>();
	for (const item of await itemRepository.findOwnedInSet(profileId, ownerSub, setId)) {
		const lots = lotsByCard.get(item.cardId) ?? [];
		lots.push({
			id: item.id,
			variant: item.variant,
			condition: item.condition,
			language: item.language,
			quantity: item.quantity,
			currentMarketPrice: unitMarketPrice(item.variant, item.card.prices[0])
		});
		lotsByCard.set(item.cardId, lots);
	}
	const english = set.cards.some((card) => !card.image) ? await englishImages() : null;

	const cards: SetCardVM[] = set.cards.map((card) => {
		const lots = lotsByCard.get(card.id) ?? [];
		return {
			id: card.id,
			localId: card.localId,
			name: card.name,
			imageUrl: tcgdex.cardImage(card.image ?? english?.get(card.id), 'low'),
			quantity: lots.reduce((sum, lot) => sum + lot.quantity, 0),
			secret: !isOfficialNumber(card.localId, set.cardCount.official),
			lots
		};
	});
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
		profile,
		cards
	};
}
