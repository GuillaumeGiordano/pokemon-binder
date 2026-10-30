import { fail } from '@sveltejs/kit';
import { CollectionError, createProfile, getAccountOverview } from '$lib/server/services/profileService';
import { field } from '$lib/utils/form';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	overview: await getAccountOverview(locals.user!.sub)
});

export const actions: Actions = {
	createProfile: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await createProfile(locals.user!.sub, field(form, 'name'));
			return { saved: 'Profil créé.' };
		} catch (err) {
			if (err instanceof CollectionError) return fail(400, { message: err.message });
			throw err;
		}
	}
};
