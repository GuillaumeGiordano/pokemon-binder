import { error } from '@sveltejs/kit';
import { TcgdexError } from '$lib/server/tcgdex';
import { getSetDetail } from '$lib/server/services/completionService';
import type { PageServerLoad } from './$types';

// A set seen by one profile: every card, owned (with its lots) or missing (D29, D30, D32).
export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const set = await getSetDetail(locals.user!.sub, params.id, params.setId);
		if (!set) error(404, 'Profil ou extension introuvable.');
		return { set };
	} catch (err) {
		if (err instanceof TcgdexError) error(503, 'TCGdex indisponible : réessaie dans quelques minutes.');
		throw err;
	}
};
