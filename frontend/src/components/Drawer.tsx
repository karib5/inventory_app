import React from 'react';
import { X } from 'lucide-react';

export default function Drawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
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
    <div className="drawer-overlay" onClick={onClose}>
      <div ref={containerRef} className="drawer" role="dialog" aria-modal="true" tabIndex={-1} onClick={e => e.stopPropagation()}>
        <button className="modal-close ghost" onClick={onClose} aria-label="Close panel">
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
