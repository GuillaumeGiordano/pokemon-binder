import type { CardVariant } from '$lib/records/card';
import type { CardCondition, CardLanguage } from '$lib/records/collection';

/** Completion of a set for a profile (D16, D19, D30): one card counts once, whatever its variant. */
export type SetCompletionVM = {
	id: string;
	name: string;
	logoUrl: string | null;
	officialCount: number;
	/** Distinct owned cards of the printed numbering (1 → officialCount). */
	ownedOfficial: number;
	/** Distinct owned secret / special cards. */
	ownedSecret: number;
	/** Secret / special cards in the set (total − official). */
	secretCount: number;
	/** ownedOfficial / officialCount, 0 → 100. */
	percent: number;
};

/** A lot of a card, as listed in the popin of a set's grid (D32). */
export type SetCardLotVM = {
	id: string;
	variant: CardVariant;
	condition: CardCondition;
	language: CardLanguage;
	quantity: number;
	/** Latest market price per card, EUR. */
	currentMarketPrice: number | null;
};

/** A card of a set, owned by the profile or missing. */
export type SetCardVM = {
	id: string;
	localId: string;
	name: string;
	imageUrl: string | null;
	/** Copies owned by the profile (0: missing). */
	quantity: number;
	/** Out of the printed numbering (D19). */
	secret: boolean;
	/** The profile's lots of this card (empty: missing). */
	lots: SetCardLotVM[];
};

/** Every card of a set, to see what a profile owns and what is missing. */
export type SetDetailVM = SetCompletionVM & {
	profile: { id: string; name: string };
	cards: SetCardVM[];
};
