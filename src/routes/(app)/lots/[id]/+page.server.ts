import { error, fail, redirect } from '@sveltejs/kit';
import { CollectionError, deleteLot, getLot, updateLot } from '$lib/server/services/profileService';
import { field } from '$lib/utils/form';
import { profileSetHref } from '$lib/utils/searchUrl';
import type { CollectionItemVM } from '$lib/viewmodels/collection';
import type { Actions, PageServerLoad } from './$types';

/**
 * Where the lot page leads back (and where a deletion lands): the profile's « Mes cartes » tab when
 * opened from it (`?retour=cartes`, D40), otherwise the profile's view of the card's set.
 */
function backOf(lot: CollectionItemVM, url: URL) {
	return url.searchParams.get('retour') === 'cartes'
		? { href: `/profils/${lot.profile.id}?onglet=cartes`, label: `${lot.profile.name} · Mes cartes`, fromCards: true }
		: { href: profileSetHref(lot.profile.id, lot.card.setId), label: `${lot.profile.name} · ${lot.card.setName}`, fromCards: false };
}

// A lot of the signed-in user; another user's lot answers 404 (reveals nothing).
export const load: PageServerLoad = async ({ params, locals, url }) => {
	const lot = await getLot(params.id, locals.user!.sub);
	if (!lot) error(404, 'Lot introuvable.');
	return { lot, back: backOf(lot, url) };
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
	delete: async ({ params, locals, url }) => {
		const lot = await getLot(params.id, locals.user!.sub);
		if (!lot || !(await deleteLot(params.id, locals.user!.sub))) error(404, 'Lot introuvable.');
		// Back where the lot was listed.
		redirect(303, backOf(lot, url).href);
	}
};
