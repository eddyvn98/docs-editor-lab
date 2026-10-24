import { Selection } from '@tiptap/pm/state';
import type { SelectionBookmark } from '@tiptap/pm/state';
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model';
import type { Mappable } from '@tiptap/pm/transform';

/** A real document selection, so clipboard, history and commands share one range. */
export class BlockRangeSelection extends Selection {
  constructor($anchor: ResolvedPos, $head: ResolvedPos) { super($anchor, $head); }
  visible = false;
  eq(other: Selection) { return other instanceof BlockRangeSelection && other.anchor === this.anchor && other.head === this.head; }
  map(doc: PMNode, mapping: Mappable): Selection {
    const from = mapping.map(this.from, 1), to = mapping.map(this.to, -1);
    return from < to ? BlockRangeSelection.create(doc, from, to) : Selection.near(doc.resolve(Math.min(from, doc.content.size)));
  }
  toJSON() { return { type: 'docsBlockRange', anchor: this.anchor, head: this.head }; }
  static fromJSON(doc: PMNode, json: { anchor: number; head: number }) { return BlockRangeSelection.create(doc, json.anchor, json.head); }
  static create(doc: PMNode, from: number, to: number): Selection {
    const a = Math.max(0, Math.min(from, to, doc.content.size));
    const b = Math.min(doc.content.size, Math.max(from, to, 0));
    const $a = doc.resolve(a), $b = doc.resolve(b);
    const start = $a.depth ? $a.before(1) : a;
    const end = $b.depth ? $b.after(1) : b;
    return start < end ? new BlockRangeSelection(doc.resolve(start), doc.resolve(end)) : Selection.near(doc.resolve(start));
  }
  getBookmark(): SelectionBookmark {
    const bookmark = (from: number, to: number): SelectionBookmark => ({
      map: mapping => bookmark(mapping.map(from, 1), mapping.map(to, -1)),
      resolve: doc => BlockRangeSelection.create(doc, from, to),
    });
    return bookmark(this.from, this.to);
  }
}
Selection.jsonID('docsBlockRange', BlockRangeSelection);

export function rootBlock(doc: PMNode, pos: number) {
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  const from = $pos.depth ? $pos.before(1) : $pos.pos;
  const node = doc.nodeAt(from);
  return node ? { from, to: from + node.nodeSize, node } : null;
}
