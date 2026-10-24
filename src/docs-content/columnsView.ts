import type { NodeViewRendererProps } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { columnTracks, columnWidths } from './columnWidths';

/** Width previews are DOM-only; pointerup commits exactly one history event. */
export function createColumnsView({ node: initial, editor, getPos }: NodeViewRendererProps) {
  let node = initial, cancelDrag = () => {};
  const dom = document.createElement('div'), contentDOM = document.createElement('div'), controls = document.createElement('div');
  dom.className = 'doc-columns-view'; dom.dataset.type = 'columns';
  contentDOM.className = 'doc-columns'; controls.className = 'docs-column-controls';
  controls.contentEditable = 'false'; controls.dataset.nodeControls = '';
  dom.append(contentDOM, controls);
  const paint = (widths: number[]) => {
    contentDOM.style.gridTemplateColumns = columnTracks(widths);
    const rect = contentDOM.getBoundingClientRect(), gap = 24;
    const available = Math.max(0, rect.width - gap * (widths.length - 1));
    let offset = 0;
    Array.from(controls.children).forEach((element, i) => {
      offset += available * widths[i] / 100;
      const grip = element as HTMLButtonElement;
      grip.style.left = `${offset + i * gap + gap / 2}px`;
      grip.setAttribute('aria-valuenow', String(Math.round(widths[i])));
    });
  };
  const commit = (widths: number[]) => {
    const pos = getPos();
    if (!editor.isEditable || typeof pos !== 'number' || editor.state.doc.nodeAt(pos)?.type !== node.type) return;
    editor.view.dispatch(closeHistory(editor.state.tr).setNodeMarkup(pos, undefined, { ...node.attrs, widths }));
  };
  const resize = (event: PointerEvent, index: number) => {
    if (event.button !== 0 || !editor.isEditable) return;
    event.preventDefault(); event.stopPropagation(); cancelDrag();
    const start = event.clientX, widths = columnWidths(node.attrs.widths, node.childCount), sum = widths[index] + widths[index + 1];
    const available = Math.max(1, contentDOM.getBoundingClientRect().width - 24 * (node.childCount - 1));
    const minimum = Math.min(12, sum / 3), original = [...widths];
    let current = [...widths];
    const move = (next: PointerEvent) => {
      if (next.pointerId !== event.pointerId) return;
      current = [...widths];
      current[index] = Math.max(minimum, Math.min(sum - minimum, widths[index] + (next.clientX - start) / available * 100));
      current[index + 1] = sum - current[index]; paint(current);
    };
    const clear = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', key); window.removeEventListener('blur', cancel);
      editor.off('update', cancel); dom.classList.remove('is-resizing'); cancelDrag = () => {};
    };
    const cancel = () => { clear(); paint(original); };
    const up = (next: PointerEvent) => {
      if (next.pointerId !== event.pointerId) return;
      move(next); clear(); if (current.some((value, i) => Math.abs(value - original[i]) > 0.05)) commit(current); else paint(original);
    };
    const key = (next: KeyboardEvent) => { if (next.key === 'Escape') { next.preventDefault(); cancel(); } };
    cancelDrag = cancel; dom.classList.add('is-resizing');
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel); window.addEventListener('keydown', key); window.addEventListener('blur', cancel); editor.on('update', cancel);
  };
  const render = () => {
    const focused = Array.from(controls.children).indexOf(document.activeElement as Element);
    controls.replaceChildren();
    for (let i = 0; i < node.childCount - 1; i++) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'docs-column-resizer';
      button.setAttribute('role', 'separator'); button.setAttribute('aria-orientation', 'vertical');
      button.setAttribute('aria-label', `Resize columns ${i + 1} and ${i + 2}`); button.setAttribute('aria-valuemin', '3'); button.setAttribute('aria-valuemax', '97');
      button.title = 'Drag to resize. Arrow keys adjust; double-click to equalize.';
      button.addEventListener('pointerdown', event => resize(event, i));
      button.addEventListener('dblclick', () => commit(columnWidths(null, node.childCount)));
      button.addEventListener('keydown', event => {
        if (!editor.isEditable || !['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home') { commit(columnWidths(null, node.childCount)); return; }
        const widths = columnWidths(node.attrs.widths, node.childCount), sum = widths[i] + widths[i + 1], minimum = Math.min(12, sum / 3);
        widths[i] = Math.max(minimum, Math.min(sum - minimum, widths[i] + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 5 : 1)));
        widths[i + 1] = sum - widths[i]; commit(widths);
      });
      controls.append(button);
    }
    paint(columnWidths(node.attrs.widths, node.childCount));
    if (focused >= 0) (controls.children[focused] as HTMLElement | undefined)?.focus({ preventScroll: true });
  };
  const observer = new ResizeObserver(() => paint(columnWidths(node.attrs.widths, node.childCount)));
  observer.observe(contentDOM); render();
  return { dom, contentDOM,
    update(next: typeof node) { if (next.type !== node.type) return false; node = next; render(); return true; },
    stopEvent(event: Event) { return event.target instanceof globalThis.Node && controls.contains(event.target); },
    ignoreMutation(mutation: { type: string; target: globalThis.Node }) { return controls.contains(mutation.target) || mutation.type === 'attributes' && [dom, contentDOM].includes(mutation.target as HTMLDivElement); },
    destroy() { cancelDrag(); observer.disconnect(); },
  };
}
