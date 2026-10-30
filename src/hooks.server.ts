import type { Handle, ServerInit } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { decodeSession, SESSION_COOKIE } from '$lib/server/session';
import { startPriceJob } from '$lib/server/services/priceJobService';

// Daily price refresh (D21), unless disabled (PRICE_JOB_ENABLED="false").
export const init: ServerInit = () => {
	if (env.PRICE_JOB_ENABLED !== 'false') startPriceJob();
};

// Who is signed in (signed session cookie). The (app) layout redirects to /connexion without one.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = decodeSession(event.cookies.get(SESSION_COOKIE));
	return resolve(event);
};
