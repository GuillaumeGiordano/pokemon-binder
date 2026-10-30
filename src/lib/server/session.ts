import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

// Pokémon Binder's own session after « Se connecter avec G2 Hub » (D6): a SIGNED cookie
// (HMAC-SHA256 with SESSION_SECRET), so no session table and no session lost on a restart. It holds
// no secret, only who is signed in; it cannot be forged without SESSION_SECRET.

export type SessionUser = {
	/** G2 Hub `sub`: every binder belongs to it. */
	sub: string;
	name: string;
	email: string;
	/** Expiry, in ms since the epoch. */
	exp: number;
};

export const SESSION_COOKIE = 'pb_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 3600;

function secret(): string {
	const value = env.SESSION_SECRET;
	if (!value || value.length < 32) throw new Error('SESSION_SECRET manquant ou trop court (32 caractères minimum).');
	return value;
}

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function encodeSession(user: Omit<SessionUser, 'exp'>): string {
	const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString(
		'base64url'
	);
	return `${payload}.${sign(payload)}`;
}

/** The session of a cookie, or null if it is missing, tampered with or expired. */
export function decodeSession(cookie: string | undefined): SessionUser | null {
	if (!cookie) return null;
	const [payload, signature] = cookie.split('.');
	if (!payload || !signature) return null;
	const expected = Buffer.from(sign(payload));
	const given = Buffer.from(signature);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
	try {
		const user = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionUser;
		return user.exp > Date.now() && user.sub ? user : null;
	} catch {
		return null;
	}
}
