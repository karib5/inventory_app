import React from 'react';
import { ImageOff, Upload } from 'lucide-react';
import { resolveImageUrl, uploadImage } from '../api';

export default function ImageUpload({
  token,
  value,
  onChange,
  placeholderIcon,
}: {
  token: string;
  value: string | null;
  onChange: (url: string | null) => void;
  placeholderIcon?: React.ReactNode;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const url = await uploadImage(file, token);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-upload">
      {value ? (
        <img src={resolveImageUrl(value) ?? undefined} alt="" className="preview" />
      ) : (
        <div className="preview-placeholder">{placeholderIcon ?? <ImageOff size={28} />}</div>
      )}
      <div className="actions">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload size={15} /> {busy ? 'Uploading...' : value ? 'Replace Image' : 'Upload Image'}
        </button>
        {value && (
          <button type="button" className="ghost" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
        <span className="hint">Optional · JPG, PNG or WEBP, up to 5MB</span>
        {error && <span className="hint" style={{ color: 'var(--danger)' }}>{error}</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={handleFile} />
    </div>
  );
}
