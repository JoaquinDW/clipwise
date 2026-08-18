/**
 * One card per clip, not one per render.
 *
 * Every edit is persisted as a new Clip row hanging off the original
 * (`parentClipId`), which keeps the history intact but would otherwise fill the
 * clip list with near-duplicates — and Download now renders on demand, so those
 * pile up fast. The list shows the newest usable version of each lineage; the
 * rest stay in the database, just out of sight.
 */

export interface LineageClip {
  id: string;
  parentClipId?: string | null;
  status: string;
  createdAt: Date;
}

/** Lineages are flat: the reexport route always parents new renders to the root. */
export function lineageRootId(clip: LineageClip): string {
  return clip.parentClipId ?? clip.id;
}

/**
 * Collapse each lineage to the version worth showing, preserving the incoming
 * order of the lineages themselves (the caller sorts by score).
 *
 * A finished render always wins over a newer one still in the queue, so the
 * card and the player stay usable while an edit renders in the background.
 */
export function collapseLineages<T extends LineageClip>(clips: T[]): T[] {
  const byRoot = new Map<string, T>();
  const rootOrder: string[] = [];

  for (const clip of clips) {
    const root = lineageRootId(clip);
    const current = byRoot.get(root);

    if (!current) {
      byRoot.set(root, clip);
      rootOrder.push(root);
      continue;
    }

    if (isBetterRepresentative(clip, current)) byRoot.set(root, clip);
  }

  return rootOrder.map((root) => byRoot.get(root)!);
}

function isBetterRepresentative(candidate: LineageClip, current: LineageClip): boolean {
  const candidateReady = candidate.status === 'READY';
  const currentReady = current.status === 'READY';

  if (candidateReady !== currentReady) return candidateReady;
  return candidate.createdAt.getTime() > current.createdAt.getTime();
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
