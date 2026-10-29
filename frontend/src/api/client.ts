// HydroTrash · cliente tipado espejo de src/types/trash.ts del backend
const BASE: string = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_API_URL || '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface TrashAnalysis {
  glassPercentage: number;
  plasticPercentage: number;
  paperPercentage: number;
  organicPercentage: number;
  metalPercentage: number;
  otherPercentage: number;
  eWastePercentage: number;
  hazardousPercentage: number;
  specialTreatmentPercentage: number;
  description?: string;
  suggestedCleanup?: string;
}

export interface TrashRecordResponse extends TrashAnalysis {
  id: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  imageUrl?: string | null;
  source?: string | null;
  siteType?: string | null;
  outfallCode?: string | null;
  flowObserved?: string | null;
  notes?: string | null;
  observation?: { id: string; provenance: string; review?: { status: string; correctionsJson?: string | null; reviewedAt: string } | null; point?: { code: string; name: string; weapElementCode?: string | null } | null } | null;
}

export interface HeatmapBucket {
  geohash: string;
  latitude: number;
  longitude: number;
  count: number;
  totalGlass: number;
  totalPlastic: number;
  totalPaper: number;
  totalOrganic: number;
  totalMetal: number;
  totalOther: number;
  totalEWaste: number;
  totalHazardous: number;
  totalSpecialTreatment: number;
}

export interface ReportInput {
  siteType: string;
  outfallCode: string;
  flowObserved: string;
  notes: string;
}

export const CONTRERAS_CENTER = { lat: 14.6, lng: -90.48 };

export interface Outfall {
  code: string;
  id: string;
  latitude: number;
  longitude: number;
  siteType: string | null;
  flowObserved: string | null;
  plasticPercentage: number;
  hazardousPercentage: number;
  createdAt: string;
}

export interface TraceCandidate {
  fromId: string;
  fromCode: string | null;
  distanceKm: number;
  similarity: number;
  score: number;
  reason: string;
}

export interface WeapScenario {
  id: string;
  name: string;
  ptarRemovalPct?: number;
  biobardas?: boolean;
  biobardaEfficiencyPct?: number;
  reforestacionPct?: number;
  lluviaFactor?: number;
}

export interface WeapResult {
  scenario: string;
  supuestos: string[];
  nodos: Array<{ outfallCode: string | null; id: string; cargaPlastico: number; cargaOrganica: number; caudalRelativo: number }>;
  totales: { plastico: number; organico: number; caudal: number };
  reduccionVsBase?: { plasticoPct: number; organicoPct: number };
}

export interface WeapRun {
  id: string;
  scenario: string;
  modelVersion?: string | null;
  originalFileName?: string | null;
  importedAt: string;
  results: Array<{ id: string; elementCode: string; periodStart: string; periodEnd: string; variable: string; value: number; unit: string }>;
}

export const api = {
  health: () => req<{ status: string }>('/health'),
  listTrash: () => req<TrashRecordResponse[]>('/api/trash'),
  getTrash: (id: string) => req<TrashRecordResponse>(`/api/trash/${id}`),
  reviewTrash: (id: string, status: 'approved' | 'corrected' | 'rejected', corrections?: unknown) => req(`/api/trash/${id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, corrections }) }),
  deleteTrash: (id: string) => req<void>(`/api/trash/${id}`, { method: 'DELETE' }),
  outfalls: () => req<Outfall[]>('/api/outfalls'),
  trace: (toId: string, radius = 1.5) =>
    req<{ to: { id: string; code: string | null; latitude: number; longitude: number }; candidates: TraceCandidate[]; metodo: string }>(
      `/api/contamination/trace?toId=${toId}&radius=${radius}`
    ),
  weapScenarios: () => req<WeapScenario[]>('/api/weap/scenarios'),
  weapRuns: () => req<WeapRun[]>('/api/weap/runs'),
  observationPointsExport: () => fetch(`${BASE}/api/observation-points/export`).then((r) => r.blob()),
  weapResults: (scenarioId: string, params: Record<string, number> = {}) => {
    const q = new URLSearchParams({ scenarioId, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
    return req<WeapResult>(`/api/weap/results?${q.toString()}`);
  },
  seedContreras: () => req<{ seeded: number; message?: string; points?: Array<{ id: string; code: string }> }>('/api/demo/seed-contreras', { method: 'POST' }),
  analyze: (file: File, latitude: number, longitude: number, meta: ReportInput) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('latitude', String(latitude));
    fd.append('longitude', String(longitude));
    if (meta.siteType) fd.append('siteType', meta.siteType);
    if (meta.outfallCode) fd.append('outfallCode', meta.outfallCode);
    if (meta.flowObserved) fd.append('flowObserved', meta.flowObserved);
    if (meta.notes) fd.append('notes', meta.notes);
    return req<{ trash: TrashAnalysis; id: string }>('/api/analyze-image', { method: 'POST', body: fd });
  },
  heatmap: (precision = 5) => req<{ precision: number; buckets: HeatmapBucket[] }>(`/api/heatmap?precision=${precision}`),
};

