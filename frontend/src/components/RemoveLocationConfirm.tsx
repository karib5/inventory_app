import React from 'react';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { Location } from '../api';
import Modal from './Modal';

/** Confirmation for removing an area/rack/shelf that still holds stock.
 * Unlike PasswordConfirmModal (reserved for the higher-stakes warehouse/
 * product delete flows), this never asks for a password - removing a rack
 * is a normal, lower-stakes management action, same as it always has been
 * for one with nothing in it. It gives a real three-way choice: cancel and
 * go move that stock first, transfer it to another rack right here and
 * then remove, or clear it and proceed anyway. Clearing is never silent -
 * the backend records a normal adjustment (or, for a transfer, a normal
 * transfer_out/transfer_in pair) for every unit moved this way. */
export default function RemoveLocationConfirm({
  title,
  targetName,
  productCount,
  totalUnits,
  confirmLabel,
  destinationRacks,
  onCancel,
  onConfirm,
  onTransfer,
}: {
  title: string;
  targetName: string;
  productCount: number;
  totalUnits: number;
  confirmLabel: string;
  destinationRacks?: Location[];
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  onTransfer?: (toLocationId: number) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [transferring, setTransferring] = React.useState(false);
  const [destination, setDestination] = React.useState('');

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

  async function handleTransfer() {
    if (busy || !destination || !onTransfer) return;
    setBusy(true);
    setError('');
    try {
      await onTransfer(Number(destination));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  const canTransfer = onTransfer && destinationRacks && destinationRacks.length > 0;

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
            to be.
            {canTransfer && ' You can transfer it to another rack instead, and then remove this one.'}
          </p>
        </div>
      </div>

      {canTransfer && !transferring && (
        <button type="button" className="ghost" onClick={() => setTransferring(true)} style={{ marginBottom: 12 }}>
          <ArrowLeftRight size={14} /> Transfer stock to another rack first
        </button>
      )}

      {canTransfer && transferring && (
        <div className="field">
          <label>Transfer everything to</label>
          <select value={destination} onChange={e => setDestination(e.target.value)}>
            <option value="">Select a rack...</option>
            {destinationRacks!.map(rack => (
              <option key={rack.id} value={rack.id}>
                {rack.code} — {rack.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        {transferring ? (
          <button type="button" className="primary" onClick={handleTransfer} disabled={busy || !destination}>
            {busy ? 'Transferring...' : 'Transfer & Remove'}
          </button>
        ) : (
          <button type="button" className="danger" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Removing...' : confirmLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}
