import { prisma } from '$lib/server/db';

// Profiles of an account (D30). Every query is scoped by the account's G2 Hub `sub`.

/** A lot with what the screens show: card, set, latest price and profile. */
export const itemInclude = {
	card: { include: { set: true, prices: { orderBy: { date: 'desc' as const }, take: 1 } } },
	profile: { select: { id: true, name: true } }
};

export const listByOwner = (ownerSub: string) =>
	prisma.profile.findMany({
		where: { ownerSub },
		orderBy: { createdAt: 'asc' },
		// What the value of each profile needs (D23): quantity, variant and latest price of each lot.
		include: {
			items: {
				select: {
					quantity: true,
					variant: true,
					card: { select: { prices: { orderBy: { date: 'desc' }, take: 1 } } }
				}
			}
		}
	});

/** A profile with all its lots (card, set, latest price). */
export const findOwned = (id: string, ownerSub: string) =>
	prisma.profile.findFirst({
		where: { id, ownerSub },
		include: { items: { include: itemInclude, orderBy: [{ cardId: 'asc' }] } }
	});

export type ProfileWithItems = NonNullable<Awaited<ReturnType<typeof findOwned>>>;

/** A profile's id and name only. */
export const findOwnedSummary = (id: string, ownerSub: string) =>
	prisma.profile.findFirst({ where: { id, ownerSub }, select: { id: true, name: true } });

export const existsOwned = async (id: string, ownerSub: string) =>
	(await prisma.profile.count({ where: { id, ownerSub } })) > 0;

export const create = (ownerSub: string, name: string) => prisma.profile.create({ data: { ownerSub, name } });

/** Number of profiles renamed (0: not found or not owned). */
export const rename = async (id: string, ownerSub: string, name: string) =>
	(await prisma.profile.updateMany({ where: { id, ownerSub }, data: { name } })).count;

/** Number of profiles deleted (0: not found or not owned). Their lots are deleted in cascade. */
export const remove = async (id: string, ownerSub: string) =>
	(await prisma.profile.deleteMany({ where: { id, ownerSub } })).count;
