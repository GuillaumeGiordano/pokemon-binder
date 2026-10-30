import { error } from '@sveltejs/kit';
import { TcgdexError } from '$lib/server/tcgdex';
import { getCardDetail } from '$lib/server/services/cardService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const card = await getCardDetail(params.id);
		if (!card) error(404, 'Carte introuvable.');
		return { card };
	} catch (err) {
		if (err instanceof TcgdexError) error(503, 'TCGdex indisponible : réessaie dans quelques minutes.');
		throw err;
	}
};
