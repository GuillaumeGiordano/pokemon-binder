import { error, fail } from '@sveltejs/kit';
import { TcgdexError } from '$lib/server/tcgdex';
import { getCardDetail } from '$lib/server/services/cardService';
import { addToProfile, CollectionError, listProfiles } from '$lib/server/services/profileService';
import { field } from '$lib/utils/form';
import { profileSetHref, searchHref } from '$lib/utils/searchUrl';
import type { Actions, PageServerLoad } from './$types';

// Where the card page was opened from, for its back link and the « next card » button:
//   `?profil=<id>&extension=<setId>`: a profile's view of the card's set;
//   `?q=…&page=…`: the search results.
// `?profil=<id>` alone preselects that profile in the add form.
export const load: PageServerLoad = async ({ params, locals, url }) => {
	try {
		const [card, profiles] = await Promise.all([getCardDetail(params.id), listProfiles(locals.user!.sub)]);
		if (!card) error(404, 'Carte introuvable.');
		const requested = profiles.find((profile) => profile.id === url.searchParams.get('profil')) ?? null;
		const q = url.searchParams.get('q');
		const searchBack = searchHref({ q, page: Number(url.searchParams.get('page')) || 1, profileId: requested?.id });

		// Only the card's own set, in one of the account's profiles: never an arbitrary URL.
		const fromSet = requested && url.searchParams.get('extension') === card.set.id;
		const back = fromSet
			? { href: profileSetHref(requested.id, card.set.id), label: `${requested.name} · ${card.set.name}` }
			: q
				? { href: searchBack, label: `Résultats « ${q} »` }
				: null;

		return {
			card,
			profiles: profiles.map(({ id, name }) => ({ id, name })),
			selectedProfileId: requested?.id ?? profiles[0]?.id ?? null,
			back,
			/** After an add: back where the user came from, or a new search for the same profile. */
			nextCardHref: back?.href ?? searchBack
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
