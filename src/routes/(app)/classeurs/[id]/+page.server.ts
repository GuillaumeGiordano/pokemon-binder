import { error, fail, redirect } from '@sveltejs/kit';
import { CollectionError, deleteBinder, getBinder, renameBinder } from '$lib/server/services/collectionService';
import { field } from '$lib/utils/form';
import type { Actions, PageServerLoad } from './$types';

// A binder of the signed-in user; another user's binder answers 404 (reveals nothing).
export const load: PageServerLoad = async ({ params, locals }) => {
	const binder = await getBinder(params.id, locals.user!.sub);
	if (!binder) error(404, 'Classeur introuvable.');
	return { binder };
};

export const actions: Actions = {
	rename: async ({ params, request, locals }) => {
		const form = await request.formData();
		try {
			if (!(await renameBinder(params.id, locals.user!.sub, field(form, 'name')))) error(404, 'Classeur introuvable.');
			return { saved: 'Classeur renommé.' };
		} catch (err) {
			if (err instanceof CollectionError) return fail(400, { message: err.message });
			throw err;
		}
	},
	delete: async ({ params, locals }) => {
		if (!(await deleteBinder(params.id, locals.user!.sub))) error(404, 'Classeur introuvable.');
		redirect(303, '/');
	}
};
