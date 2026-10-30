import type { CollectionItemWithCard } from '$lib/server/repositories/collectionItemRepository';
import type { listByOwner } from '$lib/server/repositories/profileRepository';
import { referencePrice, valueOf } from '$lib/utils/price';
import type { CollectionItemVM, ProfileSummaryVM } from '$lib/viewmodels/collection';

const toNumber = (value: { toNumber(): number } | null) => (value === null ? null : value.toNumber());

type LatestPrice = { trend: { toNumber(): number } | null; trendHolo: { toNumber(): number } | null } | undefined;

/** Unit market price of a lot from its card's latest snapshot (D14). */
export const unitMarketPrice = (variant: CollectionItemVM['variant'], latest: LatestPrice) =>
	latest ? referencePrice(variant, { trend: toNumber(latest.trend), trendHolo: toNumber(latest.trendHolo) }) : null;

export function toProfileSummaryVM(profile: Awaited<ReturnType<typeof listByOwner>>[number]): ProfileSummaryVM {
	return {
		id: profile.id,
		name: profile.name,
		lotCount: profile.items.length,
		cardCount: profile.items.reduce((sum, item) => sum + item.quantity, 0),
		...valueOf(
			profile.items.map((item) => ({
				quantity: item.quantity,
				unitPrice: unitMarketPrice(item.variant, item.card.prices[0])
			}))
		)
	};
}

export function toCollectionItemVM(item: CollectionItemWithCard): CollectionItemVM {
	return {
		id: item.id,
		card: {
			id: item.card.id,
			name: item.card.name,
			localId: item.card.localId,
			imageUrl: item.card.imageUrl,
			setId: item.card.set.id,
			setName: item.card.set.name,
			setLogoUrl: item.card.set.logoUrl,
			officialCount: item.card.set.officialCount
		},
		profile: item.profile,
		variant: item.variant,
		condition: item.condition,
		language: item.language,
		quantity: item.quantity,
		purchaseUnitPrice: toNumber(item.purchaseUnitPrice),
		acquisitionMarketPrice: toNumber(item.acquisitionMarketPrice),
		currentMarketPrice: unitMarketPrice(item.variant, item.card.prices[0]),
		acquiredAt: item.acquiredAt.toISOString().slice(0, 10)
	};
}
