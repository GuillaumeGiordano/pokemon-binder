/** Completion of a set (D16, D19): one card counts once, whatever its variant. */
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

/** A card of a set, owned or missing. */
export type SetCardVM = {
	id: string;
	localId: string;
	name: string;
	imageUrl: string | null;
	/** Copies owned over all binders (0: missing). */
	quantity: number;
	/** Out of the printed numbering (D19). */
	secret: boolean;
};

/** Every card of a set, to see what is owned and what is missing. */
export type SetDetailVM = SetCompletionVM & {
	cards: SetCardVM[];
};
