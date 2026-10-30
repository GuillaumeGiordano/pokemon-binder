import { getSetCompletions } from '$lib/server/services/completionService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	completions: await getSetCompletions(locals.user!.sub)
});
