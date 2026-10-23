import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function Modal({ title, children, onClose, className = "" }: {
  title: string; children: ReactNode; onClose: () => void; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} data-ux-overlay className={`feature-dialog ${className}`} aria-label={title}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close.current(); } }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close.current();
    }}>
    <header className="feature-dialog-heading"><h2>{title}</h2>
      <button type="button" aria-label={`Close ${title}`} onClick={onClose}>&times;</button></header>
    {children}
  </dialog>;
}
