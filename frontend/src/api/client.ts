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

export const api = {
  health: () => req<{ status: string }>('/health'),
  listTrash: () => req<TrashRecordResponse[]>('/api/trash'),
  getTrash: (id: string) => req<TrashRecordResponse>(`/api/trash/${id}`),
  deleteTrash: (id: string) => req<void>(`/api/trash/${id}`, { method: 'DELETE' }),
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

