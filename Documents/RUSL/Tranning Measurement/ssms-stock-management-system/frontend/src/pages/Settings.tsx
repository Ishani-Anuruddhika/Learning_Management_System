import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { ErrorBanner, PageHeader, inputClass, inputStyle } from '../components/ui';

export default function Settings() {
  const [organisation, setOrganisation] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<Record<string, string | null>>('/settings')
      .then(s => setOrganisation(s.organisation_name ?? ''))
      .catch(e => setError(errorMessage(e)));
  }, []);

  async function save() {
    setError('');
    setSaved(false);
    try {
      await api.put('/settings', { settings: { organisation_name: organisation } });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader eyebrow="ADMIN" title="System Settings" subtitle="Values used across the system and on PDF reports" />
      <div className="rounded-xl border p-6 max-w-lg" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <ErrorBanner message={error} />
        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#8b949e' }}>ORGANISATION NAME (shown on PDF reports)</label>
        <input className={inputClass} style={inputStyle} value={organisation} onChange={e => { setOrganisation(e.target.value); setSaved(false); }} />
        <div className="flex items-center gap-3 mt-4">
          <button onClick={() => void save()} disabled={!organisation.trim()} className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-60" style={{ background: '#1d6fef', color: '#fff' }}>
            Save
          </button>
          {saved && <span className="text-xs" style={{ color: '#2ea043' }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
