import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
export function ModalSurface({ title, children, onClose, className = '' }: {
  title: string; children: ReactNode; onClose: () => void; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId();
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { dialog?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`workspace-dialog ${className}`} aria-labelledby={titleId}
    onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
      const rect = ref.current?.getBoundingClientRect();
      if (event.target === ref.current && rect && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) onClose();
    }}>
    <header><h2 id={titleId}>{title}</h2><button type="button" aria-label={`Close ${title}`} onClick={onClose}>&times;</button></header>
    {children}
  </dialog>;
}
