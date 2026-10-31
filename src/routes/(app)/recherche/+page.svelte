<script lang="ts">
	import { goto } from '$app/navigation';
	import { Alert, Button, EmptyState, Input, toast } from '@guillaumeg/ui';
	import { ChevronLeft, ChevronRight, Search, SearchX } from '@lucide/svelte';
	import CardImage from '$lib/components/card/CardImage.svelte';
	import ScanButton from '$lib/components/scan/ScanButton.svelte';
	import { cardHref, searchHref } from '$lib/utils/searchUrl';

	let { data } = $props();

	/** The number read on the photo becomes the search; the field stays editable to fix a misread. */
	async function searchScanned(cardNumber: string) {
		await goto(searchHref({ q: cardNumber, profileId: data.profileId }));
		toast.info(`Numéro lu : ${cardNumber}. Corrige-le dans le champ s'il est faux.`);
	}

	const search = $derived(data.search);
	// The query, page and profile travel in every link: a card page can lead back to these results.
	const pageHref = (page: number) => searchHref({ q: search.query, page, profileId: data.profileId });
	const resultHref = (id: string) => cardHref(id, { q: search.query, page: search.page, profileId: data.profileId });
</script>

<svelte:head>
	<title>Recherche · Pokémon Binder</title>
</svelte:head>

<div class="mb-4 flex items-center justify-between gap-2">
	<h1 class="text-2xl font-bold">Rechercher une carte</h1>
	<ScanButton onRead={searchScanned} />
</div>

<form method="GET" class="mb-6 flex items-end gap-2">
	{#if data.profileId}
		<input type="hidden" name="profil" value={data.profileId} />
	{/if}
	<div class="flex-1">
		<Input
			name="q"
			type="search"
			value={search.query}
			icon={Search}
			placeholder="Pikachu, 025, 025/198…"
			hint="Par nom ou par numéro (en bas de la carte). Ou « Scanner » : vise le numéro dans le cadre."
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
	{#if search.ignoredTotal}
		<div class="mb-4">
			<Alert variant="info" dismissible={false}>
				Aucune extension ne compte {search.ignoredTotal} cartes (numéro mal lu ?) : voici toutes les cartes avec ce numéro.
			</Alert>
		</div>
	{/if}
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
		{#each search.results as card (card.id)}
			<li>
				<a href={resultHref(card.id)} class="flex flex-col gap-1 rounded-lg p-1 hover:opacity-80">
					<CardImage
						imageUrl={card.imageUrl}
						name={card.name}
						number={card.set ? `${card.localId}/${card.set.officialCount}` : card.localId}
						setName={card.set?.name ?? null}
						setLogoUrl={card.set?.logoUrl}
						lazy
						class="rounded-md"
					/>
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
