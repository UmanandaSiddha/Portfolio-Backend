import { createHash } from "node:crypto";

/**
 * Returns a Gravatar URL for an email. Defaults to the `retro` identicon
 * so users who don't have a Gravatar still get a deterministic, pleasant
 * fallback instead of a stranger's face or a question mark.
 *
 * Email comparison on Gravatar is case-insensitive and trimmed; we hash the
 * normalised form per the documented spec.
 *
 * Pass `size` to request a specific pixel size (defaults to 160).
 */
export function gravatarUrl(
  email: string,
  opts: { size?: number; default?: "retro" | "identicon" | "monsterid" | "wavatar" | "robohash" | "mp" } = {},
): string {
  const normalised = email.trim().toLowerCase();
  const hash = createHash("sha256").update(normalised).digest("hex");
  const size = opts.size ?? 160;
  const fallback = opts.default ?? "retro";
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${fallback}`;
}
