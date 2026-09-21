import React from 'react';
import { X } from 'lucide-react';

export default function Modal({
  title,
  onClose,
  children,
  width,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    containerRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={containerRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        style={width ? { width: `min(${width}px, 100%)` } : undefined}
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close ghost" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>
        <h2 id="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
