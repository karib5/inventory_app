import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

/** Shared confirmation for irreversible/dangerous actions across the app
 * (delete warehouse, delete product, ...). Never a browser confirm() -
 * always names the target, explains the consequence, and requires the
 * current user's own password, which the backend verifies - this modal
 * never decides on its own whether the password is right. */
export default function PasswordConfirmModal({
  title,
  targetName,
  explanation,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  targetName: string;
  explanation: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm(password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={handleConfirm}>
        <div className="danger-confirm-warning">
          <AlertTriangle size={18} />
          <div>
            <p className="danger-confirm-target">{targetName}</p>
            <p>{explanation}</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Enter your administrator password to continue</label>
          <input
            id="confirm-password"
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
          <button type="submit" className="danger" disabled={busy || !password}>
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
