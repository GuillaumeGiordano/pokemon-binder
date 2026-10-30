import * as cardRepository from '$lib/server/repositories/cardRepository';
import { isOfficialNumber } from '$lib/utils/cardNumber';
import type { SetCompletionVM } from '$lib/viewmodels/completion';

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
