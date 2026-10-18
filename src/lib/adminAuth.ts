/** Constant-time check for the Worker ADMIN_TOKEN secret. */
export function adminAuthorized(header: string | null, alt: string | null, token: string | undefined): boolean {
  if (!token) return false;
  const provided = (header ?? "").toLowerCase().startsWith("bearer ") ? (header ?? "").slice(7).trim() : (alt ?? "");
  if (provided.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i += 1) diff |= provided.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
