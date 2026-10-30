<script lang="ts">
	import { Button } from '@guillaumeg/ui';
	import { LogIn } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Connexion · Pokémon Binder</title>
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-4 text-center">
	<h1 class="text-3xl font-bold">Pokémon Binder</h1>
	<p>Ton classeur numérique de cartes Pokémon : retrouve la valeur de tes cartes et suis ta collection.</p>
	<!-- Full page navigation: /auth/login redirects to the hub, it must not be preloaded. -->
	<Button href="/auth/login" icon={LogIn} size="lg" data-sveltekit-reload data-sveltekit-preload-data="off">
		Se connecter avec G2 Hub
	</Button>
	<p class="text-sm opacity-70">Accès sur invitation.</p>
</main>
