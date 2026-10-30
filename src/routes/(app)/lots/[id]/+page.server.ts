import { error, fail, redirect } from '@sveltejs/kit';
import { CollectionError, deleteLot, getLot, updateLot } from '$lib/server/services/profileService';
import { field } from '$lib/utils/form';
import type { Actions, PageServerLoad } from './$types';

// A lot of the signed-in user; another user's lot answers 404 (reveals nothing).
export const load: PageServerLoad = async ({ params, locals }) => {
	const lot = await getLot(params.id, locals.user!.sub);
	if (!lot) error(404, 'Lot introuvable.');
	return { lot };
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const form = await request.formData();
		try {
			const updated = await updateLot(params.id, locals.user!.sub, {
				quantity: field(form, 'quantity'),
				purchaseUnitPrice: field(form, 'purchaseUnitPrice')
			});
			if (!updated) error(404, 'Lot introuvable.');
			return { saved: true };
		} catch (err) {
			if (err instanceof CollectionError) return fail(400, { message: err.message });
			throw err;
		}
	},
	delete: async ({ params, locals }) => {
		const lot = await getLot(params.id, locals.user!.sub);
		if (!lot || !(await deleteLot(params.id, locals.user!.sub))) error(404, 'Lot introuvable.');
		// Back to the set seen by the profile, where the lot was.
		redirect(303, `/profils/${lot.profile.id}/extensions/${lot.card.setId}`);
	}
};
