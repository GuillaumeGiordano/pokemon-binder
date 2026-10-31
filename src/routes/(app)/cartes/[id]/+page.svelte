<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Badge, Breadcrumb, Button, Card, Input, NumberInput, Select, toast } from '@guillaumeg/ui';
	import { Plus, Search } from '@lucide/svelte';
	import CardImage from '$lib/components/card/CardImage.svelte';
	import { CARD_VARIANTS, CARD_VARIANT_LABELS } from '$lib/records/card';
	import {
		CARD_CONDITIONS,
		CARD_CONDITION_LABELS,
		CARD_LANGUAGES,
		CARD_LANGUAGE_LABELS
	} from '$lib/records/collection';
	import { formatDay, formatEur } from '$lib/utils/format';

	let { data, form } = $props();

	const card = $derived(data.card);
	// Every variant can be picked (D35): TCGdex's list is incomplete, the card in hand is the proof.
	// The ones TCGdex knows come first (the first one is preselected), the others are flagged.
	const variantOptions = $derived([
		...card.variants.map((v) => ({ value: v, label: CARD_VARIANT_LABELS[v] })),
		...CARD_VARIANTS.filter((v) => !card.variants.includes(v)).map((v) => ({
			value: v,
			label: `${CARD_VARIANT_LABELS[v]} (non répertoriée)`
		}))
	]);
	const conditionOptions = CARD_CONDITIONS.map((c) => ({ value: c, label: `${c} — ${CARD_CONDITION_LABELS[c]}` }));
	const languageOptions = CARD_LANGUAGES.map((l) => ({ value: l, label: CARD_LANGUAGE_LABELS[l] }));
	const profileOptions = $derived(data.profiles.map((p) => ({ value: p.id, label: p.name })));

	let quantity = $state(1);
</script>

<svelte:head>
	<title>{card.name} · Pokémon Binder</title>
</svelte:head>

{#if data.crumbs}
	<div class="mb-4"><Breadcrumb items={data.crumbs} /></div>
{/if}

<div class="flex flex-col gap-6 md:flex-row">
	<div class="mx-auto w-full max-w-xs md:mx-0">
		<CardImage
			imageUrl={card.imageUrl}
			name={card.name}
			number="{card.localId}/{card.set.officialCount}"
			setName={card.set.name}
			setLogoUrl={card.set.logoUrl}
			class="rounded-xl"
		/>
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

		<Card>
		<section class="flex flex-col gap-3">
			<h2 class="font-semibold">Ajouter à un profil</h2>
			{#if data.profiles.length === 0}
				<p class="opacity-70">Tu n'as pas encore de profil.</p>
				<Button href="/" variant="secondary">Créer un profil</Button>
			{:else}
				<form
					method="POST"
					action="?/add"
					class="grid grid-cols-1 gap-3 sm:grid-cols-2"
					use:enhance={() =>
						async ({ result, update }) => {
							if (result.type === 'success')
								toast.success(result.data?.merged ? 'Ajouté au lot existant.' : 'Ajouté au profil.');
							await update({ reset: false });
						}}
				>
					<Select
						name="profileId"
						label="Profil"
						options={profileOptions}
						value={data.selectedProfileId ?? undefined}
						required
					/>
					<Select name="variant" label="Variante" options={variantOptions} value={variantOptions[0].value} required />
					<Select name="condition" label="État" options={conditionOptions} value="NM" required />
					<Select name="language" label="Langue" options={languageOptions} value="FR" required />
					<div>
						<NumberInput label="Quantité" bind:value={quantity} min={1} max={999} />
						<input type="hidden" name="quantity" value={quantity} />
					</div>
					<Input name="purchaseUnitPrice" label="Prix payé par carte (€)" placeholder="Ex. 4,50" hint="Facultatif" />
					<div class="sm:col-span-2">
						<Button type="submit" icon={Plus}>Ajouter</Button>
					</div>
				</form>
				{#if form?.message}
					<Alert variant="error" dismissible={false}>{form.message}</Alert>
				{:else if form?.itemId}
					<!-- After an add, the next card is the usual next step: back to the results. -->
					<div class="flex flex-wrap items-center gap-3">
						<Button href={data.nextCardHref} icon={Search}>Ajouter une autre carte</Button>
						<a href="/lots/{form.itemId}" class="text-sm underline">Voir le lot</a>
					</div>
				{/if}
			{/if}
		</section>
		</Card>
	</div>
</div>
