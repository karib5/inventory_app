import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

/** Confirmation for removing an area/rack/shelf that still holds stock.
 * Unlike PasswordConfirmModal (reserved for the higher-stakes warehouse/
 * product delete flows), this never asks for a password - removing a rack
 * is a normal, lower-stakes management action, same as it always has been
 * for one with nothing in it. It only exists to make the consequence of
 * removing one WITH stock explicit and give the user a real choice: cancel
 * and go move that stock first, or clear it and proceed anyway. Clearing is
 * never silent - the backend records a normal adjustment transaction for
 * every unit cleared this way. */
export default function RemoveLocationConfirm({
  title,
  targetName,
  productCount,
  totalUnits,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  targetName: string;
  productCount: number;
  totalUnits: number;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="danger-confirm-warning">
        <AlertTriangle size={18} />
        <div>
          <p className="danger-confirm-target">{targetName}</p>
          <p>
            This still holds <strong>{totalUnits}</strong> unit{totalUnits === 1 ? '' : 's'} across{' '}
            <strong>{productCount}</strong> product{productCount === 1 ? '' : 's'}. Removing it will clear that
            stock - recorded as an adjustment so it stays in your activity history - since it won't have anywhere
            to be. Consider transferring it first if you'd rather keep it in the catalog.
          </p>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="modal-actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="danger" onClick={handleConfirm} disabled={busy}>
          {busy ? 'Removing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
