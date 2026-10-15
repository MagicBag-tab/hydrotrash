import { useState } from 'react';
import { api, CONTRERAS_CENTER, type ReportInput, type TrashAnalysis } from '../api/client';

const PERCENT_LABELS: Array<[keyof TrashAnalysis, string]> = [
  ['plasticPercentage', 'Plástico'],
  ['organicPercentage', 'Orgánico'],
  ['paperPercentage', 'Papel'],
  ['glassPercentage', 'Vidrio'],
  ['metalPercentage', 'Metal'],
  ['hazardousPercentage', 'Peligroso'],
  ['eWastePercentage', 'E-waste'],
  ['specialTreatmentPercentage', 'Trat. especial'],
  ['otherPercentage', 'Otro'],
];

export default function ReportForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [lat, setLat] = useState<string>(String(CONTRERAS_CENTER.lat));
  const [lng, setLng] = useState<string>(String(CONTRERAS_CENTER.lng));
  const [meta, setMeta] = useState<ReportInput>({ siteType: 'desfogue', outfallCode: '', flowObserved: 'leve', notes: '' });
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<TrashAnalysis | null>(null);

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)) {
      setError('Tipo inválido. Usa JPEG, PNG, GIF o WebP.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('La foto supera 10MB (límite del backend). Toma otra con menor resolución.');
      return;
    }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function useGps() {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
      return;
    }
    setStatus('Obteniendo GPS…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude.toFixed(6)));
        setLng(String(p.coords.longitude.toFixed(6)));
        setStatus('');
      },
      () => {
        setError('No se pudo obtener el GPS. Marca el punto manualmente.');
        setStatus('');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Falta la foto del desfogue/alcantarilla.');
      return;
    }
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) {
      setError('Latitud/longitud inválidas. El backend exige MISSING_COORDINATES si faltan.');
      return;
    }
    try {
      setStatus('Subiendo… luego Claude analiza (20-60s, no cierres)…');
      const r = await api.analyze(file, la, ln, meta);
      setResult(r.trash);
      setStatus(`Guardado con id ${r.id}`);
      onCreated(r.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('');
    }
  }

  return (
    <div className="card">
      <h2>Reportar desfogue</h2>
      <p><small>Foto + GPS obligatorios. Enfoca la boca del desfogue o la basura acumulada.</small></p>
      <form onSubmit={submit}>
        <label>Foto (cámara en móvil)<br />
          <input type="file" accept="image/*" capture="environment" onChange={(e) => pickFile(e.target.files?.[0])} />
        </label>
        {preview && <div><img src={preview} alt="preview" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }} /></div>}
        <div className="row">
          <label>Tipo punto<br />
            <select value={meta.siteType} onChange={(e) => setMeta({ ...meta, siteType: e.target.value })}>
              <option value="desfogue">Desfogue</option>
              <option value="alcantarilla">Alcantarilla</option>
              <option value="tramo_rio">Tramo de río</option>
            </select>
          </label>
          <label>Código (ej. D-03)<br />
            <input value={meta.outfallCode} onChange={(e) => setMeta({ ...meta, outfallCode: e.target.value })} placeholder="D-03" />
          </label>
          <label>Flujo observado<br />
            <select value={meta.flowObserved} onChange={(e) => setMeta({ ...meta, flowObserved: e.target.value })}>
              <option value="seco">Seco</option>
              <option value="leve">Leve</option>
              <option value="fuerte">Fuerte</option>
            </select>
          </label>
        </div>
        <div className="row">
          <label>Latitud*<br /><input value={lat} onChange={(e) => setLat(e.target.value)} /></label>
          <label>Longitud*<br /><input value={lng} onChange={(e) => setLng(e.target.value)} /></label>
          <label>&nbsp;<br /><button type="button" onClick={useGps}>Usar mi GPS</button></label>
        </div>
        <label>Notas de campo<br />
          <input value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} placeholder="Olor fuerte, espuma, taponamiento…" style={{ width: '100%' }} />
        </label>
        <div style={{ marginTop: 8 }}>
          <button type="submit">Analizar con Claude</button>
        </div>
      </form>
      {status && <p>{status}</p>}
      {error && <p className="bad">{error}</p>}
      {result && (
        <div>
          <h3>Resultado</h3>
          <ul>
            {PERCENT_LABELS.map(([k, label]) => (
              <li key={k}>{label}: {(result[k] as number).toFixed(1)}%</li>
            ))}
          </ul>
          {result.description && <p><strong>Observado:</strong> {result.description}</p>}
          {result.suggestedCleanup && <p><strong>Limpieza sugerida:</strong> {result.suggestedCleanup}</p>}
        </div>
      )}
    </div>
  );
}
