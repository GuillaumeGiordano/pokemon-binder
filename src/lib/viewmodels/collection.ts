import type { CardVariant } from '$lib/records/card';
import type { CardCondition, CardLanguage } from '$lib/records/collection';

/** A binder in the list of my binders. */
export type BinderSummaryVM = {
	id: string;
	name: string;
	/** Number of lots. */
	lotCount: number;
	/** Number of cards (sum of the quantities). */
	cardCount: number;
};

/** A lot (D11): identical copies of a card. Amounts in EUR, per card. */
export type CollectionItemVM = {
	id: string;
	card: { id: string; name: string; localId: string; imageUrl: string | null; setName: string; officialCount: number };
	binder: { id: string; name: string };
	variant: CardVariant;
	condition: CardCondition;
	language: CardLanguage;
	quantity: number;
	/** Average price paid (D11). */
	purchaseUnitPrice: number | null;
	/** Market price frozen at acquisition (D17). */
	acquisitionMarketPrice: number | null;
	/** Latest market price (D14). */
	currentMarketPrice: number | null;
	/** "YYYY-MM-DD", first acquisition (D20). */
	acquiredAt: string;
};

export type BinderDetailVM = {
	id: string;
	name: string;
	items: CollectionItemVM[];
};
