<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Annual Stock Report {{ $year }}</title>
  @include('reports._style')
</head>
<body>
  <h1>Annual Stock Report {{ $year }}</h1>
  <div class="muted">{{ $org }} — Generated {{ $generatedAt->format('d/m/Y H:i') }}</div>

  <div class="box">
    <strong>Requests:</strong> {{ $overall['total'] }} &nbsp;&nbsp;
    <strong>Issued:</strong> {{ $overall['issued'] }} &nbsp;&nbsp;
    <strong>Rejected:</strong> {{ $overall['rejected'] }} &nbsp;&nbsp;
    <strong>Units issued:</strong> {{ $overall['units'] }}
  </div>

  <h2>Stock movement by item</h2>
  <table>
    <thead>
      <tr><th>Code</th><th>Item</th><th>Category</th><th>Unit</th><th class="num">Opening</th><th class="num">Received</th><th class="num">Issued</th><th class="num">Closing</th></tr>
    </thead>
    <tbody>
    @foreach ($stockRows as $r)
      <tr>
        <td>{{ $r['item']->code }}</td>
        <td>{{ $r['item']->name }}</td>
        <td>{{ $r['item']->category->name }}</td>
        <td>{{ $r['item']->unit }}</td>
        <td class="num">{{ $r['opening'] }}</td>
        <td class="num">{{ $r['received'] }}</td>
        <td class="num">{{ $r['issued'] }}</td>
        <td class="num">{{ $r['closing'] }}</td>
      </tr>
    @endforeach
    </tbody>
  </table>

  <h2 class="pagebreak">Requests by internal department</h2>
  <table>
    <thead>
      <tr><th>Department</th><th>Head</th><th class="num">Requests</th><th class="num">Issued</th><th class="num">Rejected</th><th class="num">Units issued</th></tr>
    </thead>
    <tbody>
    @foreach ($deptRows as $r)
      <tr>
        <td>{{ $r['org']->name }}</td>
        <td>{{ $r['org']->head_name }}</td>
        <td class="num">{{ $r['stats']['total'] }}</td>
        <td class="num">{{ $r['stats']['issued'] }}</td>
        <td class="num">{{ $r['stats']['rejected'] }}</td>
        <td class="num">{{ $r['stats']['units'] }}</td>
      </tr>
    @endforeach
    </tbody>
  </table>

  <h2>Requests by external district</h2>
  <table>
    <thead>
      <tr><th>No.</th><th>District</th><th>Head</th><th class="num">Requests</th><th class="num">Issued</th><th class="num">Rejected</th><th class="num">Units issued</th></tr>
    </thead>
    <tbody>
    @foreach ($distRows as $r)
      <tr>
        <td>{{ $r['org']->number }}</td>
        <td>{{ $r['org']->name }}</td>
        <td>{{ $r['org']->head_name }}</td>
        <td class="num">{{ $r['stats']['total'] }}</td>
        <td class="num">{{ $r['stats']['issued'] }}</td>
        <td class="num">{{ $r['stats']['rejected'] }}</td>
        <td class="num">{{ $r['stats']['units'] }}</td>
      </tr>
    @endforeach
    </tbody>
  </table>
</body>
</html>
