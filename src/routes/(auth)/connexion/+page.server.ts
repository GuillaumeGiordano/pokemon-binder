import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Already signed in: straight to the binders.
export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};
