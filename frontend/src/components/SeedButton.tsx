import { useState } from 'react';
import { api } from '../api/client';

export default function SeedButton({ onSeeded }: { onSeeded: () => void }) {
  const [msg, setMsg] = useState('');
  async function seed() {
    setMsg('Sembrando…');
    try {
      const r = await api.seedContreras();
      setMsg(r.seeded > 0 ? `Sembrados ${r.seeded} desfogues demo.` : r.message || 'Nada que sembrar.');
      if (r.seeded > 0) onSeeded();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div className="card">
      <h2>Demo sin API key <small>· para probar mapa/trace/WEAP</small></h2>
      <p><small>Siembra 6 desfogues del Contreras (D-01…D-07) con análisis demo. Cuando tengas licencia, los reportes reales con Claude se marcan <code>source=claude</code>.</small></p>
      <button type="button" onClick={seed}>Sembrar desfogues demo</button> <small>{msg}</small>
    </div>
  );
}
