<script lang="ts">
	import { Badge } from '@guillaumeg/ui';
	import CardImage from '$lib/components/card/CardImage.svelte';
	import type { SetCardVM } from '$lib/viewmodels/completion';

	// The cards of a set for a profile: owned ones in colour (a click lists their lots, D32),
	// missing ones greyed out (a click opens the card page to add it to the profile).
	let {
		cards,
		officialCount,
		profileId,
		onOpenLots
	}: {
		cards: SetCardVM[];
		officialCount: number;
		profileId: string;
		onOpenLots: (card: SetCardVM) => void;
	} = $props();
</script>

{#snippet tile(card: SetCardVM)}
	<div class="relative {card.quantity === 0 ? 'opacity-40 grayscale' : ''}">
		<CardImage
			imageUrl={card.imageUrl}
			name={card.name}
			number="{card.localId}/{officialCount}"
			setName={null}
			lazy
			class="rounded-md"
		/>
		{#if card.quantity > 0}
			<span class="absolute top-1 right-1"><Badge label="×{card.quantity}" variant="primary" size="sm" /></span>
		{/if}
	</div>
	<span class="truncate text-left text-xs {card.quantity === 0 ? 'opacity-60' : 'font-semibold'}">
		{card.localId} · {card.name}
	</span>
{/snippet}

<ul class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
	{#each cards as card (card.id)}
		<li>
			{#if card.quantity > 0}
				<!-- A whole card tile is the click target: no component of the UI library fits it. -->
				<button
					type="button"
					class="flex w-full cursor-pointer flex-col gap-1 rounded-lg p-1 hover:opacity-80"
					aria-label="{card.name} n° {card.localId}, possédée ×{card.quantity} : voir les lots"
					onclick={() => onOpenLots(card)}
				>
					{@render tile(card)}
				</button>
			{:else}
				<a
					href="/cartes/{card.id}?profil={profileId}"
					class="flex flex-col gap-1 rounded-lg p-1 hover:opacity-80"
					aria-label="{card.name} n° {card.localId}, manquante : l'ajouter"
				>
					{@render tile(card)}
				</a>
			{/if}
		</li>
	{/each}
</ul>
