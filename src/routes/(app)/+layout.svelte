<script lang="ts">
	import { Button, ThemeToggle } from '@guillaumeg/ui';
	import { LogOut, Search } from '@lucide/svelte';

	let { data, children } = $props();
</script>

<header class="mx-auto flex max-w-5xl items-center justify-between gap-2 p-4">
	<a href="/" class="text-xl font-bold">Pokémon Binder</a>
	<div class="flex items-center gap-2">
		<Button href="/recherche" variant="ghost" icon={Search} aria-label="Rechercher une carte" />		<span class="hidden text-sm sm:inline">{data.user.name || data.user.email}</span>
		<ThemeToggle />
		<form method="POST" action="/auth/logout">
			<Button type="submit" variant="ghost" icon={LogOut} aria-label="Se déconnecter" />
		</form>
	</div>
</header>

<main class="mx-auto max-w-5xl p-4">
	{@render children()}
</main>
