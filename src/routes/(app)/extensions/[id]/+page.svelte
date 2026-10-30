<script lang="ts">
	import { Badge, Button, EmptyState, Progress } from '@guillaumeg/ui';
	import { ArrowLeft, PartyPopper } from '@lucide/svelte';
	import CardImage from '$lib/components/card/CardImage.svelte';
	import type { SetCardVM } from '$lib/viewmodels/completion';

	let { data } = $props();

	const set = $derived(data.set);

	type Filter = 'all' | 'owned' | 'missing';
	let filter = $state<Filter>('all');

	const ownedCount = $derived(set.cards.filter((card) => card.quantity > 0).length);
	const filters = $derived<{ value: Filter; label: string }[]>([
		{ value: 'all', label: `Toutes (${set.cards.length})` },
		{ value: 'owned', label: `Possédées (${ownedCount})` },
		{ value: 'missing', label: `Manquantes (${set.cards.length - ownedCount})` }
	]);

	const visible = (card: SetCardVM) =>
		filter === 'all' || (filter === 'owned' ? card.quantity > 0 : card.quantity === 0);
	const officialCards = $derived(set.cards.filter((card) => !card.secret && visible(card)));
	const secretCards = $derived(set.cards.filter((card) => card.secret && visible(card)));
</script>

<svelte:head>
	<title>{set.name} · Pokémon Binder</title>
</svelte:head>

<Button href="/extensions" variant="ghost" icon={ArrowLeft}>Extensions</Button>

<header class="mt-4 mb-4 flex flex-col gap-2">
	<div class="flex items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">{set.name}</h1>
		<span class="font-bold">{set.percent} %</span>
	</div>
	<Progress value={set.ownedOfficial} max={Math.max(1, set.officialCount)} color={set.percent === 100 ? 'success' : 'primary'} />
	<p class="text-sm opacity-70">
		{set.ownedOfficial}/{set.officialCount}
		{#if set.secretCount > 0}(+{set.ownedSecret} secrète{set.ownedSecret > 1 ? 's' : ''} sur {set.secretCount}){/if}
	</p>
</header>

<div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer les cartes">
	{#each filters as option (option.value)}
		<Button
			size="sm"
			variant={filter === option.value ? 'primary' : 'secondary'}
			aria-pressed={filter === option.value}
			onclick={() => (filter = option.value)}
		>
			{option.label}
		</Button>
	{/each}
</div>

{#snippet grid(cards: SetCardVM[])}
	<ul class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
		{#each cards as card (card.id)}
			<li>
				<a
					href="/cartes/{card.id}"
					class="flex flex-col gap-1 rounded-lg p-1 hover:opacity-80"
					aria-label="{card.name} n° {card.localId}{card.quantity > 0 ? `, possédée ×${card.quantity}` : ', manquante'}"
				>
					<div class="relative {card.quantity === 0 ? 'opacity-40 grayscale' : ''}">
						<CardImage
							imageUrl={card.imageUrl}
							name={card.name}
							number="{card.localId}/{set.officialCount}"
							setName={null}
							lazy
							class="rounded-md"
						/>
						{#if card.quantity > 0}
							<span class="absolute top-1 right-1"><Badge label="×{card.quantity}" variant="primary" size="sm" /></span>
						{/if}
					</div>
					<span class="truncate text-xs {card.quantity === 0 ? 'opacity-60' : 'font-semibold'}">
						{card.localId} · {card.name}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/snippet}

{#if officialCards.length === 0 && secretCards.length === 0}
	{#if filter === 'missing'}
		<EmptyState icon={PartyPopper} title="Extension complète !" description="Il ne te manque aucune carte." />
	{:else}
		<EmptyState title="Aucune carte" description="Aucune carte de cette extension ne correspond au filtre." />
	{/if}
{:else}
	{@render grid(officialCards)}
	{#if secretCards.length > 0}
		<h2 class="mt-6 mb-2 font-semibold">Cartes secrètes et spéciales</h2>
		{@render grid(secretCards)}
	{/if}
{/if}
