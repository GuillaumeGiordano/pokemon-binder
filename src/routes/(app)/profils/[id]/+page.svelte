<script lang="ts">
	import { enhance } from '$app/forms';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { Alert, Button, EmptyState, Input, Modal, Progress, Tabs, toast } from '@guillaumeg/ui';
	import { ArrowLeft, Pencil, Search, Trash2 } from '@lucide/svelte';
	import ProfileCardList from '$lib/components/profile/ProfileCardList.svelte';
	import { formatEur } from '$lib/utils/format';

	let { data, form } = $props();

	const profile = $derived(data.profile);

	// Two tabs (D40): the sets, or every card as a list. The tab lives in the URL (`?onglet=cartes`)
	// so that coming back from a lot page lands on the same tab.
	const TABS = [
		{ id: 'extensions', label: 'Extensions' },
		{ id: 'cartes', label: 'Mes cartes' }
	];
	const tab = $derived(page.url.searchParams.get('onglet') === 'cartes' ? 'cartes' : 'extensions');
	function selectTab(id: string) {
		const url = new URL(page.url);
		if (id === 'cartes') url.searchParams.set('onglet', 'cartes');
		else url.searchParams.delete('onglet');
		replaceState(url, {});
	}
	let editing = $state(false);

	const DELETE_MODAL_ID = 'profile-delete';
	const deleteModal = () => document.getElementById(DELETE_MODAL_ID) as HTMLDialogElement | null;
	let deleting = $state(false);
</script>

<svelte:head>
	<title>{profile.name} · Pokémon Binder</title>
</svelte:head>

<Button href="/" variant="ghost" icon={ArrowLeft}>Profils</Button>

<div class="mt-4 mb-4 flex flex-wrap items-center justify-between gap-2">
	{#if editing}
		<form
			method="POST"
			action="?/rename"
			class="flex flex-1 items-end gap-2"
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type === 'success') {
						toast.success('Profil renommé.');
						editing = false;
					}
					await update();
				}}
		>
			<div class="flex-1">
				<Input name="name" label="Nom du profil" value={profile.name} maxlength={60} required />
			</div>
			<Button type="submit">Enregistrer</Button>
			<Button variant="ghost" onclick={() => (editing = false)}>Annuler</Button>
		</form>
	{:else}
		<div>
			<h1 class="text-2xl font-bold">{profile.name}</h1>
			<p class="opacity-70">
				Valeur : <strong>{formatEur(profile.value)}</strong> · {profile.cardCount} carte{profile.cardCount > 1 ? 's' : ''}
				{#if profile.unpricedCount > 0}· {profile.unpricedCount} sans cote{/if}
			</p>
		</div>
		<div class="flex gap-2">
			<Button href="/recherche?profil={profile.id}" icon={Search}>Ajouter une carte</Button>
			<Button variant="ghost" icon={Pencil} aria-label="Renommer" onclick={() => (editing = true)} />
			<Button variant="ghost" icon={Trash2} aria-label="Supprimer" onclick={() => deleteModal()?.showModal()} />
		</div>
	{/if}
</div>

{#if form?.message}
	<div class="mb-4"><Alert variant="error" dismissible={false}>{form.message}</Alert></div>
{/if}

{#if profile.sets.length === 0}
	<EmptyState
		icon={Search}
		title="Aucune carte"
		description="Recherche une carte puis ajoute-la à ce profil."
		cta={{ label: 'Rechercher une carte', href: `/recherche?profil=${profile.id}` }}
	/>
{:else}
	<Tabs tabs={TABS} variant="underline" bind:value={() => tab, selectTab}>
		{#snippet children(active)}
			<div class="mt-4">
				{#if active === 'cartes'}
					<ProfileCardList items={profile.items} />
				{:else}
					{@render setList()}
				{/if}
			</div>
		{/snippet}
	</Tabs>
{/if}

{#snippet setList()}
	<ul class="grid grid-cols-1 gap-3 md:grid-cols-2">
		{#each profile.sets as set (set.id)}
			<li>
				<a href="/profils/{profile.id}/extensions/{set.id}" class="flex flex-col gap-2 rounded-lg border p-4 hover:opacity-80">
					<div class="flex items-center justify-between gap-2">
						<span class="flex min-w-0 items-center gap-2">
							{#if set.logoUrl}
								<img src={set.logoUrl} alt="" class="h-6 max-w-16 object-contain" />
							{/if}
							<span class="truncate font-semibold">{set.name}</span>
						</span>
						<span class="text-sm font-bold">{set.percent} %</span>
					</div>
					<Progress
						value={set.ownedOfficial}
						max={Math.max(1, set.officialCount)}
						color={set.percent === 100 ? 'success' : 'primary'}
					/>
					<p class="flex justify-between text-sm opacity-70">
						<span>
							{set.ownedOfficial}/{set.officialCount}
							{#if set.secretCount > 0 || set.ownedSecret > 0}(+{set.ownedSecret} secrète{set.ownedSecret > 1
									? 's'
									: ''}{set.secretCount > 0 ? ` sur ${set.secretCount}` : ''}){/if}
						</span>
						<span>{formatEur(set.value)}</span>
					</p>
				</a>
			</li>
		{/each}
	</ul>
{/snippet}

<Modal id={DELETE_MODAL_ID} title="Supprimer ce profil ?" size="sm">
	<p class="mb-4">
		Le profil <strong>« {profile.name} »</strong>
		{#if profile.cardCount > 0}
			et ses <strong>{profile.cardCount} carte{profile.cardCount > 1 ? 's' : ''}</strong> seront supprimés.
		{:else}
			sera supprimé.
		{/if}
		Cette action est <strong>irréversible</strong>.
	</p>
	<form
		method="POST"
		action="?/delete"
		class="flex justify-end gap-2"
		use:enhance={() => {
			deleting = true;
			return async ({ result, update }) => {
				deleting = false;
				if (result.type === 'redirect') toast.success('Profil supprimé.');
				deleteModal()?.close();
				await update();
			};
		}}
	>
		<Button variant="ghost" onclick={() => deleteModal()?.close()}>Annuler</Button>
		<Button type="submit" variant="danger" icon={Trash2} loading={deleting}>Supprimer définitivement</Button>
	</form>
</Modal>
