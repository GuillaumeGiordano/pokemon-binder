import type { CollectionItemWithCard } from '$lib/server/repositories/collectionItemRepository';
import type { listByOwner } from '$lib/server/repositories/binderRepository';
import { referencePrice } from '$lib/utils/price';
import type { BinderSummaryVM, CollectionItemVM } from '$lib/viewmodels/collection';

const toNumber = (value: { toNumber(): number } | null) => (value === null ? null : value.toNumber());

export function toBinderSummaryVM(binder: Awaited<ReturnType<typeof listByOwner>>[number]): BinderSummaryVM {
	return {
		id: binder.id,
		name: binder.name,
		lotCount: binder.items.length,
		cardCount: binder.items.reduce((sum, item) => sum + item.quantity, 0)
	};
}

export function toCollectionItemVM(item: CollectionItemWithCard): CollectionItemVM {
	const latest = item.card.prices[0];
	return {
		id: item.id,
		card: {
			id: item.card.id,
			name: item.card.name,
			localId: item.card.localId,
			imageUrl: item.card.imageUrl,
			setName: item.card.set.name,
			officialCount: item.card.set.officialCount
		},
		binder: item.binder,
		variant: item.variant,
		condition: item.condition,
		language: item.language,
		quantity: item.quantity,
		purchaseUnitPrice: toNumber(item.purchaseUnitPrice),
		acquisitionMarketPrice: toNumber(item.acquisitionMarketPrice),
		currentMarketPrice: latest
			? referencePrice(item.variant, { trend: toNumber(latest.trend), trendHolo: toNumber(latest.trendHolo) })
			: null,
		acquiredAt: item.acquiredAt.toISOString().slice(0, 10)
	};
}
