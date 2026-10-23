import { useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Anchored } from "./Anchored";
import { actionsFor, filterInserts } from "./logic";
import type { Action } from "./logic";
import type { Popup } from "./targets";

export function PopupMenu({ editor, popup, onChoose, onClose }: {
  editor: Editor; popup: Popup; onChoose: (action: Action) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const slash = popup.type === "slash";
  const query = slash ? popup.query || "" : search;
  const items = popup.type === "menu" ? actionsFor(popup.block) : filterInserts(query);
  const enabled = (action: Action) => {
    if (action === "merge-cells") return editor.can().mergeCells();
    if (action === "split-cell") return editor.can().splitCell();
    return true;
  };
  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    if (!slash) (ref.current?.querySelector("input,button:not(:disabled)") as HTMLElement | null)?.focus({ preventScroll: true });
  }, [slash]);
  useEffect(() => {
    ref.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as Node | null;
      if (!target || (!ref.current?.contains(target) && !editor.view.dom.contains(target))) return;
      if (event.key === "Tab") { onClose(); return; }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      const editingSearch = target instanceof HTMLInputElement;
      const keys = editingSearch ? ["ArrowDown", "ArrowUp", "Enter"] : ["ArrowDown", "ArrowUp", "Home", "End", "Enter"];
      if (!keys.includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (!items.length) return;
      if (event.key === "Enter") { const item = items[index]; if (item && enabled(item.id)) onChoose(item.id); return; }
      const direction = event.key === "ArrowUp" || event.key === "End" ? -1 : 1;
      let next = event.key === "Home" ? -1 : event.key === "End" ? 0 : index;
      for (let attempt = 0; attempt < items.length; attempt++) {
        next = (next + direction + items.length) % items.length;
        if (enabled(items[next].id)) break;
      }
      setIndex(next);
      if (!slash && !editingSearch) (ref.current?.querySelector(`[data-index="${next}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  });
  return <Anchored editor={editor} anchor={popup.anchor} className="menu-wrap">
    <div ref={ref} className="ux-menu" role="menu" aria-label={popup.type === "menu" ? "Block actions" : "Insert block"}
      aria-activedescendant={items.length ? `${id}-${index}` : undefined}>
      {popup.type === "insert" && <input aria-label="Search block types" placeholder="Search blocks..." value={search} onChange={e => setSearch(e.target.value)}/>}
      {slash && <div className="menu-search">/ {query || "Search blocks..."}</div>}
      {!items.length && <p role="status">No matching blocks</p>}
      {items.map((item, i) => <button key={item.id} id={`${id}-${i}`} data-index={i} type="button" role="menuitem"
        tabIndex={i === index ? 0 : -1} disabled={!enabled(item.id)}
        className={`${i === index ? "is-highlighted " : ""}${item.destructive ? "destructive" : ""}`}
        onPointerDown={event => event.preventDefault()} onMouseEnter={() => setIndex(i)} onClick={() => onChoose(item.id)}>
        <span>{item.label}</span>{item.shortcut && <small>{item.shortcut}</small>}
      </button>)}
      <div className="menu-footer">Arrow keys navigate · Enter apply · Esc close</div>
    </div>
  </Anchored>;
}
