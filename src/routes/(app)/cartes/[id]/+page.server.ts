import { error, fail } from '@sveltejs/kit';
import { TcgdexError } from '$lib/server/tcgdex';
import { getCardDetail } from '$lib/server/services/cardService';
import { addToBinder, CollectionError, listBinders } from '$lib/server/services/collectionService';
import { field } from '$lib/utils/form';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const [card, binders] = await Promise.all([getCardDetail(params.id), listBinders(locals.user!.sub)]);
		if (!card) error(404, 'Carte introuvable.');
		return { card, binders: binders.map(({ id, name }) => ({ id, name })) };
	} catch (err) {
		if (err instanceof TcgdexError) error(503, 'TCGdex indisponible : réessaie dans quelques minutes.');
		throw err;
	}
};

export const actions: Actions = {
	/** Add copies of this card to one of my binders (merged into an identical lot, D20). */
	add: async ({ params, request, locals }) => {
		const form = await request.formData();
		try {
			const result = await addToBinder(locals.user!.sub, {
				binderId: field(form, 'binderId'),
				cardId: params.id,
				variant: field(form, 'variant'),
				condition: field(form, 'condition'),
				language: field(form, 'language'),
				quantity: field(form, 'quantity'),
				purchaseUnitPrice: field(form, 'purchaseUnitPrice')
			});
			if (!result) return fail(404, { message: 'Classeur ou carte introuvable.' });
			return { itemId: result.itemId, merged: result.merged };
		} catch (err) {
			if (err instanceof CollectionError) return fail(400, { message: err.message });
			if (err instanceof TcgdexError) return fail(503, { message: 'TCGdex indisponible : réessaie dans quelques minutes.' });
			throw err;
		}
	}
};
