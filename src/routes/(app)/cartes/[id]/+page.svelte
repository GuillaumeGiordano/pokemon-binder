<script lang="ts">
	import { Alert, Badge } from '@guillaumeg/ui';
	import { CARD_VARIANT_LABELS } from '$lib/records/card';
	import { formatDay, formatEur } from '$lib/utils/format';

	let { data } = $props();

	const card = $derived(data.card);
</script>

<svelte:head>
	<title>{card.name} · Pokémon Binder</title>
</svelte:head>

<div class="flex flex-col gap-6 md:flex-row">
	<div class="mx-auto w-full max-w-xs md:mx-0">
		{#if card.imageUrl}
			<img src={card.imageUrl} alt={card.name} class="aspect-[5/7] w-full rounded-xl object-cover" />
		{:else}
			<div class="flex aspect-[5/7] w-full items-center justify-center rounded-xl border opacity-60">Pas d'image</div>
		{/if}
	</div>

	<div class="flex flex-1 flex-col gap-4">
		<div>
			<h1 class="text-2xl font-bold">{card.name}</h1>
			<p class="opacity-70">
				{card.set.name} · n° {card.localId}/{card.set.officialCount}{card.rarity ? ` · ${card.rarity}` : ''}
			</p>
		</div>

		{#if card.stale}
			<Alert variant="warning" dismissible={false}>
				TCGdex ne répond pas : ces informations peuvent dater un peu.
			</Alert>
		{/if}

		{#if card.variants.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each card.variants as variant (variant)}
					<Badge label={CARD_VARIANT_LABELS[variant]} />
				{/each}
			</div>
		{/if}

		<section class="flex flex-col gap-1">
			<h2 class="font-semibold">Cote Cardmarket (tendance)</h2>
			{#if card.price}
				<p class="text-3xl font-bold">{formatEur(card.price.trend)}</p>
				{#if card.price.trendHolo !== null}
					<p>Reverse / holo : <strong>{formatEur(card.price.trendHolo)}</strong></p>
				{/if}
				<p class="text-sm opacity-70">Au {formatDay(card.price.date)}, toutes langues et tous états confondus.</p>
			{:else}
				<p class="opacity-70">Pas de cote disponible pour cette carte.</p>
			{/if}
		</section>
	</div>
</div>
