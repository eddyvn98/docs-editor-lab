import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouse } from 'react';
import type { Editor } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import { kindFor } from './logic';
import { findSlash } from './slashMatch';
import { DOCS_REQUEST } from './docsEvents';
import { blockFromDOM, captureTarget, remapTarget, restoreTarget } from './targets';
import type { Anchor, Hover, Popup } from './targets';
import { useBlockDrag } from './useBlockDrag';
import { focusBlock } from './actions';
export type { Anchor, Hover, Popup } from './targets';
export function useEditorUX(editor: Editor | null) {
  const [hover, setHover] = useState<Hover | null>(null), [popup, setPopupState] = useState<Popup | null>(null);
  const current = useRef<Popup | null>(null), dismissed = useRef<string | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<Anchor | null>(null);
  const drag = useBlockDrag(editor, hover, () => setHover(null));
  const commit = useCallback((value: Popup | null) => { current.current = value; setPopupState(value); }, []);
  const setPopup = useCallback((value: Popup | null) => { commit(value && editor ? captureTarget(editor, value) : value); }, [editor, commit]);
  const close = useCallback((restore = false) => {
    const value = current.current;
    if (value?.type === 'slash') dismissed.current = `${value.pos}:${value.command?.from}:${value.query || ''}`;
    commit(null); setSelectionAnchor(null);
    if (restore && value && editor) restoreTarget(editor, value);
  }, [editor, commit]);
  const trackSelection = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const selection = editor.state.selection;
    if (!(selection instanceof TextSelection) || selection.empty || !editor.isFocused) { setSelectionAnchor(null); return; }
    const start = editor.view.coordsAtPos(selection.from);
    setSelectionAnchor({ element: null, point: { x: start.left, y: start.top }, mode: 'selection', from: selection.from, to: selection.to });
  }, [editor]);
  useEffect(() => {
    if (!editor) return;
    const slash = () => {
      if (editor.view.composing || !editor.isFocused) return;
      const { selection } = editor.state;
      if (current.current && current.current.type !== 'slash') return;
      if (selection.empty && ['paragraph', 'heading'].includes(selection.$from.parent.type.name)) {
        const parent = selection.$from.parent;
        const text = parent.textBetween(0, parent.content.size, '\n', '\ufffc');
        const match = findSlash(text, selection.$from.parentOffset);
        if (match) {
          const pos = selection.$from.before(selection.$from.depth), from = pos + 1 + match.from;
          if (dismissed.current === `${pos}:${from}:${match.query}`) return;
          const rect = editor.view.coordsAtPos(selection.from);
          setPopup({ type: 'slash', block: kindFor(parent.type.name), pos, query: match.query,
            command: { from, to: pos + 1 + match.to, wholeLine: match.wholeLine },
            anchor: { element: null, point: { x: rect.left, y: rect.bottom + 8 }, mode: 'caret', from: selection.from } });
          setSelectionAnchor(null); return;
        }
      }
      dismissed.current = null;
      if (current.current?.type === 'slash') commit(null);
    };
    const transaction = ({ transaction: tr }: { transaction: Transaction }) => {
      if (!tr.docChanged) return;
      const active = current.current;
      if (active && active.type !== 'slash') commit(remapTarget(editor, active, tr));
      setHover(null);
    };
    const selection = () => { trackSelection(); slash(); };
    const openDialog = () => close(false);
    editor.view.dom.addEventListener(DOCS_REQUEST, openDialog);
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-ux-overlay],[data-ux-gutter],[data-node-controls],dialog')) return;
      close(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || (event.target instanceof Element && event.target.closest('dialog,[data-node-controls]'))) return;
      if (event.key === 'Escape' && (current.current || !editor.state.selection.empty)) { event.preventDefault(); close(true); }
      if (event.shiftKey && event.key === 'F10' && editor.isFocused) {
        event.preventDefault(); const s = editor.state.selection;
        const pos = s.$from.depth ? s.$from.before(1) : s.from, rect = editor.view.coordsAtPos(s.from);
        setPopup({ type: 'menu', block: kindFor(editor.state.doc.nodeAt(pos)?.type.name || ''), pos,
          anchor: { element: null, point: { x: rect.left, y: rect.bottom }, mode: 'caret', from: s.from } });
      }
    };
    editor.on('transaction', transaction); editor.on('update', slash); editor.on('selectionUpdate', selection);
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', key);
    return () => {
      editor.view.dom.removeEventListener(DOCS_REQUEST, openDialog);
      editor.off('transaction', transaction); editor.off('update', slash); editor.off('selectionUpdate', selection);
      document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', key);
    };
  }, [editor, commit, setPopup, close, trackSelection]);
  const selectLink = (element: Element) => {
    if (!editor) return;
    const pos = editor.view.posAtDOM(element, 0), range = getMarkRange(editor.state.doc.resolve(pos), editor.schema.marks.link);
    if (range) editor.commands.setTextSelection(range);
  };
  const onMouseMove = (event: ReactMouse<HTMLDivElement>) => {
    if (!editor || drag.dragging.current || current.current) return;
    const found = blockFromDOM(editor, event.target);
    if (found && found.pos !== hover?.pos) setHover(found);
  };
  const onContextMenu = (event: ReactMouse<HTMLDivElement>) => {
    if (!editor || !editor.view.dom.contains(event.target as Node)) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-node-controls],input,select,textarea,button')) return;
    const cell = target.closest<HTMLElement>('td,th'), link = target.closest('a[href]');
    const candidate = cell?.closest('table') || target.closest('.image-figure') || (!link && target.closest('li[data-type="taskItem"]')) || target;
    const found = blockFromDOM(editor, candidate, true); if (!found) return;
    event.preventDefault(); let cellPos: number | undefined;
    if (cell) {
      cellPos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
      if (cellPos !== undefined && !cell.classList.contains('selectedCell')) editor.commands.setTextSelection(cellPos);
    } else if (link) selectLink(link);
    else {
      const hit = editor.view.posAtCoords({ left: event.clientX, top: event.clientY }), selected = editor.state.selection;
      if (hit && (selected.empty || hit.pos < selected.from || hit.pos > selected.to)) {
        if (editor.state.doc.nodeAt(found.pos)?.isAtom) editor.commands.setNodeSelection(found.pos);
        else editor.commands.setTextSelection(hit.pos);
      }
    }
    const rect = found.element.getBoundingClientRect(); setSelectionAnchor(null);
    setPopup({ type: 'menu', block: cell ? 'cell' : link ? 'link' : kindFor(editor.state.doc.nodeAt(found.pos)?.type.name || ''),
      pos: found.pos, cellPos, anchor: { element: found.element, point: { x: event.clientX, y: event.clientY },
        offset: { x: event.clientX - rect.left, y: event.clientY - rect.top }, mode: 'pointer' } });
  };
  const onClick = (event: ReactMouse<HTMLDivElement>) => {
    if (!editor) return;
    const target = event.target as HTMLElement;
    if (target.closest('.resize-image,[data-node-controls],input,select,textarea,button')) return;
    const image = target.closest<HTMLElement>('.image-figure'), link = target.closest<HTMLElement>('a[href]');
    const found = blockFromDOM(editor, image || link || target, true); if (!found) return;
    if (image && editor.state.doc.nodeAt(found.pos)?.type.name === 'image') {
      editor.commands.setNodeSelection(found.pos);
      setPopup({ type: 'image', block: 'image', pos: found.pos, anchor: { element: image, point: { x: 0, y: 0 }, mode: 'element' } });
    } else if (link) {
      event.preventDefault(); selectLink(link);
      setPopup({ type: 'link', block: 'link', pos: found.pos, anchor: { element: link, point: { x: 0, y: 0 }, mode: 'element' } });
    } else setHover(blockFromDOM(editor, target));
  };
  const openGutter = (type: 'menu' | 'insert', entry: Hover) => {
    if (!editor) return;
    if (type === 'menu' && drag.suppressClick.current) { drag.suppressClick.current = false; return; }
    const node = editor.state.doc.nodeAt(entry.pos), selection = editor.state.selection;
    if (node && (type === 'insert' || selection.from < entry.pos || selection.to > entry.pos + node.nodeSize)) focusBlock(editor, entry.pos);
    const r = entry.element.getBoundingClientRect();
    setPopup({ type, block: kindFor(editor.state.doc.nodeAt(entry.pos)?.type.name || 'paragraph'), pos: entry.pos,
      anchor: { element: entry.element, point: { x: r.left - 25, y: r.top }, offset: { x: -25, y: 0 }, mode: 'pointer' } });
  };
  return { hover, setHover, popup, setPopup, selectionAnchor, setSelectionAnchor, close, dragging: drag.dragging,
    indicator: drag.indicator, onGutterPointerDown: drag.onPointerDown, onMouseMove, onContextMenu, onClick, openGutter, trackSelection };
}
