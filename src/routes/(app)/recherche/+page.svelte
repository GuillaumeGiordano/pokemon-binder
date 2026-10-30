<script lang="ts">
	import { Alert, Button, EmptyState, Input } from '@guillaumeg/ui';
	import { ChevronLeft, ChevronRight, Search, SearchX } from '@lucide/svelte';

	let { data } = $props();

	const search = $derived(data.search);
	const pageHref = (page: number) => `?q=${encodeURIComponent(search.query)}&page=${page}`;
</script>

<svelte:head>
	<title>Recherche · Pokémon Binder</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Rechercher une carte</h1>

<form method="GET" class="mb-6 flex items-end gap-2">
	<div class="flex-1">
		<Input
			name="q"
			type="search"
			value={search.query}
			icon={Search}
			placeholder="Pikachu, 025, 025/198…"
			hint="Par nom ou par numéro (celui imprimé en bas de la carte)."
		/>
	</div>
	<Button type="submit">Rechercher</Button>
</form>

{#if search.unavailable}
	<Alert variant="warning" title="TCGdex indisponible" dismissible={false}>
		La base de cartes ne répond pas pour le moment. Réessaie dans quelques minutes.
	</Alert>
{:else if search.query && search.results.length === 0}
	<EmptyState icon={SearchX} title="Aucune carte trouvée" description="Vérifie l'orthographe ou essaie avec le numéro." />
{:else if search.results.length > 0}
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
		{#each search.results as card (card.id)}
			<li>
				<a href="/cartes/{card.id}" class="flex flex-col gap-1 rounded-lg p-1 hover:opacity-80">
					{#if card.imageUrl}
						<img src={card.imageUrl} alt={card.name} loading="lazy" class="aspect-[5/7] w-full rounded-md object-cover" />
					{:else}
						<div class="flex aspect-[5/7] w-full items-center justify-center rounded-md border text-sm opacity-60">
							Pas d'image
						</div>
					{/if}
					<span class="truncate text-sm font-semibold">{card.name}</span>
					<span class="truncate text-xs opacity-70">
						{card.localId}{card.set ? `/${card.set.officialCount} · ${card.set.name}` : ''}
					</span>
				</a>
			</li>
		{/each}
	</ul>

	<nav class="mt-6 flex justify-between">
		{#if search.page > 1}
			<Button href={pageHref(search.page - 1)} variant="secondary" icon={ChevronLeft}>Précédent</Button>
		{:else}
			<span></span>
		{/if}
		{#if search.hasNextPage}
			<Button href={pageHref(search.page + 1)} variant="secondary" iconRight={ChevronRight}>Suivant</Button>
		{/if}
	</nav>
{/if}
