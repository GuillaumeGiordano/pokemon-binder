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
