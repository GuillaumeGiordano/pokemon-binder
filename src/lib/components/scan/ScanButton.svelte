<script lang="ts">
	import { Button, toast } from '@guillaumeg/ui';
	import { Camera } from '@lucide/svelte';
	import { readCardNumber } from '$lib/scan/cardNumberOcr';

	// « Scanner » : opens the phone's camera, reads the card number on the photo (OCR) and hands it
	// over (e.g. to the search). On a computer, it opens the file picker instead.
	let { onRead }: { onRead: (cardNumber: string) => void } = $props();

	let input = $state<HTMLInputElement | null>(null);
	let reading = $state(false);

	async function onPhoto(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = ''; // the same photo can be picked again
		if (!file) return;
		reading = true;
		try {
			const cardNumber = await readCardNumber(file);
			if (cardNumber) onRead(cardNumber);
			else toast.warning('Numéro illisible : photographie toute la carte, droite et sans reflet, puis réessaie.');
		} catch (err) {
			console.error('[pokemon-binder] scan failed', err);
			toast.error('La lecture de la photo a échoué. Réessaie, ou tape le numéro.');
		} finally {
			reading = false;
		}
	}
</script>

<!-- Hidden: FileInput of the UI library has no `capture` (camera) nor change callback. -->
<input bind:this={input} type="file" accept="image/*" capture="environment" class="hidden" onchange={onPhoto} />
<Button variant="secondary" icon={Camera} loading={reading} onclick={() => input?.click()}>
	{reading ? 'Lecture…' : 'Scanner'}
</Button>
