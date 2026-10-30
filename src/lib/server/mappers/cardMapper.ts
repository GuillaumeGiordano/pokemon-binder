import type { CardWithLatestPrice } from '$lib/server/repositories/cardRepository';
import type { CardDetailVM } from '$lib/viewmodels/card';

const toNumber = (value: { toNumber(): number } | null) => (value === null ? null : value.toNumber());

export function toCardDetailVM(card: CardWithLatestPrice, stale: boolean): CardDetailVM {
	const price = card.prices[0];
	return {
		id: card.id,
		name: card.name,
		localId: card.localId,
		imageUrl: card.imageUrl,
		rarity: card.rarity,
		set: {
			id: card.set.id,
			name: card.set.name,
			officialCount: card.set.officialCount,
			logoUrl: card.set.logoUrl
		},
		variants: card.variants,
		price: price
			? { trend: toNumber(price.trend), trendHolo: toNumber(price.trendHolo), date: price.date.toISOString().slice(0, 10) }
			: null,
		stale
	};
}
