import { useState } from 'react';
import type { AuthUser, StockItem } from '../types';
import { api, errorMessage } from '../api';
import { ErrorBanner, Modal, inputClass, inputStyle } from '../components/ui';

function totalStock(item: StockItem) {
  return item.batches.reduce((s, b) => s + b.quantity - b.issuedQty, 0);
}

const byReceived = <T extends { receivedDate: string; id: string }>(a: T, b: T) =>
  a.receivedDate.localeCompare(b.receivedDate) || Number(a.id) - Number(b.id);

interface Props {
  items: StockItem[];
  categories: string[];
  auth: AuthUser;
  onChanged: () => Promise<void>;
}

const emptyItem = { code: '', name: '', category: '', unit: 'Piece', minStock: 10 };
const emptyBatch = { batchNo: '', receivedDate: '', quantity: '', unitCost: '', expiryDate: '', supplier: '' };

export default function StockItems({ items, categories, auth, onChanged }: Props) {
  const can = (p: string) => auth.permissions.includes(p);
  const canManage = can('manage_items');
  const canReceive = can('receive_stock');
  const canCategory = can('manage_item_categories');

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modal, setModal] = useState<'add-item' | 'add-batch' | 'detail' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyItem, category: categories[0] ?? '' });
  const [batchForm, setBatchForm] = useState(emptyBatch);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = items.find(i => i.id === selectedId) ?? null;

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
    return matchSearch && (catFilter === 'All' || i.category === catFilter);
  });

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const addItem = () => run(async () => {
    await api.post('/items', { ...form, minStock: Number(form.minStock) });
    await onChanged();
    setModal(null);
    setForm({ ...emptyItem, category: categories[0] ?? '' });
  });

  const addBatch = () => run(async () => {
    if (!selected) return;
    await api.post(`/items/${selected.id}/batches`, {
      batchNo: batchForm.batchNo,
      receivedDate: batchForm.receivedDate,
      quantity: Number(batchForm.quantity),
      unitCost: Number(batchForm.unitCost),
      expiryDate: batchForm.expiryDate || undefined,
      supplier: batchForm.supplier || undefined,
    });
    await onChanged();
    setBatchForm(emptyBatch);
    setModal('detail');
  });

  async function deleteItem(id: string) {
    if (!confirm('Delete this stock item?')) return;
    try {
      await api.del(`/items/${id}`);
      await onChanged();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function addCategory() {
    const name = prompt('New category name');
    if (!name?.trim()) return;
    try {
      await api.post('/categories', { name: name.trim() });
      await onChanged();
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  const nextBatchNo = (item: StockItem) => {
    const avail = item.batches.filter(b => b.quantity > b.issuedQty).sort(byReceived);
    return avail[0]?.batchNo ?? null;
  };

  const open = (m: 'add-item' | 'add-batch' | 'detail') => { setError(''); setModal(m); };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xs font-mono mb-1" style={{ color: '#8b949e', letterSpacing: '0.1em' }}>INVENTORY</div>
          <h1 className="font-serif font-bold text-2xl" style={{ color: '#c9d1d9' }}>Stock Items</h1>
        </div>
        <div className="flex gap-2">
          {canCategory && (
            <button onClick={() => void addCategory()} className="px-4 py-2 rounded text-sm border" style={{ borderColor: '#30363d', color: '#8b949e' }}>
              + Category
            </button>
          )}
          {canManage && (
            <button onClick={() => { setForm({ ...emptyItem, category: categories[0] ?? '' }); open('add-item'); }}
              className="px-4 py-2 rounded text-sm font-semibold" style={{ background: '#1d6fef', color: '#fff' }}>
              + Add Stock Item
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <input className="px-3 py-2 rounded text-sm flex-1 border outline-none" style={{ background: '#161b22', borderColor: '#30363d', color: '#c9d1d9' }}
          placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="px-3 py-2 rounded text-sm border outline-none" style={{ background: '#161b22', borderColor: '#30363d', color: '#c9d1d9' }}
          value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option>All</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#30363d' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#0d1117' }}>
              {['Code', 'Item Name', 'Category', 'Unit', 'Total Stock', 'Min Stock', 'FIFO Batch', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#8b949e', borderBottom: '1px solid #30363d' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const stock = totalStock(item);
              const isLow = stock <= item.minStock;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #30363d' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e2530')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1d6fef' }}>{item.code}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: '#c9d1d9' }}>{item.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#8b949e' }}>{item.category}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#8b949e' }}>{item.unit}</td>
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: isLow ? '#da3633' : '#2ea043' }}>{stock}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#8b949e' }}>{item.minStock}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#f0a428' }}>{nextBatchNo(item) || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: isLow ? '#da363320' : '#2ea04320', color: isLow ? '#da3633' : '#2ea043' }}>
                      {isLow ? 'Low Stock' : 'Adequate'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedId(item.id); open('detail'); }} className="text-xs px-2 py-1 rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>View</button>
                      {canManage && (
                        <button onClick={() => void deleteItem(item.id)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: '#da363330', color: '#da3633' }}>Del</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-sm" style={{ color: '#8b949e' }}>No stock items found</div>}
      </div>

      {modal === 'add-item' && (
        <Modal title="Add New Stock Item" onClose={() => setModal(null)}>
          <ErrorBanner message={error} />
          <div className="grid grid-cols-2 gap-4">
            {([['Code', 'code'], ['Name', 'name'], ['Unit', 'unit']] as const).map(([label, field]) => (
              <div key={field} className={field === 'name' ? 'col-span-2' : ''}>
                <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>{label}</label>
                <input className={inputClass} style={inputStyle} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>Category</label>
              <select className={inputClass} style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>Min Stock Level</label>
              <input type="number" min={0} className={inputClass} style={inputStyle} value={form.minStock}
                onChange={e => setForm({ ...form, minStock: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Cancel</button>
            <button onClick={() => void addItem()} disabled={busy || !form.code.trim() || !form.name.trim() || !form.category}
              className="px-4 py-2 text-sm rounded font-semibold disabled:opacity-60" style={{ background: '#1d6fef', color: '#fff' }}>Add Item</button>
          </div>
        </Modal>
      )}

      {modal === 'detail' && selected && (
        <Modal title={selected.name} onClose={() => setModal(null)} wide>
          <div className="flex gap-4 mb-4 text-sm">
            <span className="font-mono" style={{ color: '#1d6fef' }}>{selected.code}</span>
            <span style={{ color: '#8b949e' }}>{selected.category} · {selected.unit}</span>
            <span className="font-mono font-bold" style={{ color: '#2ea043' }}>Total: {totalStock(selected)} {selected.unit}</span>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold" style={{ color: '#8b949e' }}>FIFO BATCH QUEUE (oldest → newest)</div>
            {canReceive && (
              <button onClick={() => open('add-batch')} className="text-xs px-3 py-1 rounded font-semibold" style={{ background: '#1d6fef', color: '#fff' }}>+ Add Batch</button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#0d1117' }}>
                {['FIFO Order', 'Batch No', 'Received', 'Expiry', 'Total Qty', 'Issued', 'Available', 'Unit Cost'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs" style={{ color: '#8b949e' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...selected.batches].sort(byReceived).map((b, i) => {
                const avail = b.quantity - b.issuedQty;
                return (
                  <tr key={b.id} style={{ borderTop: '1px solid #30363d' }}>
                    <td className="px-3 py-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: i === 0 ? '#f0a42830' : '#30363d', color: i === 0 ? '#f0a428' : '#8b949e' }}>
                        {i === 0 ? '→ NEXT' : `#${i + 1}`}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: '#1d6fef' }}>{b.batchNo}</td>
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: '#8b949e' }}>{b.receivedDate}</td>
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: b.expiryDate ? '#f0a428' : '#8b949e' }}>{b.expiryDate || '—'}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: '#c9d1d9' }}>{b.quantity}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: '#da3633' }}>{b.issuedQty}</td>
                    <td className="px-3 py-2 font-mono font-bold" style={{ color: avail > 0 ? '#2ea043' : '#8b949e' }}>{avail}</td>
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: '#8b949e' }}>LKR {b.unitCost.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Modal>
      )}

      {modal === 'add-batch' && selected && (
        <Modal title={`Add Batch — ${selected.name}`} onClose={() => setModal('detail')}>
          <ErrorBanner message={error} />
          <div className="grid grid-cols-2 gap-4">
            {([
              ['Batch Number', 'batchNo', 'text'],
              ['Received Date', 'receivedDate', 'date'],
              ['Quantity', 'quantity', 'number'],
              ['Unit Cost (LKR)', 'unitCost', 'number'],
              ['Expiry Date (optional)', 'expiryDate', 'date'],
              ['Supplier (optional)', 'supplier', 'text'],
            ] as const).map(([label, field, type]) => (
              <div key={field}>
                <label className="block text-xs mb-1" style={{ color: '#8b949e' }}>{label}</label>
                <input type={type} className={inputClass} style={inputStyle} value={batchForm[field]}
                  onChange={e => setBatchForm({ ...batchForm, [field]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal('detail')} className="px-4 py-2 text-sm rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Back</button>
            <button onClick={() => void addBatch()} disabled={busy || !batchForm.batchNo || !batchForm.receivedDate || !batchForm.quantity || batchForm.unitCost === ''}
              className="px-4 py-2 text-sm rounded font-semibold disabled:opacity-60" style={{ background: '#2ea043', color: '#fff' }}>Add Batch</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
