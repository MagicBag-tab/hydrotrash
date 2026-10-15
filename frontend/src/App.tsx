import { useEffect, useState } from 'react';
import { api } from './api/client';

export default function App() {
  const [health, setHealth] = useState<string>('probando…');
  const [count, setCount] = useState<number | null>(null);
  const [err, setErr] = useState<string>('');

  async function check() {
    setErr('');
    try {
      const h = await api.health();
      setHealth(h.status);
      const list = await api.listTrash();
      setCount(list.length);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setHealth('sin conexión');
    }
  }

  useEffect(() => {
    check();
  }, []);

  return (
    <div className="wrap">
      <h1>HydroTrash <span>· Río Contreras</span></h1>
      <p><small>Fase 0 — verificación frontend ↔ backend. Microcuenca 5.56 km² · Santa Catarina Pinula / Zona 15.</small></p>
      <div className="card">
        <p>Backend <code>{(import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL || 'proxy Vite → http://localhost:3000'}</code></p>
        <p>GET /health → <span className={health === 'ok' ? 'ok' : 'bad'}>{health}</span></p>
        <p>GET /api/trash → {count === null ? '—' : <strong>{count} reportes</strong>}</p>
        {err && <p className="bad">Error: {err} — ¿corriste el backend con `npm run dev`?</p>}
        <button onClick={check}>Reintentar</button>
      </div>
      <div className="card">
        <strong>Siguiente (Fase 1):</strong> Reportar desfogue por foto + GPS + Dashboard. Si ves <span className="ok">ok</span> arriba, la Fase 0 está completa.
      </div>
    </div>
  );
}
