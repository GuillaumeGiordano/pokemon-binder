<script lang="ts">
	import { Button, toast } from '@guillaumeg/ui';
	import { Camera } from '@lucide/svelte';
	import ScanViewfinder from '$lib/components/scan/ScanViewfinder.svelte';
	import { readCardNumber, readCardNumberFromFile } from '$lib/scan/cardNumberOcr';

	// « Scanner » : opens the live viewfinder (D38) and reads the card number in its frame (OCR),
	// then hands it over (e.g. to the search). Without a usable camera (refused, no HTTPS, computer
	// without webcam), it falls back to a photo of the number taken in close-up.
	let { onRead }: { onRead: (cardNumber: string) => void } = $props();

	let input = $state<HTMLInputElement | null>(null);
	let viewfinderOpen = $state(false);
	let reading = $state(false);

	const UNREADABLE = 'Numéro illisible : rapproche-toi, évite les reflets et réessaie.';

	function openScanner() {
		// `mediaDevices` is missing outside HTTPS (and on old browsers), despite what the types say.
		if (typeof navigator.mediaDevices?.getUserMedia === 'function') viewfinderOpen = true;
		else input?.click();
	}

	/** The camera cannot be used: close the viewfinder and take a photo instead. */
	function fallBackToPhoto(error: unknown) {
		console.warn('[pokemon-binder] live camera unavailable, falling back to a photo', error);
		viewfinderOpen = false;
		toast.info('Caméra indisponible : prends une photo du numéro, en gros plan.');
		input?.click();
	}

	/** Reads a capture; the viewfinder stays open on failure so the user can aim again. */
	async function read(source: () => Promise<string | null>) {
		reading = true;
		try {
			const cardNumber = await source();
			if (cardNumber) {
				viewfinderOpen = false;
				onRead(cardNumber);
			} else {
				toast.warning(UNREADABLE);
			}
		} catch (err) {
			console.error('[pokemon-binder] scan failed', err);
			toast.error('La lecture a échoué. Réessaie, ou tape le numéro.');
		} finally {
			reading = false;
		}
	}

	function onPhoto(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = ''; // the same photo can be picked again
		if (file) read(() => readCardNumberFromFile(file));
	}
</script>

<!-- Hidden: FileInput of the UI library has no `capture` (camera) nor change callback. -->
<input bind:this={input} type="file" accept="image/*" capture="environment" class="hidden" onchange={onPhoto} />
<Button variant="secondary" icon={Camera} loading={reading && !viewfinderOpen} onclick={openScanner}>
	{reading && !viewfinderOpen ? 'Lecture…' : 'Scanner'}
</Button>

{#if viewfinderOpen}
	<ScanViewfinder
		{reading}
		onCapture={(image) => read(() => readCardNumber(image))}
		onClose={() => (viewfinderOpen = false)}
		onUnavailable={fallBackToPhoto}
	/>
{/if}
