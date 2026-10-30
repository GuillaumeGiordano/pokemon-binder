import * as oidc from 'openid-client';
import { env } from '$env/dynamic/private';

// Pokémon Binder as an OpenID Connect client of G2 Hub (« Se connecter avec G2 Hub », D5). It is an
// application with its own users (invited from the hub console, D9): no organization claim needed.
// The client secret stays on this server; the browser only sees the hub and a code.

export const appUrl = () => env.POKEMON_BINDER_URL || 'http://localhost:5200';
export const redirectUri = () => `${appUrl()}/auth/callback`;
export const SCOPE = 'openid email profile';

/** Short-lived cookie holding state + nonce + PKCE verifier between /auth/login and /auth/callback. */
export const AUTH_COOKIE = 'pb_auth';

let config: Promise<oidc.Configuration> | null = null;

/** The hub's configuration, discovered from /.well-known/openid-configuration (once per process). */
export function hubConfig(): Promise<oidc.Configuration> | null {
	if (!env.POKEMON_BINDER_CLIENT_ID || !env.POKEMON_BINDER_CLIENT_SECRET) return null;
	const issuer = new URL(env.HUB_URL || 'http://localhost:5180');
	config ??= oidc
		.discovery(
			issuer,
			env.POKEMON_BINDER_CLIENT_ID,
			env.POKEMON_BINDER_CLIENT_SECRET,
			undefined,
			// Plain http is refused by the library, except against a local hub.
			issuer.protocol === 'http:' ? { execute: [oidc.allowInsecureRequests] } : undefined
		)
		.catch((err) => {
			config = null; // retry on the next sign-in
			throw err;
		});
	return config;
}
