import { useEffect, useState } from 'react';
import { api, type TrashRecordResponse, type WeapResult } from '../api/client';

export default function Closing({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<TrashRecordResponse[]>([]);
  const [weap, setWeap] = useState<WeapResult | null>(null);

  useEffect(() => {
    api.listTrash().then(setItems).catch(() => setItems([]));
    api.weapResults('integral').then(setWeap).catch(() => setWeap(null));
  }, [refreshKey]);

  if (items.length === 0) return null;
  const avgPlastic = items.reduce((a, r) => a + r.plasticPercentage, 0) / items.length;
  const peligrosos = items.filter((r) => r.hazardousPercentage > 10).length;
  const top = [...items].sort((a, b) => b.plasticPercentage - a.plasticPercentage)[0];

  function exportCsv() {
    const head = 'id,createdAt,outfallCode,siteType,latitude,longitude,plastic,organic,hazardous,flowObserved,notes';
    const rows = items.map((r) =>
      [r.id, r.createdAt, r.outfallCode || '', r.siteType || '', r.latitude, r.longitude, r.plasticPercentage.toFixed(1), r.organicPercentage.toFixed(1), r.hazardousPercentage.toFixed(1), r.flowObserved || '', `"${(r.notes || '').replace(/"/g, '""')}"`].join(',')
    );
    const blob = new Blob([[head, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hydrotrash-contreras.csv';
    a.click();
  }

  return (
    <div className="card">
      <h2>Cierre municipal <small>· soporte de decisiones</small></h2>
      <div className="row">
        <div><strong>{items.length}</strong> desfogues monitoreados</div>
        <div>plástico prom. <strong>{avgPlastic.toFixed(0)}%</strong></div>
        <div><strong>{peligrosos}</strong> puntos peligrosos</div>
        <div>prioridad: <strong>{top.outfallCode || top.id.slice(0, 6)}</strong></div>
        {weap?.reduccionVsBase && <div className="ok">escenario integral −{weap.reduccionVsBase.plasticoPct}% plástico</div>}
      </div>
      <p><small>Recomendación: biobardas en {top.outfallCode || 'punto prioritario'} + PTAR 60% + reforestación 20%. Metodología replicable a subcuencas del río Las Vacas. Exporta el CSV para alimentar WEAP desktop.</small></p>
      <button type="button" className="ghost" onClick={exportCsv}>Exportar CSV para WEAP</button>
    </div>
  );
}
