import { error, redirect } from '@sveltejs/kit';
import * as oidc from 'openid-client';
import { dev } from '$app/environment';
import { AUTH_COOKIE, hubConfig } from '$lib/server/oidc';
import { encodeSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '$lib/server/session';
import type { RequestHandler } from './$types';

// Step 2: back from the hub with a code. The library checks state + iss, exchanges the code (with
// the client secret and the PKCE verifier) and verifies the ID token: signature (hub's public key),
// issuer, audience, expiry and nonce. Then Pokémon Binder opens ITS OWN session.
export const GET: RequestHandler = async ({ url, cookies }) => {
	const config = await hubConfig();
	if (!config) error(503, 'Connexion G2 Hub non configurée.');
	const raw = cookies.get(AUTH_COOKIE);
	cookies.delete(AUTH_COOKIE, { path: '/auth' });
	if (!raw) redirect(303, '/auth/login');
	const { verifier, state, nonce } = JSON.parse(raw) as { verifier: string; state: string; nonce: string };

	let session: string;
	try {
		const tokens = await oidc.authorizationCodeGrant(config, url, {
			pkceCodeVerifier: verifier,
			expectedState: state,
			expectedNonce: nonce,
			idTokenExpected: true
		});
		const claims = tokens.claims()!;
		session = encodeSession({
			sub: claims.sub,
			name: String(claims.name ?? ''),
			email: String(claims.email ?? '')
		});
	} catch (err) {
		console.error('[pokemon-binder] sign-in failed', err);
		error(400, 'Connexion impossible. Réessayez depuis la page de connexion.');
	}

	cookies.set(SESSION_COOKIE, session, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SESSION_TTL_SECONDS
	});
	redirect(303, '/');
};
