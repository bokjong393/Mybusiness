/* Sharing and export.
 *
 * Web Share where the browser supports files, PNG download everywhere else,
 * copy-link as the last resort. Challenge links carry a day count and nothing
 * else — never a balance, spending figure or name.
 */

const MAX_CHALLENGE_DAYS = 400;

export async function nodeToPngBlob(node) {
  if (!node) throw new Error('Nothing to export.');
  // Imported on demand: most visitors never export a card, and this is one of
  // the heavier dependencies in the project.
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    // html-to-image renders onto a transparent canvas by default, which looks
    // broken in a chat thumbnail. Match the card's own ground.
    backgroundColor: '#0D0B08'
  });
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function downloadNodeAsPng(node, filename) {
  const blob = await nodeToPngBlob(node);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke late: some browsers abort the download if the URL dies too soon.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

/** @returns {'shared'|'downloaded'|'cancelled'} */
export async function shareNode(node, { filename, title, text, url }) {
  try {
    const blob = await nodeToPngBlob(node);
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return 'shared';
    }
    await downloadNodeAsPng(node, filename);
    return 'downloaded';
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelled';
    throw error;
  }
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Challenge URLs carry only a survival day count. */
export function buildChallengeUrl(days) {
  const safeDays = Math.max(0, Math.min(MAX_CHALLENGE_DAYS, Math.floor(Number(days) || 0)));
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/battle?challenge=${safeDays}`;
}

export function readChallengeDays(search) {
  const params = new URLSearchParams(search || '');
  const raw = params.get('challenge');
  if (raw === null) return null;
  const days = Number(raw);
  if (!Number.isFinite(days) || days < 0 || days > MAX_CHALLENGE_DAYS) return null;
  return Math.floor(days);
}
