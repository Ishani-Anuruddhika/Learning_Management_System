import type { DashboardData } from '../types';

interface Props {
  data: DashboardData | null;
}

export default function Dashboard({ data }: Props) {
  if (!data) {
    return <div className="text-sm" style={{ color: '#8b949e' }}>Loading dashboard…</div>;
  }

  const stats = [
    { label: 'Total Stock Items', value: data.totalItems, icon: '◫', color: '#1d6fef' },
    { label: 'Total Stock Value', value: `LKR ${data.totalValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, icon: '◈', color: '#2ea043' },
    { label: 'Pending Approvals', value: data.pending, icon: '✦', color: '#f0a428' },
    { label: 'Low Stock Alerts', value: data.lowStock, icon: '⚠', color: '#da3633' },
    { label: 'Requests Issued', value: data.issued, icon: '✓', color: '#2ea043' },
    { label: 'Total Requests', value: data.totalRequests, icon: '⇌', color: '#1f8faa' },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-mono mb-1" style={{ color: '#8b949e', letterSpacing: '0.1em' }}>OVERVIEW</div>
        <h1 className="font-serif font-bold text-2xl" style={{ color: '#c9d1d9' }}>Stock Control Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
          Central store — {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="rounded-lg p-4 border" style={{ background: '#161b22', borderColor: '#30363d' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs mb-2" style={{ color: '#8b949e' }}>{s.label}</div>
                <div className="text-xl font-bold font-mono" style={{ color: '#c9d1d9' }}>{s.value}</div>
              </div>
              <span className="text-lg" style={{ color: s.color }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border" style={{ background: '#161b22', borderColor: '#30363d' }}>
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: '#30363d' }}>
            <span style={{ color: '#da3633' }}>⚠</span>
            <span className="font-semibold text-sm" style={{ color: '#c9d1d9' }}>Low Stock Alerts</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#30363d' }}>
            {data.lowStockItems.length === 0 ? (
              <div className="px-5 py-4 text-sm" style={{ color: '#8b949e' }}>All items at adequate levels</div>
            ) : data.lowStockItems.map(item => (
              <div key={item.id} className="px-5 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium" style={{ color: '#c9d1d9' }}>{item.name}</div>
                  <div className="text-xs font-mono" style={{ color: '#8b949e' }}>{item.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold" style={{ color: '#da3633' }}>{item.stock} {item.unit}</div>
                  <div className="text-xs" style={{ color: '#8b949e' }}>Min: {item.minStock}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border" style={{ background: '#161b22', borderColor: '#30363d' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: '#30363d' }}>
            <span className="font-semibold text-sm" style={{ color: '#c9d1d9' }}>Recent Transactions</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#30363d' }}>
            {data.recentTransactions.length === 0 && (
              <div className="px-5 py-4 text-sm" style={{ color: '#8b949e' }}>No transactions to show</div>
            )}
            {data.recentTransactions.map(tx => (
              <div key={tx.id} className="px-5 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium truncate max-w-40" style={{ color: '#c9d1d9' }}>{tx.itemName}</div>
                  <div className="text-xs font-mono" style={{ color: '#8b949e' }}>{tx.date} · {tx.batchNo}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold" style={{
                  background: tx.type === 'receipt' ? '#2ea04320' : '#da363320',
                  color: tx.type === 'receipt' ? '#2ea043' : '#da3633',
                }}>
                  {tx.type === 'receipt' ? '+' : '-'}{tx.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
