import { useEffect, useState } from 'react';
import { api, type TrashRecordResponse } from '../api/client';

function top3(r: TrashRecordResponse): string {
  const entries: Array<[string, number]> = [
    ['desechos plásticos', r.plasticPercentage],
    ['desechos orgánicos', r.organicPercentage],
    ['residuos celulósicos flotantes', r.paperPercentage],
    ['desechos de vidrio', r.glassPercentage],
    ['desechos metálicos', r.metalPercentage],
    ['peligrosos', r.hazardousPercentage],
    ['desechos electrónicos', r.eWastePercentage],
    ['productos químicos', r.specialTreatmentPercentage],
    ['otro', r.otherPercentage],
  ];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k} ${v.toFixed(0)}%`)
    .join(' · ');
}

export default function Dashboard({ refreshKey, onSelect }: { refreshKey: number; onSelect: (id: string) => void }) {
  const [items, setItems] = useState<TrashRecordResponse[]>([]);
  const [filter, setFilter] = useState<string>('todos');
  const [error, setError] = useState<string>('');

  async function load() {
    try {
      setError('');
      setItems(await api.listTrash());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function remove(id: string) {
    if (!confirm('¿Borrar este reporte?')) return;
    await api.deleteTrash(id);
    load();
  }

  function downloadCsv() {
    const headers = ['id', 'createdAt', 'latitude', 'longitude', 'siteType', 'outfallCode', 'flowObserved', 'plasticPercentage', 'organicPercentage', 'paperPercentage', 'glassPercentage', 'metalPercentage', 'otherPercentage', 'eWastePercentage', 'hazardousPercentage', 'specialTreatmentPercentage', 'description', 'suggestedCleanup', 'imageUrl', 'source'];
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...items.map((r) => headers.map((h) => cell((r as unknown as Record<string, unknown>)[h])))].map((row) => row.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'hydrotrash-reportes.csv'; a.click(); URL.revokeObjectURL(url);
  }

  const filtered = items.filter((r) => {
    if (filter === 'peligrosos') return r.hazardousPercentage > 10;
    if (filter === 'plastico') return r.plasticPercentage > 40;
    if (filter === 'desfogues') return (r.siteType || '').toLowerCase() === 'desfogue';
    if (filter === 'tramos') return (r.siteType || '').toLowerCase() === 'tramo_rio';
    return true;
  });

  const avgPlastic = items.length ? items.reduce((a, r) => a + r.plasticPercentage, 0) / items.length : 0;
  const hazardousCount = items.filter((r) => r.hazardousPercentage > 10).length;

  return (
    <div className="card">
      <h2>Reportes Río Contreras ({filtered.length}/{items.length})</h2>
      <p><small>Promedio plástico {avgPlastic.toFixed(1)}% · Peligrosos (&gt;10%): {hazardousCount}</small></p>
      <div className="row">
        {[['todos', 'Todos'], ['desfogues', 'Desfogues'], ['tramos', 'Tramos de ríos']].map(([value, label]) => (
          <button key={value} type="button" className={filter === value ? '' : 'ghost'} onClick={() => setFilter(value)}>{label}</button>
        ))}
        <button type="button" className="ghost" onClick={load}>Recargar</button>
        <button type="button" className="ghost" onClick={downloadCsv} disabled={!items.length}>Descargar datos CSV</button>
      </div>
      {error && <p className="bad">{error}</p>}
      <div className="grid">
        {filtered.map((r) => (
          <div key={r.id} className="mini">
            <strong>{r.outfallCode || r.siteType || 'Punto'} · {new Date(r.createdAt).toLocaleString()}</strong>
            <div><small>{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)} · flujo: {r.flowObserved || '—'}</small></div>
            <div>{top3(r)}</div>
            {r.hazardousPercentage > 10 && <span className="badge danger">peligroso</span>}
            {r.eWastePercentage > 5 && <span className="badge warn">e-waste</span>}
            {r.specialTreatmentPercentage > 10 && <span className="badge info">trat. especial</span>}
            {r.description && <div><small>{r.description}</small></div>}
            <div className="row">
              <button type="button" onClick={() => onSelect(r.id)}>Ver</button>
              <button type="button" className="ghost" onClick={() => remove(r.id)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
      {!filtered.length && <p><small>Sin reportes. Sube la primera foto de un desfogue.</small></p>}
    </div>
  );
}
