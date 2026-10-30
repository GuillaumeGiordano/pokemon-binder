import { searchCards } from '$lib/server/services/cardService';
import type { PageServerLoad } from './$types';

// Search by name or number: `/recherche?q=pikachu&page=2` (a GET form, so the URL can be shared).
// `profil`: the profile the search was started from, passed on to the card page (preselected).
export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	return {
		search: await searchCards(url.searchParams.get('q') ?? '', page),
		profileId: url.searchParams.get('profil')
	};
};
