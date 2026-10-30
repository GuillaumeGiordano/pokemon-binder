import { fail } from '@sveltejs/kit';
import { CollectionError, createBinder, listBinders } from '$lib/server/services/collectionService';
import { field } from '$lib/utils/form';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	binders: await listBinders(locals.user!.sub)
});

export const actions: Actions = {
	createBinder: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await createBinder(locals.user!.sub, field(form, 'name'));
			return { saved: 'Classeur créé.' };
		} catch (err) {
			if (err instanceof CollectionError) return fail(400, { message: err.message });
			throw err;
		}
	}
};
