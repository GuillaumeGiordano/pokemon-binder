import type { CardVariant } from '$lib/records/card';
import type { CardCondition, CardLanguage } from '$lib/records/collection';
import type { SetCompletionVM } from '$lib/viewmodels/completion';

/** A profile in the account's list (D30). */
export type ProfileSummaryVM = {
	id: string;
	name: string;
	/** Number of lots. */
	lotCount: number;
	/** Number of cards (sum of the quantities). */
	cardCount: number;
	/** Current market value in EUR (D23), cards without a price excluded. */
	value: number;
	/** Cards without a market price (not counted in `value`). */
	unpricedCount: number;
};

/** The account's home page: every profile and the value of the whole family (D31). */
export type AccountOverviewVM = {
	totalValue: number;
	unpricedCount: number;
	profiles: ProfileSummaryVM[];
};

/** A set a profile has cards of, with its completion for that profile (D30). */
export type ProfileSetVM = SetCompletionVM & {
	/** Copies of this set's cards in the profile. */
	cardCount: number;
	value: number;
};

/** A profile's page: its value and the sets it has cards of. */
export type ProfileDetailVM = ProfileSummaryVM & {
	sets: ProfileSetVM[];
};

/** A lot (D11): identical copies of a card. Amounts in EUR, per card. */
export type CollectionItemVM = {
	id: string;
	card: {
		id: string;
		name: string;
		localId: string;
		imageUrl: string | null;
		setId: string;
		setName: string;
		setLogoUrl: string | null;
		officialCount: number;
	};
	profile: { id: string; name: string };
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
