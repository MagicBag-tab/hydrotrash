import { useEffect, useState } from 'react';
import { api } from './api/client';
import ReportForm from './components/ReportForm';
import Dashboard from './components/Dashboard';
import Detail from './components/Detail';

export default function App() {
  const [health, setHealth] = useState<string>('probando…');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    api.health().then((h) => setHealth(h.status)).catch(() => setHealth('sin conexión'));
  }, []);

  return (
    <div className="wrap">
      <h1>HydroTrash <span>· Río Contreras</span></h1>
      <p><small>Fase 1 — foto de desfogue/alcantarilla + GPS → Claude → reporte. Backend: <span className={health === 'ok' ? 'ok' : 'bad'}>{health}</span></small></p>
      {selected ? (
        <Detail id={selected} onBack={() => { setSelected(null); setRefreshKey((k) => k + 1); }} />
      ) : (
        <>
          <ReportForm onCreated={() => setRefreshKey((k) => k + 1)} />
          <Dashboard refreshKey={refreshKey} onSelect={setSelected} />
        </>
      )}
    </div>
  );
}
