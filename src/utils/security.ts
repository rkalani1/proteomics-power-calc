/**
 * Escapes special characters for use in HTML to prevent XSS.
 */
export const escapeHTML = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
