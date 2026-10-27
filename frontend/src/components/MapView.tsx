import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, CONTRERAS_CENTER, type TrashRecordResponse, type HeatmapBucket } from '../api/client';

// Fix iconos Leaflet en Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapView({ refreshKey, onTrace }: { refreshKey: number; onTrace: (id: string) => void }) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [precision, setPrecision] = useState(5);
  const [mode, setMode] = useState<'puntos' | 'calor'>('puntos');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current).setView([CONTRERAS_CENTER.lat, CONTRERAS_CENTER.lng], 14);
    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    const hybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { attribution: '© Google' });
    hybrid.addTo(map);
    L.control.layers({ 'Google híbrido': hybrid, OpenStreetMap: osm }, undefined, { collapsed: false }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
  }, []);

  useEffect(() => {
    async function draw() {
      const layer = layerRef.current;
      const map = mapRef.current;
      if (!layer || !map) return;
      layer.clearLayers();
      try {
        if (mode === 'puntos') {
          const items: TrashRecordResponse[] = await api.listTrash();
          setInfo(`${items.length} reportes`);
          for (const r of items) {
            const color = r.hazardousPercentage > 10 ? 'red' : r.plasticPercentage > 40 ? 'orange' : 'green';
            const m = L.circleMarker([r.latitude, r.longitude], { radius: 9, color, fillOpacity: 0.7 });
            m.bindPopup(`<strong>${r.outfallCode || r.siteType || 'Punto'}</strong><br/>plástico ${r.plasticPercentage.toFixed(0)}% · peligroso ${r.hazardousPercentage.toFixed(0)}%<br/><small>${r.createdAt.slice(0, 10)}</small>`);
            m.on('click', () => onTrace(r.id));
            layer.addLayer(m);
          }
        } else {
          const h = await api.heatmap(precision);
          setInfo(`${h.buckets.length} zonas — selecciona un punto para consultar su origen probable`);
          const max = Math.max(1, ...h.buckets.map((b: HeatmapBucket) => b.count));
          for (const b of h.buckets) {
            const r = 12 + (b.count / max) * 22;
            const c = L.circle([b.latitude, b.longitude], { radius: r * 8, color: '#b42318', weight: 1, fillOpacity: 0.35 });
            c.bindPopup(`<strong>${b.count} reportes</strong><br/>plástico acum. ${b.totalPlastic.toFixed(0)}%`);
            layer.addLayer(c);
          }
        }
      } catch (e) {
        setInfo(e instanceof Error ? e.message : String(e));
      }
    }
    draw();
  }, [refreshKey, precision, mode, onTrace]);

  return (
    <div className="card">
      <h2>Mapa Río Contreras</h2>
      <div className="row">
        <button type="button" className={mode === 'puntos' ? '' : 'ghost'} onClick={() => setMode('puntos')}>Puntos</button>
        <button type="button" className={mode === 'calor' ? '' : 'ghost'} onClick={() => setMode('calor')}>Calor</button>
        {mode === 'calor' && (
          <label>Nivel de detalle
            <select value={precision} onChange={(e) => setPrecision(Number(e.target.value))}>
              <option value={4}>4 — zonas grandes</option>
              <option value={5}>5 — default</option>
              <option value={6}>6 — fino</option>
              <option value={7}>7 — muy fino</option>
            </select>
          </label>
        )}
        <small>{info}</small>
      </div>
      <div ref={divRef} style={{ height: 380, borderRadius: 10, marginTop: 8 }} />
    </div>
  );
}
