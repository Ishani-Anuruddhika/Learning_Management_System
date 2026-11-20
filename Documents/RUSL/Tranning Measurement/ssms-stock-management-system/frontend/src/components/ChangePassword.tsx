import { useState } from 'react';
import { api, errorMessage } from '../api';
import { ErrorBanner, Modal, inputClass, inputStyle } from './ui';

export default function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setError('');
    if (next.length < 8) { setError('Use at least 8 characters.'); return; }
    if (next !== confirm) { setError('The two new passwords do not match.'); return; }

    setBusy(true);
    try {
      await api.post('/change-password', {
        currentPassword: current,
        password: next,
        password_confirmation: confirm,
      });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const type = show ? 'text' : 'password';

  return (
    <Modal title="Change Password" onClose={onClose}>
      {done ? (
        <div>
          <div className="px-3 py-2 rounded text-sm border mb-5" style={{ background: '#2ea04312', borderColor: '#2ea04340', color: '#2ea043' }}>
            ✓ Password changed. Your other sessions were signed out.
          </div>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded font-semibold" style={{ background: '#1d6fef', color: '#fff' }}>Close</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          <div>
            <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>Current password</label>
            <input type={type} className={inputClass} style={inputStyle} value={current} autoComplete="current-password"
              onChange={e => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>New password (min 8 characters)</label>
            <input type={type} className={inputClass} style={inputStyle} value={next} autoComplete="new-password"
              onChange={e => setNext(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>Confirm new password</label>
            <input type={type} className={inputClass} style={inputStyle} value={confirm} autoComplete="new-password"
              onChange={e => setConfirm(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-xs" style={{ color: '#8b949e' }}>
            <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} /> Show passwords
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Cancel</button>
            <button onClick={() => void save()} disabled={busy || !current || !next || !confirm}
              className="px-4 py-2 text-sm rounded font-semibold disabled:opacity-60" style={{ background: '#1d6fef', color: '#fff' }}>
              Change Password
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
