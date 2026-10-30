import { searchCards } from '$lib/server/services/cardService';
import type { PageServerLoad } from './$types';

// Search by name or number: `/recherche?q=pikachu&page=2` (a GET form, so the URL can be shared).
export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	return { search: await searchCards(url.searchParams.get('q') ?? '', page) };
};
