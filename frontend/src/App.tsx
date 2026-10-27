import { useCallback, useState } from 'react';
import ReportForm from './components/ReportForm';
import Dashboard from './components/Dashboard';
import Detail from './components/Detail';
import MapView from './components/MapView';
import TracePanel from './components/TracePanel';
import WeapPanel from './components/WeapPanel';
import Closing from './components/Closing';

type Tab = 'reportar' | 'mapa' | 'weap';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('reportar');


  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  const goTrace = useCallback((id: string) => { setTraceId(id); }, []);

  return (
    <div className="wrap">
      <h1>HydroTrash <span>· Río Contreras</span></h1>
      <p><small>Monitoreo de desfogues y tramos del río Contreras</small></p>
      <div className="row">
        <button type="button" className={tab === 'reportar' ? '' : 'ghost'} onClick={() => setTab('reportar')}>Reportar + Dashboard</button>
        <button type="button" className={tab === 'mapa' ? '' : 'ghost'} onClick={() => setTab('mapa')}>Mapa + Origen</button>
        <button type="button" className={tab === 'weap' ? '' : 'ghost'} onClick={() => setTab('weap')}>Escenarios WEAP + Cierre</button>
      </div>
      {selected ? (
        <Detail id={selected} onBack={() => { setSelected(null); bump(); }} />
      ) : tab === 'reportar' ? (
        <>
          <ReportForm onCreated={bump} />
          <Dashboard refreshKey={refreshKey} onSelect={setSelected} />
        </>
      ) : tab === 'mapa' ? (
        <>
          <MapView refreshKey={refreshKey} onTrace={goTrace} />
          <TracePanel targetId={traceId} onClose={() => setTraceId(null)} />
        </>
      ) : (
        <>
          <WeapPanel refreshKey={refreshKey} />
          <Closing refreshKey={refreshKey} />
        </>
      )}
    </div>
  );
}

