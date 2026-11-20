import { useState } from 'react';
import type { Department } from '../types';
import { api, errorMessage } from '../api';
import { ErrorBanner, inputClass, inputStyle } from '../components/ui';

interface Props {
  departments: Department[];
  onChanged: () => Promise<void>;
}

const EMPTY = { name: '', head: '', email: '', phone: '' };

export default function Departments({ departments, onChanged }: Props) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setError('');
    try {
      await api.post('/departments', form);
      await onChanged();
      setModal(false);
      setForm(EMPTY);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this department?')) return;
    try {
      await api.del(`/departments/${id}`);
      await onChanged();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xs font-mono mb-1" style={{ color: '#8b949e', letterSpacing: '0.1em' }}>INTERNAL</div>
          <h1 className="font-serif font-bold text-2xl" style={{ color: '#c9d1d9' }}>Internal Departments</h1>
          <p className="text-sm mt-1" style={{ color: '#8b949e' }}>Department heads are authorized to raise stock requisitions for their own department</p>
        </div>
        <button onClick={() => { setError(''); setModal(true); }} className="px-4 py-2 rounded text-sm font-semibold" style={{ background: '#1d6fef', color: '#fff' }}>
          + Add Department
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {departments.map(dept => (
          <div key={dept.id} className="rounded-lg border p-5" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-mono text-xs mb-1" style={{ color: '#1d6fef' }}>D{dept.id.padStart(3, '0')}</div>
                <div className="font-serif font-bold text-base" style={{ color: '#c9d1d9' }}>{dept.name}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1d6fef20', color: '#1d6fef' }}>Internal</span>
                <button onClick={() => void remove(dept.id)} className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: '#da363330', color: '#da3633' }}>Del</button>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span style={{ color: '#8b949e' }}>Head:</span>
                <span className="font-medium" style={{ color: '#c9d1d9' }}>{dept.head || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: '#8b949e' }}>Email:</span>
                <span className="font-mono text-xs" style={{ color: '#8b949e' }}>{dept.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: '#8b949e' }}>Phone:</span>
                <span className="font-mono text-xs" style={{ color: '#8b949e' }}>{dept.phone || '—'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: '#00000088' }} onClick={() => setModal(false)}>
          <div className="rounded-xl border w-full max-w-md" style={{ background: '#161b22', borderColor: '#30363d' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#30363d' }}>
              <h2 className="font-serif font-bold text-lg" style={{ color: '#c9d1d9' }}>Add Department</h2>
              <button onClick={() => setModal(false)} style={{ color: '#8b949e' }}>✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <ErrorBanner message={error} />
              {(['name', 'head', 'email', 'phone'] as const).map(f => (
                <div key={f}>
                  <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>
                    {f === 'head' ? 'Department Head' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </label>
                  <input className={inputClass} style={inputStyle} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} />
                </div>
              ))}
              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Cancel</button>
                <button onClick={() => void add()} disabled={busy || !form.name.trim()} className="px-4 py-2 text-sm rounded font-semibold disabled:opacity-60" style={{ background: '#1d6fef', color: '#fff' }}>
                  Add Department
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
