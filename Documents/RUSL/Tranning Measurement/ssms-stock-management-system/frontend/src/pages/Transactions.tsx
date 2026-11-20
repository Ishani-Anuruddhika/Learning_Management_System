import type { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
}

export default function Transactions({ transactions }: Props) {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-mono mb-1" style={{ color: '#8b949e', letterSpacing: '0.1em' }}>LEDGER</div>
        <h1 className="font-serif font-bold text-2xl" style={{ color: '#c9d1d9' }}>Transaction History</h1>
        <p className="text-sm mt-1" style={{ color: '#8b949e' }}>All stock movements — receipts and issues (FIFO order)</p>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#30363d' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#0d1117' }}>
              {['Date', 'Type', 'Item Name', 'Batch No', 'Quantity', 'Reference / Request'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#8b949e', borderBottom: '1px solid #30363d' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(tx => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #30363d' }}>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#8b949e' }}>{tx.date}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{
                    background: tx.type === 'receipt' ? '#2ea04320' : '#da363320',
                    color: tx.type === 'receipt' ? '#2ea043' : '#da3633'
                  }}>{tx.type === 'receipt' ? '▲ RECEIPT' : '▼ ISSUE'}</span>
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: '#c9d1d9' }}>{tx.itemName}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1d6fef' }}>{tx.batchNo}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: tx.type === 'receipt' ? '#2ea043' : '#da3633' }}>
                  {tx.type === 'receipt' ? '+' : '-'}{tx.quantity}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: '#8b949e' }}>
                  {tx.requestNo && <span className="font-mono mr-2" style={{ color: '#f0a428' }}>{tx.requestNo}</span>}
                  {tx.reference}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <div className="text-center py-10 text-sm" style={{ color: '#8b949e' }}>No transactions recorded</div>}
      </div>
    </div>
  );
}
