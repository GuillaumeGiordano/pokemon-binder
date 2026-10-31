import { searchCards } from '$lib/server/services/cardService';
import { getOwnedCards } from '$lib/server/services/profileService';
import type { PageServerLoad } from './$types';

// Search by name or number: `/recherche?q=pikachu&page=2` (a GET form, so the URL can be shared).
// `profil`: the profile the search was started from, passed on to the card page (preselected).
// Each result says whether the account already owns it (D39).
export const load: PageServerLoad = async ({ url, locals }) => {
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const search = await searchCards(url.searchParams.get('q') ?? '', page);
	return {
		search,
		owned: await getOwnedCards(
			search.results.map((card) => card.id),
			locals.user!.sub
		),
		profileId: url.searchParams.get('profil')
	};
};
