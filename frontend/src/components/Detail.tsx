import { useEffect, useState } from 'react';
import { api, type TrashRecordResponse } from '../api/client';

export default function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const [r, setR] = useState<TrashRecordResponse | null>(null);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    api.getTrash(id).then(setR).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  if (error) return <div className="card"><p className="bad">{error}</p><button onClick={onBack}>Volver</button></div>;
  if (!r) return <div className="card">Cargando detalle…</div>;

  const rows: Array<[string, number]> = [
    ['Plástico', r.plasticPercentage],
    ['Orgánico', r.organicPercentage],
    ['Papel', r.paperPercentage],
    ['Vidrio', r.glassPercentage],
    ['Metal', r.metalPercentage],
    ['Peligroso', r.hazardousPercentage],
    ['E-waste', r.eWastePercentage],
    ['Tratamiento especial', r.specialTreatmentPercentage],
    ['Otro', r.otherPercentage],
  ];

  return (
    <div className="card">
      <button className="ghost" onClick={onBack}>← Volver</button>
      <h2>{r.outfallCode || 'Reporte'} · {r.siteType || 'punto'}</h2>
      <p><small>{new Date(r.createdAt).toLocaleString()} · {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)} · flujo {r.flowObserved || '—'}</small></p>
      {r.imageUrl && <img src={r.imageUrl} alt="evidencia" style={{ maxWidth: '100%', borderRadius: 8 }} />}
      <table>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}><td>{k}</td><td><strong>{v.toFixed(1)}%</strong></td></tr>
          ))}
        </tbody>
      </table>
      {r.description && <p><strong>Claude observó:</strong> {r.description}</p>}
      {r.suggestedCleanup && <p><strong>Limpieza:</strong> {r.suggestedCleanup}</p>}
      {r.notes && <p><strong>Notas campo:</strong> {r.notes}</p>}
      <p><strong>Procedencia:</strong> {r.source === 'demo' ? 'Dato sintético/demo' : r.source === 'claude' ? 'Estimación por IA' : (r.source || 'Observación manual')}</p>
      <p><strong>Revisión:</strong> {r.observation?.review?.status || 'pendiente'}</p>
      {!r.observation?.review && <button disabled={reviewing} onClick={async () => { setReviewing(true); try { await api.reviewTrash(r.id, 'approved'); setR(await api.getTrash(r.id)); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setReviewing(false); } }}>Confirmar análisis</button>}
      {r.observation?.point?.weapElementCode && <p><strong>WEAP:</strong> {r.observation.point.weapElementCode} (resultados importados se conservan por periodo y unidad)</p>}
      <p><small>Fase 2 usará este punto para trazar el origen aguas-arriba. Fase 4 lo alimentará a WEAP.</small></p>
    </div>
  );
}
