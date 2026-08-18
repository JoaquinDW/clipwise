/**
 * One card per clip, not one per render.
 *
 * Every edit is persisted as a new Clip row hanging off the original
 * (`parentClipId`), which keeps the history intact but would otherwise fill the
 * clip list with near-duplicates — and Download renders on demand, so those pile
 * up fast. The list shows the original of each lineage; the renders stay in the
 * database as a cache, out of sight.
 *
 * The original is the representative on purpose, not just for tidiness: renders
 * have captions burned into the pixels, so editing one would stack a second set
 * of captions on top of the first and the player would draw its live overlay
 * over the burned-in text. The editable clip must stay caption-free.
 */

export interface LineageClip {
  id: string;
  parentClipId?: string | null;
}

/** Lineages are flat: the reexport route always parents new renders to the root. */
export function lineageRootId(clip: LineageClip): string {
  return clip.parentClipId ?? clip.id;
}

/**
 * Drop the renders, keep the originals — preserving the incoming order (the
 * caller sorts by score).
 *
 * A render only ever exists once its original reached READY, so discarding them
 * can never leave a lineage without a card to show.
 */
export function collapseLineages<T extends LineageClip>(clips: T[]): T[] {
  return clips.filter((clip) => !clip.parentClipId);
}

/**
 * Map a clip id onto the card that actually renders it, so a `?clip=` pointing
 * at a hidden edit still opens the right clip instead of nothing.
 */
export function resolveVisibleClipId<T extends LineageClip>(
  visible: T[],
  all: T[],
  clipId: string | null | undefined
): string | null {
  if (!clipId) return null;
  if (visible.some((c) => c.id === clipId)) return clipId;

  const target = all.find((c) => c.id === clipId);
  if (!target) return null;

  const root = lineageRootId(target);
  return visible.find((c) => lineageRootId(c) === root)?.id ?? null;
}
