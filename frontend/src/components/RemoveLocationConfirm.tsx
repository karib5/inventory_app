import React from 'react';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { Location } from '../api';
import Modal from './Modal';

/** Confirmation for removing an area/rack/shelf, with or without stock still
 * in it. There is no way to reactivate a location from the UI afterwards
 * (unlike a warehouse, which has an Unarchive path) - to the user this IS
 * delete, so, like the warehouse/product delete flows, it always requires
 * re-entering the current user's own password, verified server-side. When
 * there's stock still in it, it also offers a real three-way choice: cancel
 * and go move that stock first, transfer it to another rack right here and
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
  onConfirm: (password: string) => Promise<void>;
  onTransfer?: (toLocationId: number, password: string) => Promise<void>;
}) {
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [transferring, setTransferring] = React.useState(false);
  const [destination, setDestination] = React.useState('');

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm(password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  async function handleTransfer(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !destination || !password || !onTransfer) return;
    setBusy(true);
    setError('');
    try {
      await onTransfer(Number(destination), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  const canTransfer = onTransfer && destinationRacks && destinationRacks.length > 0;
  const hasStock = totalUnits > 0;

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="danger-confirm-warning">
        <AlertTriangle size={18} />
        <div>
          <p className="danger-confirm-target">{targetName}</p>
          {hasStock ? (
            <p>
              This still holds <strong>{totalUnits}</strong> unit{totalUnits === 1 ? '' : 's'} across{' '}
              <strong>{productCount}</strong> product{productCount === 1 ? '' : 's'}. Removing it will clear that
              stock - recorded as an adjustment so it stays in your activity history - since it won't have anywhere
              to be.
              {canTransfer && ' You can transfer it to another rack instead, and then remove this one.'}
            </p>
          ) : (
            <p>This can't be undone from here - there's no way to bring a removed location back.</p>
          )}
        </div>
      </div>

      {canTransfer && !transferring && (
        <button
          type="button"
          className="ghost transfer-first-btn"
          onClick={() => setTransferring(true)}
          style={{ marginBottom: 12 }}
        >
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

      <form onSubmit={transferring ? handleTransfer : handleConfirm}>
        <div className="field">
          <label htmlFor="remove-location-password">Enter your administrator password to continue</label>
          <input
            id="remove-location-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
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
          {transferring ? (
            <button type="submit" className="primary" disabled={busy || !destination || !password}>
              {busy ? 'Transferring...' : 'Transfer & Remove'}
            </button>
          ) : (
            <button type="submit" className="danger" disabled={busy || !password}>
              {busy ? 'Removing...' : confirmLabel}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
