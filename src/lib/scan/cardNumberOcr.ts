import type { PSM, Worker } from 'tesseract.js';
import { parseCardNumber } from '$lib/utils/cardNumber';

// Reads the printed number ("025/198") on a card photo, in the browser, with Tesseract.js
// (OCR, option A of the scan, D33). Free; the English model is downloaded on the first scan
// (~4 MB), then cached by the browser.

/** Photos from a phone are huge (12 MP): this width is enough to read the number, and much faster. */
const MAX_WIDTH = 1600;

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

/** A part of the photo to read: from `fromY` (0 = top) to the bottom, the left `width` of it, enlarged `zoom` times. */
type Pass = { fromY: number; width: number; zoom: number; psm: PageSegMode };
type PageSegMode = '6' | '11'; // Tesseract: 6 = one block of text, 11 = scattered text

/**
 * Several readings of the same photo; the number read most often wins (majority vote). Measured on
 * official card images (2026-10-30): no single crop / zoom reads reliably (e.g. 025/198 read as
 * 025/195 on one of them), but most of them read it right. The crops assume the whole card upright:
 * the number is printed at the bottom left.
 */
const PASSES: Pass[] = [
	{ fromY: 0, width: 1, zoom: 1, psm: '11' }, // whole photo
	{ fromY: 0.66, width: 1, zoom: 1, psm: '11' }, // bottom third
	{ fromY: 0.88, width: 0.5, zoom: 1, psm: '11' }, // bottom-left strip
	{ fromY: 0.88, width: 0.5, zoom: 2, psm: '11' }, // same, enlarged
	{ fromY: 0.88, width: 0.5, zoom: 1, psm: '6' } // same, read as one block
];

/** A copy of part of the photo, as `pass` describes it. */
function crop(bitmap: ImageBitmap, pass: Pass): HTMLCanvasElement {
	const sourceY = Math.round(bitmap.height * pass.fromY);
	const sourceWidth = Math.round(bitmap.width * pass.width);
	const sourceHeight = bitmap.height - sourceY;
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(sourceWidth * pass.zoom);
	canvas.height = Math.round(sourceHeight * pass.zoom);
	canvas.getContext('2d')!.drawImage(bitmap, 0, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
	return canvas;
}

/** The photo at most MAX_WIDTH wide (a 12 MP photo is far bigger than needed, and slow to read). */
async function loadPhoto(file: File): Promise<ImageBitmap> {
	const original = await createImageBitmap(file, { imageOrientation: 'from-image' });
	if (original.width <= MAX_WIDTH) return original;
	const height = Math.round((original.height * MAX_WIDTH) / original.width);
	const resized = await createImageBitmap(original, { resizeWidth: MAX_WIDTH, resizeHeight: height, resizeQuality: 'high' });
	original.close();
	return resized;
}

/** The card number read on the photo ("025/198"), or null when no reading finds one. */
export async function readCardNumber(file: File): Promise<string | null> {
	const [worker, bitmap] = await Promise.all([getWorker(), loadPhoto(file)]);
	try {
		const votes = new Map<string, number>();
		for (const pass of PASSES) {
			await worker.setParameters({ tessedit_pageseg_mode: pass.psm as PSM });
			const { data } = await worker.recognize(crop(bitmap, pass));
			const cardNumber = parseCardNumber(data.text);
			if (cardNumber) votes.set(cardNumber, (votes.get(cardNumber) ?? 0) + 1);
		}
		// Most votes first; on a tie, the first one read (Map keeps insertion order).
		let best: string | null = null;
		for (const [cardNumber, count] of votes) if (!best || count > votes.get(best)!) best = cardNumber;
		return best;
	} finally {
		bitmap.close();
	}
}
