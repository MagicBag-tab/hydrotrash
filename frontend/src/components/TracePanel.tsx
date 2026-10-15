import { useEffect, useState } from 'react';
import { api, type TraceCandidate } from '../api/client';

export default function TracePanel({ targetId, onClose }: { targetId: string | null; onClose: () => void }) {
  const [cands, setCands] = useState<TraceCandidate[]>([]);
  const [toCode, setToCode] = useState<string | null>(null);
  const [metodo, setMetodo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    api.trace(targetId)
      .then((r) => { setCands(r.candidates); setToCode(r.to.code); setMetodo(r.metodo); })
      .catch((e) => setMetodo(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [targetId]);

  if (!targetId) return null;
  return (
    <div className="card">
      <h2>¿De dónde viene la contaminación? <small>{toCode ? `→ ${toCode}` : ''}</small></h2>
      {loading && <p>Calculando origen…</p>}
      {!loading && cands.length === 0 && <p>No hay candidatos cercanos. Sembrar más desfogues aguas arriba.</p>}
      <ul>
        {cands.map((c) => (
          <li key={c.fromId}>
            <strong>{c.fromCode || c.fromId.slice(0, 8)}</strong> — score {c.score}% · {c.reason}
          </li>
        ))}
      </ul>
      <p><small>{metodo}</small></p>
      <button type="button" className="ghost" onClick={onClose}>Cerrar</button>
    </div>
  );
}
