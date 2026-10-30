import type { Handle } from '@sveltejs/kit';
import { decodeSession, SESSION_COOKIE } from '$lib/server/session';

// Who is signed in (signed session cookie). The (app) layout redirects to /connexion without one.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = decodeSession(event.cookies.get(SESSION_COOKIE));
	return resolve(event);
};
