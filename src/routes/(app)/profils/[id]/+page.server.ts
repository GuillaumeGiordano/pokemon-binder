import { error, fail, redirect } from '@sveltejs/kit';
import { CollectionError, deleteProfile, getProfile, renameProfile } from '$lib/server/services/profileService';
import { field } from '$lib/utils/form';
import type { Actions, PageServerLoad } from './$types';

// A profile of the signed-in account; another account's profile answers 404 (reveals nothing).
export const load: PageServerLoad = async ({ params, locals }) => {
	const profile = await getProfile(params.id, locals.user!.sub);
	if (!profile) error(404, 'Profil introuvable.');
	return { profile };
};

export const actions: Actions = {
	rename: async ({ params, request, locals }) => {
		const form = await request.formData();
		try {
			if (!(await renameProfile(params.id, locals.user!.sub, field(form, 'name')))) error(404, 'Profil introuvable.');
			return { saved: 'Profil renommé.' };
		} catch (err) {
			if (err instanceof CollectionError) return fail(400, { message: err.message });
			throw err;
		}
	},
	delete: async ({ params, locals }) => {
		if (!(await deleteProfile(params.id, locals.user!.sub))) error(404, 'Profil introuvable.');
		redirect(303, '/');
	}
};
