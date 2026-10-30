import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Every page of the (app) group needs a session: otherwise, to the sign-in page.
export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/connexion');
	return { user: { name: locals.user.name, email: locals.user.email } };
};
