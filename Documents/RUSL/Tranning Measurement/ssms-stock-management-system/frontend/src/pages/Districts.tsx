import type { District } from '../types';

interface Props {
  districts: District[];
}

export default function Districts({ districts }: Props) {
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-mono mb-1" style={{ color: '#8b949e', letterSpacing: '0.1em' }}>EXTERNAL</div>
        <h1 className="font-serif font-bold text-2xl" style={{ color: '#c9d1d9' }}>25 Districts</h1>
        <p className="text-sm mt-1" style={{ color: '#8b949e' }}>All 25 district heads are authorized to submit and approve stock requisitions</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {districts.map(d => (
          <div key={d.id} className="rounded-lg border p-4" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-2xl font-bold" style={{ color: '#30363d' }}>{String(d.number).padStart(2, '0')}</span>
              <div className="flex gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1f8faa20', color: '#1f8faa' }}>External</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#2ea04320', color: '#2ea043' }}>✓ Auth</span>
              </div>
            </div>
            <div className="font-serif font-bold text-base mb-2" style={{ color: '#c9d1d9' }}>{d.name}</div>
            <div className="space-y-1 text-xs">
              <div style={{ color: '#8b949e' }}>Head: <span style={{ color: '#c9d1d9' }}>{d.head}</span></div>
              <div className="font-mono" style={{ color: '#8b949e' }}>{d.email}</div>
              <div className="font-mono" style={{ color: '#8b949e' }}>{d.phone}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
