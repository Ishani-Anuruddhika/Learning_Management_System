import { useState } from 'react';
import type { ApprovalStatus, AuthUser, Department, District, StockItem, StockRequest } from '../types';
import { api, errorMessage } from '../api';
import { ErrorBanner } from '../components/ui';

function totalStock(item: StockItem) {
  return item.batches.reduce((s, b) => s + b.quantity - b.issuedQty, 0);
}

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  coord_approved: 'Coordinator Approved',
  accounts_approved: 'Accounts Approved',
  issued: 'Issued',
  rejected: 'Rejected',
};
const STATUS_COLOR: Record<ApprovalStatus, { bg: string; text: string }> = {
  pending: { bg: '#f0a42820', text: '#f0a428' },
  coord_approved: { bg: '#a855f720', text: '#a855f7' },
  accounts_approved: { bg: '#1d6fef20', text: '#1d6fef' },
  issued: { bg: '#2ea04320', text: '#2ea043' },
  rejected: { bg: '#da363320', text: '#da3633' },
};

interface Props {
  requests: StockRequest[];
  items: StockItem[];
  departments: Department[];
  districts: District[];
  auth: AuthUser;
  onChanged: () => Promise<void>;
}

export default function Approvals({ requests, items, departments, districts, auth, onChanged }: Props) {
  const can = (p: string) => auth.permissions.includes(p);
  const isRequester = can('create_request');
  const isStore = can('issue_stock');
  const canViewAvailability = auth.role === 'store_officer' || auth.role === 'head_accounts';
  const isActor = can('approve_coordinator') || can('approve_accounts') || isStore;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [newReq, setNewReq] = useState(false);
  const [reqForm, setReqForm] = useState({ notes: '', items: [] as { stockItemId: string; qty: string }[] });
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'all'>('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const detail = requests.find(r => r.id === detailId) ?? null;

  const deptName = (id?: string | null) => departments.find(d => d.id === id)?.name || '';
  const distName = (id?: string | null) => districts.find(d => d.id === id)?.name || '';
  const itemName = (id: string) => items.find(i => i.id === id)?.name || `Item #${id}`;
  const requesterLabel = (r: StockRequest) =>
    r.requesterType === 'internal' ? `${deptName(r.departmentId)} Dept` : `${distName(r.districtId)} District`;

  // The API already limits what this user may see, so no client-side filtering is needed.
  const visibleRequests = requests;
  const filtered = filterStatus === 'all' ? visibleRequests : visibleRequests.filter(r => r.status === filterStatus);
  const pendingForMe = visibleRequests.filter(r => r.canAct).length;

  const statusCounts = (['pending', 'coord_approved', 'accounts_approved', 'issued', 'rejected'] as ApprovalStatus[])
    .map(s => ({ status: s, count: visibleRequests.filter(r => r.status === s).length }))
    .filter(x => x.count > 0);

  function openDetail(r: StockRequest) {
    setDetailId(r.id);
    setShowRejectInput(false);
    setRejectNote('');
    setError('');
  }

  async function act(path: string, body?: unknown, keepDetailOpen = false) {
    setBusy(true);
    setError('');
    try {
      await api.post(path, body);
      await onChanged();
      if (!keepDetailOpen) setDetailId(null);
      setRejectNote('');
      setShowRejectInput(false);
    } catch (e) {
      setError(errorMessage(e)); // e.g. "Insufficient stock for A4 Paper Ream: requested 30, available 25."
    } finally {
      setBusy(false);
    }
  }

  const approve = (r: StockRequest) => act(`/requests/${r.id}/approve`, undefined, isStore);
  const reject = (r: StockRequest) => act(`/requests/${r.id}/reject`, { notes: rejectNote || undefined });

  async function submitRequest() {
    const lines = reqForm.items.filter(i => i.stockItemId && Number(i.qty) > 0)
      .map(i => ({ stockItemId: i.stockItemId, qty: Number(i.qty) }));
    if (lines.length === 0) { setError('Add at least one item with a quantity'); return; }

    setBusy(true);
    setError('');
    try {
      await api.post('/requests', { notes: reqForm.notes || undefined, items: lines });
      await onChanged();
      setNewReq(false);
      setReqForm({ notes: '', items: [] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const heading = isRequester ? 'My Stock Requests' : isActor ? (isStore ? 'Issue Stock' : 'Approval Queue') : 'All Requests';

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xs font-mono mb-1" style={{ color: '#8b949e', letterSpacing: '0.1em' }}>WORKFLOW</div>
          <h1 className="font-serif font-bold text-2xl" style={{ color: '#c9d1d9' }}>{heading}</h1>
          <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
            {isRequester
              ? `${auth.title ?? auth.roleLabel} — submit and track your stock requisitions`
              : isActor
                ? `${auth.title ?? auth.roleLabel} — review and ${isStore ? 'issue' : 'approve'} pending requests`
                : 'All stock requisitions across the department and districts'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingForMe > 0 && !isRequester && (
            <div className="px-3 py-1.5 rounded text-xs font-mono font-bold" style={{ background: '#f0a42820', color: '#f0a428', border: '1px solid #f0a42840' }}>
              {pendingForMe} awaiting your action
            </div>
          )}
          {isRequester && (
            <button onClick={() => { setError(''); setNewReq(true); }} className="px-4 py-2 rounded text-sm font-semibold" style={{ background: '#1d6fef', color: '#fff' }}>
              + New Request
            </button>
          )}
        </div>
      </div>

      {/* Workflow strip */}
      {isActor && (() => {
        const steps = can('approve_coordinator')
          ? [{ label: 'District Head', color: '#1f8faa', active: false }, { label: 'You → Coordinator', color: '#a855f7', active: true }, { label: 'Head of Accounts', color: '#f0a428', active: false }, { label: 'Store Officer', color: '#2ea043', active: false }]
          : can('approve_accounts')
            ? [{ label: 'Requester', color: '#8b949e', active: false }, { label: '(Coordinator)', color: '#a855f7', active: false }, { label: 'You → Accounts', color: '#f0a428', active: true }, { label: 'Store Officer', color: '#2ea043', active: false }]
            : [{ label: 'Requester', color: '#8b949e', active: false }, { label: '(Coordinator)', color: '#a855f7', active: false }, { label: 'Accounts', color: '#f0a428', active: false }, { label: 'You → Issue', color: '#2ea043', active: true }];
        return (
          <div className="rounded-lg border p-4 mb-6 flex items-center" style={{ background: '#161b22', borderColor: '#30363d' }}>
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center px-3">
                  <div className="text-xs font-semibold px-2 py-1 rounded" style={{
                    background: s.active ? `${s.color}25` : 'transparent',
                    color: s.active ? s.color : '#8b949e',
                    border: s.active ? `1px solid ${s.color}50` : '1px solid transparent',
                    fontWeight: s.active ? 700 : 400,
                  }}>{s.label}</div>
                </div>
                {i < steps.length - 1 && <span className="text-sm" style={{ color: '#30363d' }}>→</span>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilterStatus('all')} className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
          style={{ background: filterStatus === 'all' ? '#c9d1d9' : 'transparent', color: filterStatus === 'all' ? '#0d1117' : '#8b949e', borderColor: filterStatus === 'all' ? '#c9d1d9' : '#30363d' }}>
          All ({visibleRequests.length})
        </button>
        {statusCounts.map(({ status, count }) => (
          <button key={status} onClick={() => setFilterStatus(status)} className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={{
              background: filterStatus === status ? STATUS_COLOR[status].bg : 'transparent',
              color: filterStatus === status ? STATUS_COLOR[status].text : '#8b949e',
              borderColor: filterStatus === status ? STATUS_COLOR[status].text + '60' : '#30363d',
            }}>
            {STATUS_LABEL[status]} ({count})
          </button>
        ))}
      </div>

      {/* Request cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 rounded-lg border" style={{ color: '#8b949e', borderColor: '#30363d', background: '#161b22' }}>
            No requests found
          </div>
        )}
        {filtered.map(req => (
          <div key={req.id} className="rounded-lg border transition-all" style={{
            background: '#161b22',
            borderColor: req.canAct ? '#f0a42840' : '#30363d',
            boxShadow: req.canAct ? '0 0 0 1px #f0a42820' : 'none',
          }}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center flex-wrap gap-3">
                  <span className="font-mono font-bold text-sm" style={{ color: '#1d6fef' }}>{req.requestNo}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{
                    background: req.requesterType === 'external' ? '#1f8faa20' : '#1d6fef20',
                    color: req.requesterType === 'external' ? '#1f8faa' : '#1d6fef',
                  }}>{req.requesterType === 'external' ? 'External' : 'Internal'}</span>
                  <span className="text-sm font-medium" style={{ color: '#c9d1d9' }}>{requesterLabel(req)}</span>
                  <span className="text-xs" style={{ color: '#8b949e' }}>by {req.requesterName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs" style={{ color: '#8b949e' }}>{req.requestDate}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: STATUS_COLOR[req.status].bg, color: STATUS_COLOR[req.status].text }}>
                    {STATUS_LABEL[req.status]}
                  </span>
                  {req.canAct && <span className="text-xs px-2 py-0.5 rounded animate-pulse" style={{ background: '#f0a42830', color: '#f0a428' }}>Action needed</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {req.items.map((ri, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded font-mono" style={{ background: '#1e2530', color: '#c9d1d9' }}>
                    {itemName(ri.stockItemId)} × {ri.requestedQty}
                    {ri.issuedQty > 0 && <span style={{ color: '#2ea043' }}> (issued: {ri.issuedQty})</span>}
                  </span>
                ))}
              </div>

              {req.approvalHistory.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {req.approvalHistory.map((step, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded flex items-center gap-1" style={{
                      background: step.action === 'approved' ? '#2ea04315' : '#da363315',
                      color: step.action === 'approved' ? '#2ea043' : '#da3633',
                      border: `1px solid ${step.action === 'approved' ? '#2ea04330' : '#da363330'}`,
                    }}>
                      {step.action === 'approved' ? '✓' : '✕'} {step.label} — {step.approvedBy}
                    </span>
                  ))}
                </div>
              )}

              {req.notes && <div className="text-xs mb-3" style={{ color: '#8b949e' }}>Note: {req.notes}</div>}

              <button onClick={() => openDetail(req)} className="text-xs px-3 py-1.5 rounded border transition-colors" style={{ borderColor: '#30363d', color: '#8b949e' }}>
                View Details {req.canAct && '& Take Action'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: '#00000090' }} onClick={() => setDetailId(null)}>
          <div className="rounded-xl border w-full max-w-2xl max-h-screen overflow-y-auto" style={{ background: '#161b22', borderColor: '#30363d' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 py-4 border-b" style={{ borderColor: '#30363d' }}>
              <div>
                <div className="font-mono text-sm mb-0.5" style={{ color: '#1d6fef' }}>{detail.requestNo}</div>
                <div className="font-serif font-bold text-lg" style={{ color: '#c9d1d9' }}>{requesterLabel(detail)}</div>
                <div className="text-xs mt-0.5" style={{ color: '#8b949e' }}>Requested by {detail.requesterName} · {detail.requestDate}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: STATUS_COLOR[detail.status].bg, color: STATUS_COLOR[detail.status].text }}>
                  {STATUS_LABEL[detail.status]}
                </span>
                {detail.status === 'issued' && (
                  <button onClick={() => window.print()} className="px-3 py-1.5 rounded text-xs font-semibold" style={{ background: '#2ea043', color: '#fff' }}>
                    Print / Save as PDF
                  </button>
                )}
                <button onClick={() => setDetailId(null)} className="text-lg" style={{ color: '#8b949e' }}>✕</button>
              </div>
            </div>

            <div className="px-6 py-5">
              <ErrorBanner message={error} />

              <div className="mb-5">
                <div className="text-xs font-semibold mb-2" style={{ color: '#8b949e', letterSpacing: '0.08em' }}>REQUESTED ITEMS</div>
                <div className="space-y-2">
                  {detail.items.map((ri, i) => {
                    const si = items.find(x => x.id === ri.stockItemId);
                    const avail = si ? totalStock(si) : 0;
                    const insufficient = canViewAvailability && avail < ri.requestedQty;
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#1e2530' }}>
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#c9d1d9' }}>{itemName(ri.stockItemId)}</div>
                          {canViewAvailability && (
                            <div className="text-xs font-mono" style={{ color: '#8b949e' }}>
                              Available: <span style={{ color: insufficient ? '#da3633' : '#2ea043' }}>{avail} {si?.unit}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold" style={{ color: '#c9d1d9' }}>Req: {ri.requestedQty}</div>
                          {ri.issuedQty > 0 && <div className="text-xs font-mono" style={{ color: '#2ea043' }}>Issued: {ri.issuedQty}</div>}
                          {insufficient && detail.canAct && detail.status !== 'issued' && (
                            <div className="text-xs" style={{ color: '#da3633' }}>⚠ Insufficient stock</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5">
                <div className="text-xs font-semibold mb-2" style={{ color: '#8b949e', letterSpacing: '0.08em' }}>APPROVAL TRAIL</div>
                <div className="space-y-2">
                  {detail.approvalHistory.length === 0
                    ? <div className="text-xs py-2" style={{ color: '#8b949e' }}>No approvals yet</div>
                    : detail.approvalHistory.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#1e2530' }}>
                        <span className="text-base" style={{ color: step.action === 'approved' ? '#2ea043' : '#da3633' }}>
                          {step.action === 'approved' ? '✓' : '✕'}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold" style={{ color: '#c9d1d9' }}>{step.label}</div>
                          <div className="text-xs" style={{ color: '#8b949e' }}>{step.approvedBy} · {step.date}</div>
                          {step.notes && <div className="text-xs mt-0.5" style={{ color: '#f0a428' }}>{step.notes}</div>}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold capitalize" style={{
                          background: step.action === 'approved' ? '#2ea04320' : '#da363320',
                          color: step.action === 'approved' ? '#2ea043' : '#da3633',
                        }}>{step.action}</span>
                      </div>
                    ))}
                </div>
              </div>

              {detail.notes && <div className="mb-5 p-3 rounded text-sm" style={{ background: '#1e2530', color: '#8b949e' }}>📋 {detail.notes}</div>}

              {detail.canAct && !showRejectInput && (
                <div className="flex gap-3 justify-end pt-2 border-t" style={{ borderColor: '#30363d' }}>
                  <button onClick={() => setShowRejectInput(true)} className="px-4 py-2 text-sm rounded font-semibold border"
                    style={{ borderColor: '#da363340', color: '#da3633', background: '#da363310' }}>Reject</button>
                  <button onClick={() => void approve(detail)} disabled={busy} className="px-5 py-2 text-sm rounded font-semibold disabled:opacity-60"
                    style={{ background: '#2ea043', color: '#fff' }}>
                    {isStore ? 'Issue Stock (FIFO)' : 'Approve'}
                  </button>
                </div>
              )}
              {showRejectInput && (
                <div className="pt-2 border-t" style={{ borderColor: '#30363d' }}>
                  <label className="block text-xs mb-1.5" style={{ color: '#8b949e' }}>Rejection reason (optional)</label>
                  <textarea className="w-full px-3 py-2 rounded border text-sm outline-none resize-none mb-3"
                    style={{ background: '#0d1117', borderColor: '#da363350', color: '#c9d1d9' }}
                    rows={2} value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setShowRejectInput(false)} className="px-4 py-2 text-sm rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Cancel</button>
                    <button onClick={() => void reject(detail)} disabled={busy} className="px-4 py-2 text-sm rounded font-semibold disabled:opacity-60"
                      style={{ background: '#da3633', color: '#fff' }}>Confirm Reject</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Request modal (requesters only) */}
      {newReq && isRequester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: '#00000090' }} onClick={() => setNewReq(false)}>
          <div className="rounded-xl border w-full max-w-lg max-h-screen overflow-y-auto" style={{ background: '#161b22', borderColor: '#30363d' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#30363d' }}>
              <div>
                <h2 className="font-serif font-bold text-lg" style={{ color: '#c9d1d9' }}>New Stock Request</h2>
                <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>{auth.title ?? auth.roleLabel}</p>
              </div>
              <button onClick={() => setNewReq(false)} style={{ color: '#8b949e' }}>✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <ErrorBanner message={error} />
              <div className="p-3 rounded-lg text-sm" style={{ background: '#1e2530', color: '#8b949e' }}>
                <div className="font-semibold mb-1" style={{ color: '#c9d1d9' }}>Approval workflow for your request:</div>
                {auth.role === 'district_head'
                  ? 'You → Head of District Coordinator → Head of Accounts → Store Officer'
                  : 'You → Head of Accounts → Store Officer'}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold" style={{ color: '#8b949e' }}>STOCK ITEMS</label>
                  <button onClick={() => setReqForm(f => ({ ...f, items: [...f.items, { stockItemId: items[0]?.id || '', qty: '' }] }))}
                    className="text-xs px-2 py-1 rounded" style={{ background: '#1d6fef20', color: '#1d6fef' }}>+ Add Item</button>
                </div>
                {reqForm.items.map((ri, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select className="flex-1 px-3 py-2 rounded border text-sm outline-none" style={{ background: '#0d1117', borderColor: '#30363d', color: '#c9d1d9' }}
                      value={ri.stockItemId}
                      onChange={e => {
                        const upd = [...reqForm.items]; upd[i] = { ...ri, stockItemId: e.target.value };
                        setReqForm(f => ({ ...f, items: upd }));
                      }}>
                      {items.map(si => (
                        <option key={si.id} value={si.id}>
                          {canViewAvailability ? `${si.name} (Available: ${totalStock(si)} ${si.unit})` : si.name}
                        </option>
                      ))}
                    </select>
                    <input type="number" min="1" placeholder="Qty" className="w-20 px-3 py-2 rounded border text-sm outline-none"
                      style={{ background: '#0d1117', borderColor: '#30363d', color: '#c9d1d9' }} value={ri.qty}
                      onChange={e => {
                        const upd = [...reqForm.items]; upd[i] = { ...ri, qty: e.target.value };
                        setReqForm(f => ({ ...f, items: upd }));
                      }} />
                    <button onClick={() => setReqForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} style={{ color: '#da3633' }}>✕</button>
                  </div>
                ))}
                {reqForm.items.length === 0 && (
                  <div className="text-xs py-3 text-center rounded border border-dashed" style={{ color: '#8b949e', borderColor: '#30363d' }}>
                    Click "+ Add Item" to add stock items to your request
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#8b949e' }}>NOTES (optional)</label>
                <textarea className="w-full px-3 py-2 rounded border text-sm outline-none resize-none" style={{ background: '#0d1117', borderColor: '#30363d', color: '#c9d1d9' }}
                  rows={2} value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for request..." />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button onClick={() => setNewReq(false)} className="px-4 py-2 text-sm rounded border" style={{ borderColor: '#30363d', color: '#8b949e' }}>Cancel</button>
                <button onClick={() => void submitRequest()} disabled={busy} className="px-4 py-2 text-sm rounded font-semibold disabled:opacity-60" style={{ background: '#1d6fef', color: '#fff' }}>Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detail?.status === 'issued' && (
        <section id="issue-voucher-print" aria-label="Issued stock voucher">
          <header className="voucher-header">
            <h1>STOCK ISSUE VOUCHER</h1>
            <div className="voucher-request-no">{detail.requestNo}</div>
          </header>
          <div className="voucher-meta">
            <div><strong>Department / District:</strong> {requesterLabel(detail)}</div>
            <div><strong>Requested by:</strong> {detail.requesterName}</div>
            <div><strong>Request date:</strong> {detail.requestDate}</div>
            <div><strong>Issue date:</strong> {detail.approvalHistory.find(step => step.role === 'store_officer' && step.action === 'approved')?.date ?? detail.requestDate}</div>
          </div>
          <table className="voucher-table">
            <thead>
              <tr><th>No.</th><th>Item</th><th>Unit</th><th>Requested Qty</th><th>Issued Qty</th></tr>
            </thead>
            <tbody>
              {detail.items.map((line, index) => {
                const item = items.find(candidate => candidate.id === line.stockItemId);
                return (
                  <tr key={line.stockItemId}>
                    <td>{index + 1}</td>
                    <td>{itemName(line.stockItemId)}</td>
                    <td>{item?.unit ?? ''}</td>
                    <td>{line.requestedQty}</td>
                    <td>{line.issuedQty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {detail.notes && <p className="voucher-notes"><strong>Notes:</strong> {detail.notes}</p>}
          <div className="voucher-signatures">
            <div className="voucher-signature">
              <div className="voucher-signature-line" />
              <strong>Store Officer</strong>
              <span>Signature and date</span>
            </div>
            <div className="voucher-signature">
              <div className="voucher-signature-line" />
              <strong>Accountant</strong>
              <span>Signature and date</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
