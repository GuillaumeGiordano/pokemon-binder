import { prisma } from '$lib/server/db';

// Binders (D15). Every query is scoped by the owner's G2 Hub `sub`.

/** The lots of a binder, with what the grid shows: card, set and latest price. */
export const itemInclude = {
	card: { include: { set: true, prices: { orderBy: { date: 'desc' as const }, take: 1 } } },
	binder: { select: { id: true, name: true } }
};

export const listByOwner = (ownerSub: string) =>
	prisma.binder.findMany({
		where: { ownerSub },
		orderBy: { createdAt: 'asc' },
		// What the value of each binder needs (D23): quantity, variant and latest price of each lot.
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

export const findOwned = (id: string, ownerSub: string) =>
	prisma.binder.findFirst({
		where: { id, ownerSub },
		include: { items: { include: itemInclude, orderBy: [{ cardId: 'asc' }] } }
	});

export const existsOwned = async (id: string, ownerSub: string) =>
	(await prisma.binder.count({ where: { id, ownerSub } })) > 0;

export const create = (ownerSub: string, name: string) => prisma.binder.create({ data: { ownerSub, name } });

/** Number of binders renamed (0: not found or not owned). */
export const rename = async (id: string, ownerSub: string, name: string) =>
	(await prisma.binder.updateMany({ where: { id, ownerSub }, data: { name } })).count;

/** Number of binders deleted (0: not found or not owned). Their lots are deleted in cascade. */
export const remove = async (id: string, ownerSub: string) =>
	(await prisma.binder.deleteMany({ where: { id, ownerSub } })).count;
