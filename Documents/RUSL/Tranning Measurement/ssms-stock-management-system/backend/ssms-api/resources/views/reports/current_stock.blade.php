<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Current Stock Report</title>
  @include('reports._style')
</head>
<body>
  <h1>Current Stock Report</h1>
  <div class="muted">{{ $org }} — Generated {{ $generatedAt->format('d/m/Y H:i') }}</div>

  <div class="box">
    <strong>Total items:</strong> {{ $rows->count() }} &nbsp;&nbsp;
    <strong>Total stock value:</strong> LKR {{ number_format($totalValue, 2) }} &nbsp;&nbsp;
    <strong>Low stock items:</strong> <span class="{{ $lowCount ? 'low' : 'ok' }}">{{ $lowCount }}</span>
  </div>

  <h2>Stock summary</h2>
  <table>
    <thead>
      <tr><th>Code</th><th>Item</th><th>Category</th><th>Unit</th><th class="num">Available</th><th class="num">Min</th><th>Status</th><th class="num">Value (LKR)</th></tr>
    </thead>
    <tbody>
    @foreach ($rows as $r)
      <tr>
        <td>{{ $r['item']->code }}</td>
        <td>{{ $r['item']->name }}</td>
        <td>{{ $r['item']->category->name }}</td>
        <td>{{ $r['item']->unit }}</td>
        <td class="num">{{ $r['qty'] }}</td>
        <td class="num">{{ $r['item']->min_stock }}</td>
        <td class="{{ $r['low'] ? 'low' : 'ok' }}">{{ $r['low'] ? 'LOW STOCK' : 'Adequate' }}</td>
        <td class="num">{{ number_format($r['value'], 2) }}</td>
      </tr>
    @endforeach
    </tbody>
  </table>

  <h2 class="pagebreak">FIFO batch detail (oldest batch is issued first)</h2>
  <table>
    <thead>
      <tr><th>FIFO</th><th>Code</th><th>Item</th><th>Batch</th><th>Received</th><th>Expiry</th><th class="num">Received qty</th><th class="num">Issued</th><th class="num">Available</th><th class="num">Unit cost</th><th class="num">Value</th></tr>
    </thead>
    <tbody>
    @foreach ($rows as $r)
      @php $next = true; @endphp
      @foreach ($r['item']->batches->where('quantity_remaining', '>', 0) as $b)
        <tr>
          <td>{{ $next ? 'NEXT' : '' }}</td>
          <td>{{ $r['item']->code }}</td>
          <td>{{ $r['item']->name }}</td>
          <td>{{ $b->batch_no }}</td>
          <td>{{ $b->received_date->format('Y-m-d') }}</td>
          <td>{{ $b->expiry_date?->format('Y-m-d') ?? '—' }}</td>
          <td class="num">{{ $b->quantity_received }}</td>
          <td class="num">{{ $b->quantity_received - $b->quantity_remaining }}</td>
          <td class="num">{{ $b->quantity_remaining }}</td>
          <td class="num">{{ number_format($b->unit_cost, 2) }}</td>
          <td class="num">{{ number_format($b->quantity_remaining * $b->unit_cost, 2) }}</td>
        </tr>
        @php $next = false; @endphp
      @endforeach
    @endforeach
    </tbody>
  </table>
</body>
</html>
