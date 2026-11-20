import { useState } from 'react';
import type { AuthUser, StockItem, StockRequest } from '../types';
import { api, errorMessage } from '../api';
import { ErrorBanner } from '../components/ui';

function totalStock(item: StockItem) {
  return item.batches.reduce((s, b) => s + b.quantity - b.issuedQty, 0);
}
function totalValue(item: StockItem) {
  return item.batches.reduce((s, b) => s + (b.quantity - b.issuedQty) * b.unitCost, 0);
}

interface Props {
  items: StockItem[];
  requests: StockRequest[];
  auth: AuthUser;
}

export default function Reports({ items, requests, auth }: Props) {
  const can = (p: string) => auth.permissions.includes(p);
  const thisYear = new Date().getFullYear();

  // Offer every year that has requests, plus the current year.
  const years = Array.from(new Set([thisYear, ...requests.map(r => Number(r.requestDate.slice(0, 4)))]))
    .filter(y => !Number.isNaN(y)).sort((a, b) => b - a);

  const [year, setYear] = useState(thisYear);
  const [busy, setBusy] = useState<'stock' | 'annual' | null>(null);
  const [error, setError] = useState('');

  async function download(kind: 'stock' | 'annual') {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'stock') await api.download('/reports/current-stock', 'Current_Stock_Report.pdf');
      else await api.download(`/reports/annual?year=${year}`, `Annual_Stock_Report_${year}.pdf`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const grandTotal = items.reduce((s, i) => s + totalValue(i), 0);
  const lowStock = items.filter(i => totalStock(i) <= i.minStock);
  const yearRequests = requests.filter(r => r.requestDate.startsWith(String(year)));

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-mono mb-1" style={{ color: '#8b949e', letterSpacing: '0.1em' }}>REPORTS</div>
        <h1 className="font-serif font-bold text-2xl" style={{ color: '#c9d1d9' }}>Download Reports</h1>
        <p className="text-sm mt-1" style={{ color: '#8b949e' }}>Generate and download PDF reports for stock management</p>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-2 gap-6 mb-8">
        {can('generate_stock_report') && (
          <div className="rounded-xl border p-6" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl" style={{ color: '#1d6fef' }}>◫</span>
              <div>
                <div className="font-serif font-bold text-lg" style={{ color: '#c9d1d9' }}>Current Stock Report</div>
                <div className="text-xs" style={{ color: '#8b949e' }}>Snapshot of all stock items with FIFO batch breakdown</div>
              </div>
            </div>
            <div className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <span style={{ color: '#8b949e' }}>Total Items:</span>
                <span className="font-mono font-bold" style={{ color: '#c9d1d9' }}>{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#8b949e' }}>Total Stock Value:</span>
                <span className="font-mono font-bold" style={{ color: '#2ea043' }}>LKR {grandTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#8b949e' }}>Low Stock Items:</span>
                <span className="font-mono font-bold" style={{ color: lowStock.length > 0 ? '#da3633' : '#2ea043' }}>{lowStock.length}</span>
              </div>
            </div>
            <button onClick={() => void download('stock')} disabled={busy !== null}
              className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#1d6fef', color: '#fff' }}>
              {busy === 'stock' ? 'Generating…' : '↓ Download Current Stock PDF'}
            </button>
          </div>
        )}

        {can('generate_annual_report') && (
          <div className="rounded-xl border p-6" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl" style={{ color: '#f0a428' }}>⊞</span>
              <div className="flex-1">
                <div className="font-serif font-bold text-lg" style={{ color: '#c9d1d9' }}>Annual Report {year}</div>
                <div className="text-xs" style={{ color: '#8b949e' }}>Stock movement, departments, districts</div>
              </div>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-2 py-1 rounded border text-sm outline-none"
                style={{ background: '#0d1117', borderColor: '#30363d', color: '#c9d1d9' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between">
                <span style={{ color: '#8b949e' }}>Total Requests:</span>
                <span className="font-mono font-bold" style={{ color: '#c9d1d9' }}>{yearRequests.length}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#8b949e' }}>Issued:</span>
                <span className="font-mono font-bold" style={{ color: '#2ea043' }}>{yearRequests.filter(r => r.status === 'issued').length}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#8b949e' }}>Rejected:</span>
                <span className="font-mono font-bold" style={{ color: '#da3633' }}>{yearRequests.filter(r => r.status === 'rejected').length}</span>
              </div>
            </div>
            <button onClick={() => void download('annual')} disabled={busy !== null}
              className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#f0a428', color: '#0d1117' }}>
              {busy === 'annual' ? 'Generating…' : '↓ Download Annual Report PDF'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border" style={{ background: '#161b22', borderColor: '#30363d' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: '#30363d' }}>
          <span className="font-semibold text-sm" style={{ color: '#c9d1d9' }}>Stock Summary Preview</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#0d1117' }}>
              {['Code', 'Item', 'Category', 'Available', 'Min', 'Value (LKR)', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#8b949e', borderBottom: '1px solid #30363d' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(i => {
              const qty = totalStock(i);
              const low = qty <= i.minStock;
              return (
                <tr key={i.id} style={{ borderBottom: '1px solid #30363d' }}>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#1d6fef' }}>{i.code}</td>
                  <td className="px-4 py-2.5 text-sm" style={{ color: '#c9d1d9' }}>{i.name}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: '#8b949e' }}>{i.category}</td>
                  <td className="px-4 py-2.5 font-mono font-bold" style={{ color: low ? '#da3633' : '#2ea043' }}>{qty}</td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#8b949e' }}>{i.minStock}</td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#c9d1d9' }}>{totalValue(i).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: low ? '#da363320' : '#2ea04320', color: low ? '#da3633' : '#2ea043' }}>
                      {low ? 'Low Stock' : 'Adequate'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
