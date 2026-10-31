import { useEffect, useState } from 'react';
import { api, type WeapScenario, type WeapResult, type WeapRun } from '../api/client';

export default function WeapPanel({ refreshKey }: { refreshKey: number }) {
  const [scenarios, setScenarios] = useState<WeapScenario[]>([]);
  const [sel, setSel] = useState('integral');
  const [ptar, setPtar] = useState(60);
  const [refo, setRefo] = useState(20);
  const [lluvia, setLluvia] = useState(1);
  const [res, setRes] = useState<WeapResult | null>(null);
  const [base, setBase] = useState<WeapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [runs, setRuns] = useState<WeapRun[]>([]);

  useEffect(() => {
    api.weapScenarios().then(setScenarios).catch((e) => setErr(String(e)));
    api.weapRuns().then(setRuns).catch(() => setRuns([]));
  }, []);

  async function run() {
    setLoading(true); setErr('');
    try {
      const [r, b] = await Promise.all([
        api.weapResults(sel, { ptar, refo, lluvia }),
        api.weapResults('base_2026'),
      ]);
      setRes(r); setBase(b);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  useEffect(() => { run(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxP = Math.max(1, base?.totales.plastico ?? 1, res?.totales.plastico ?? 1);
  const latestRun = runs[0];
  const series = latestRun?.results.filter((row) => row.variable.toLowerCase() === 'streamflow') ?? [];
  const maxFlow = Math.max(0.000001, ...series.map((row) => Math.abs(row.value)));

  async function exportPoints() {
    const blob = await api.observationPointsExport();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'hydrotrash-puntos-weap.csv'; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <h2>Escenarios del río</h2>
      <div className="row">
        <label>Escenario
          <select value={sel} onChange={(e) => setSel(e.target.value)}>
            {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>PTAR % <input type="number" min={0} max={90} value={ptar} onChange={(e) => setPtar(Number(e.target.value))} /></label>
        <label>Reforestación % <input type="number" min={0} max={50} value={refo} onChange={(e) => setRefo(Number(e.target.value))} /></label>
        <label>Lluvia × <input type="number" step={0.1} min={0.5} max={1.5} value={lluvia} onChange={(e) => setLluvia(Number(e.target.value))} /></label>
        <button type="button" onClick={run} disabled={loading}>{loading ? 'Modelando…' : 'Modelar'}</button>
      </div>
      {err && <p className="bad">{err}</p>}
      {res && base && (
        <>
          <div className="row">
            <div><strong>Base plástico:</strong> {base.totales.plastico}</div>
            <div><strong>{res.scenario}:</strong> {res.totales.plastico}</div>
            {res.reduccionVsBase && (
              <div className="ok">−{res.reduccionVsBase.plasticoPct}% plástico · −{res.reduccionVsBase.organicoPct}% orgánico vs base</div>
            )}
          </div>
          <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
            {res.nodos.map((n) => (
              <div key={n.id} title={`${n.outfallCode || n.id}: plástico ${n.cargaPlastico}, orgánica ${n.cargaOrganica}`}>
                <small>{n.outfallCode || n.id.slice(0, 6)} · plástico {n.cargaPlastico}</small>
                <div style={{ background: '#eee', borderRadius: 6 }}>
                  <div style={{ width: `${Math.max(2, (n.cargaPlastico / maxP) * 100 * res.nodos.length / 6)}%`, background: '#1c7c3c', height: 10, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
          <details style={{ marginTop: 8 }}>
            <summary>Supuestos del modelo (mostrar al jurado)</summary>
            <ul>{res.supuestos.map((s, i) => <li key={i}><small>{s}</small></li>)}</ul>
            <p><small>Compara escenarios de manejo del río y sus posibles efectos sobre los residuos.</small></p>
          </details>
        </>
      )}
      <div style={{ marginTop: 16, borderTop: '1px solid #d8e8de', paddingTop: 12 }}>
        <h3>Resultados importados desde WEAP</h3>
        <button type="button" className="ghost" onClick={exportPoints}>Descargar puntos para WEAP</button>
        {latestRun ? (
          <>
            <p><small>Escenario: <strong>{latestRun.scenario}</strong> · {latestRun.results.length} registros · {new Date(latestRun.importedAt).toLocaleString()}</small></p>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Punto</th><th>Periodo</th><th>Variable</th><th>Valor</th><th>Unidad</th></tr></thead>
                <tbody>{latestRun.results.slice(0, 20).map((row) => (
                  <tr key={row.id}><td>{row.elementCode}</td><td>{row.periodStart.slice(0, 10)} – {row.periodEnd.slice(0, 10)}</td><td>{row.variable}</td><td>{row.value}</td><td>{row.unit}</td></tr>
                ))}</tbody>
              </table>
            </div>
            {series.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <strong>Caudal por periodo</strong>
                <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                  {series.map((row) => (
                    <div key={row.id} title={`${row.periodStart.slice(0, 10)}: ${row.value} ${row.unit}`}>
                      <small>{row.periodStart.slice(0, 7)} · {row.value}</small>
                      <div style={{ background: '#e8eee9', borderRadius: 6, height: 12 }}>
                        <div style={{ width: `${Math.max(2, Math.abs(row.value) / maxFlow * 100)}%`, background: '#147d73', height: 12, borderRadius: 6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {latestRun.results.length > 20 && <small>Mostrando los primeros 20 registros.</small>}
          </>
        ) : <p><small>Aún no hay resultados importados desde WEAP.</small></p>}
      </div>
    </div>
  );
}
