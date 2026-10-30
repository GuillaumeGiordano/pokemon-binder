import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/session';
import type { RequestHandler } from './$types';

// Sign out of Pokémon Binder only (its own cookie): the G2 Hub session stays open.
export const POST: RequestHandler = ({ cookies }) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/connexion');
};
