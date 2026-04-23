import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/**
 * Fractional indexing for kanban ordering.
 *
 * Why this approach:
 *   - Inserting a card between two siblings is one row UPDATE on the moved
 *     card — no need to renumber everyone else.
 *   - Survives page refresh because the value lives in the DB.
 *   - Sorts lexicographically, which Postgres indexes natively.
 *
 * Edge cases handled by `fractional-indexing`:
 *   - generateKeyBetween(null, null)         → first key ever
 *   - generateKeyBetween(prev, null)         → append to end
 *   - generateKeyBetween(null, next)         → prepend to start
 *   - generateKeyBetween(prev, next)         → splice between two siblings
 *
 * If two clients insert "between A and B" simultaneously they may collide;
 * that's acceptable for our scale and would only flicker until the next reload.
 * For higher concurrency we'd add a UNIQUE(parent, position) constraint and
 * retry-on-conflict, but that is out of scope here.
 */

/** Compute the new position string for an item being inserted at `index`
 *  inside a list whose current positions (sorted ascending) are `siblings`. */
export function positionForIndex(
  siblings: string[],
  index: number
): string {
  const before = index > 0 ? siblings[index - 1] : null;
  const after = index < siblings.length ? siblings[index] : null;
  return generateKeyBetween(before, after);
}

/** Generate N evenly-spaced positions between two anchors. Useful for seeding. */
export function positionsBetween(
  before: string | null,
  after: string | null,
  n: number
): string[] {
  return generateNKeysBetween(before, after, n);
}

/** Append to the end of a list. */
export function positionAtEnd(siblings: string[]): string {
  const last = siblings.length ? siblings[siblings.length - 1] : null;
  return generateKeyBetween(last, null);
}

/** When moving an item *within* the same list to a new visual index,
 *  exclude the item itself from the sibling array first. */
export function moveWithinList(
  siblingsExcludingMoved: string[],
  toIndex: number
): string {
  return positionForIndex(siblingsExcludingMoved, toIndex);
}
