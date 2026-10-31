import type { PSM, Worker } from 'tesseract.js';
import { parseCardNumber } from '$lib/utils/cardNumber';
import { binarized, contrasted, resized } from './imageOps';

// Reads the printed number ("025/198") on a CLOSE-UP of it, in the browser, with Tesseract.js
// (D33, D38). The viewfinder crops the frame to the number; a photo taken without it should be a
// close-up too. Free; the English model is downloaded on the first scan (~4 MB), then cached.

/** Width the close-up is brought to: digits around 60-100 px high, Tesseract's comfort zone. */
const WORK_WIDTH = 1200;

let workerPromise: Promise<Worker> | null = null;

/** One worker reused across scans (loading the model is the slow part). */
function getWorker(): Promise<Worker> {
	workerPromise ??= (async () => {
		// Imported on demand: the OCR engine is only downloaded when the user scans.
		const { createWorker } = await import('tesseract.js');
		const worker = await createWorker('eng');
		// Digits and the slash only: the rest of the card is noise for us.
		await worker.setParameters({ tessedit_char_whitelist: '0123456789/' });
		return worker;
	})().catch((err) => {
		workerPromise = null; // retry on the next scan
		throw err;
	});
	return workerPromise;
}

type PageSegMode = '6' | '11'; // Tesseract: 6 = one block of text, 11 = scattered text

/**
 * Three readings of the same close-up; the number read most often wins (majority vote), a tie goes
 * to the most reliable one (listed first). Measured on 2026-10-31 on close-ups of 5 cards (number
 * area cropped from official images, every combination of preparation × mode × width):
 *   binarized + mode 11 + 1200 px: 5/5 · binarized + mode 6: 4/5 (abstains when unsure) ·
 *   contrasted + mode 11: 4/5 · « single line » mode 7: 0/5 (the frame also holds the year and
 *   small print) · an inverted binarization reads exactly like the plain one (Tesseract already
 *   inverts light-on-dark text), so it would only vote twice for the same mistake.
 */
const PASSES: { prepare: (image: HTMLCanvasElement) => HTMLCanvasElement; psm: PageSegMode }[] = [
	{ prepare: binarized, psm: '11' },
	{ prepare: binarized, psm: '6' },
	{ prepare: contrasted, psm: '11' }
];

/** The card number on a close-up image ("025/198"), or null when no reading finds one. */
export async function readCardNumber(image: HTMLCanvasElement | ImageBitmap): Promise<string | null> {
	const worker = await getWorker();
	const base = resized(image, WORK_WIDTH);
	const votes = new Map<string, number>();
	for (const pass of PASSES) {
		await worker.setParameters({ tessedit_pageseg_mode: pass.psm as PSM });
		const { data } = await worker.recognize(pass.prepare(base));
		const cardNumber = parseCardNumber(data.text);
		if (cardNumber) votes.set(cardNumber, (votes.get(cardNumber) ?? 0) + 1);
	}
	// Most votes first; on a tie, the first one read (Map keeps insertion order).
	let best: string | null = null;
	for (const [cardNumber, count] of votes) if (!best || count > votes.get(best)!) best = cardNumber;
	return best;
}

/** Same, from a photo file (fallback when the live camera is unavailable). */
export async function readCardNumberFromFile(file: File): Promise<string | null> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	try {
		return await readCardNumber(bitmap);
	} finally {
		bitmap.close();
	}
}
