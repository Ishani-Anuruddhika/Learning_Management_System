import type { CSSProperties, ReactNode } from 'react';

export const inputStyle: CSSProperties = { background: '#0d1117', borderColor: '#30363d', color: '#c9d1d9' };
export const inputClass = 'w-full px-3 py-2 rounded border text-sm outline-none';

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: '#00000088' }} onClick={onClose}>
      <div className="rounded-xl border w-full overflow-y-auto max-h-screen" style={{ background: '#161b22', borderColor: '#30363d', maxWidth: wide ? 860 : 560 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#30363d' }}>
          <h2 className="font-serif font-bold text-lg" style={{ color: '#c9d1d9' }}>{title}</h2>
          <button onClick={onClose} className="text-lg" style={{ color: '#8b949e' }}>✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="text-xs font-mono mb-1" style={{ color: '#8b949e', letterSpacing: '0.1em' }}>{eyebrow}</div>
        <h1 className="font-serif font-bold text-2xl" style={{ color: '#c9d1d9' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-1" style={{ color: '#8b949e' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 px-3 py-2 rounded text-sm border" style={{ background: '#da363312', borderColor: '#da363340', color: '#da3633' }}>
      {message}
    </div>
  );
}
