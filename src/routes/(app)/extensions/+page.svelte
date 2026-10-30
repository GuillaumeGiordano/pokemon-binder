<script lang="ts">
	import { EmptyState, Progress } from '@guillaumeg/ui';
	import { Layers } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Extensions · Pokémon Binder</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Complétion des extensions</h1>

{#if data.completions.length === 0}
	<EmptyState
		icon={Layers}
		title="Aucune extension commencée"
		description="Ajoute des cartes à tes classeurs pour suivre ta progression."
		cta={{ label: 'Rechercher une carte', href: '/recherche' }}
	/>
{:else}
	<ul class="grid grid-cols-1 gap-3 md:grid-cols-2">
		{#each data.completions as set (set.id)}
			<li class="flex flex-col gap-2 rounded-lg border p-4">
				<div class="flex items-center justify-between gap-2">
					<span class="truncate font-semibold">{set.name}</span>
					<span class="text-sm font-bold">{set.percent} %</span>
				</div>
				<Progress
					value={set.ownedOfficial}
					max={Math.max(1, set.officialCount)}
					color={set.percent === 100 ? 'success' : 'primary'}
				/>
				<p class="text-sm opacity-70">
					{set.ownedOfficial}/{set.officialCount}
					{#if set.secretCount > 0 || set.ownedSecret > 0}
						(+{set.ownedSecret} secrète{set.ownedSecret > 1 ? 's' : ''}{set.secretCount > 0 ? ` sur ${set.secretCount}` : ''})
					{/if}
				</p>
			</li>
		{/each}
	</ul>
{/if}
