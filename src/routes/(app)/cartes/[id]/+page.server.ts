import { error, fail } from '@sveltejs/kit';
import { TcgdexError } from '$lib/server/tcgdex';
import { getCardDetail } from '$lib/server/services/cardService';
import { addToProfile, CollectionError, listProfiles } from '$lib/server/services/profileService';
import { field } from '$lib/utils/form';
import type { Actions, PageServerLoad } from './$types';

// `?profil=<id>`: coming from a profile, the add form preselects it.
export const load: PageServerLoad = async ({ params, locals, url }) => {
	try {
		const [card, profiles] = await Promise.all([getCardDetail(params.id), listProfiles(locals.user!.sub)]);
		if (!card) error(404, 'Carte introuvable.');
		const requested = url.searchParams.get('profil');
		return {
			card,
			profiles: profiles.map(({ id, name }) => ({ id, name })),
			selectedProfileId: profiles.find((profile) => profile.id === requested)?.id ?? profiles[0]?.id ?? null
		};
	} catch (err) {
		if (err instanceof TcgdexError) error(503, 'TCGdex indisponible : réessaie dans quelques minutes.');
		throw err;
	}
};

export const actions: Actions = {
	/** Add copies of this card to one of the account's profiles (merged into an identical lot, D20). */
	add: async ({ params, request, locals }) => {
		const form = await request.formData();
		try {
			const result = await addToProfile(locals.user!.sub, {
				profileId: field(form, 'profileId'),
				cardId: params.id,
				variant: field(form, 'variant'),
				condition: field(form, 'condition'),
				language: field(form, 'language'),
				quantity: field(form, 'quantity'),
				purchaseUnitPrice: field(form, 'purchaseUnitPrice')
			});
			if (!result) return fail(404, { message: 'Profil ou carte introuvable.' });
			return { itemId: result.itemId, merged: result.merged };
		} catch (err) {
			if (err instanceof CollectionError) return fail(400, { message: err.message });
			if (err instanceof TcgdexError) return fail(503, { message: 'TCGdex indisponible : réessaie dans quelques minutes.' });
			throw err;
		}
	}
};
