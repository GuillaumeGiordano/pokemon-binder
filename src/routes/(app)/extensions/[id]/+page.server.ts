import { error } from '@sveltejs/kit';
import { TcgdexError } from '$lib/server/tcgdex';
import { getSetDetail } from '$lib/server/services/completionService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const set = await getSetDetail(locals.user!.sub, params.id);
		if (!set) error(404, 'Extension introuvable.');
		return { set };
	} catch (err) {
		if (err instanceof TcgdexError) error(503, 'TCGdex indisponible : réessaie dans quelques minutes.');
		throw err;
	}
};
