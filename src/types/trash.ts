/**
 * Response shape from the image analysis endpoint.
 * Used by frontend and stored in DB (TrashRecord).
 */
export interface TrashAnalysis {
  glassPercentage: number
  plasticPercentage: number
  paperPercentage: number
  organicPercentage: number
  metalPercentage: number
  otherPercentage: number
  eWastePercentage: number
  hazardousPercentage: number
  specialTreatmentPercentage: number
  description?: string
  suggestedCleanup?: string
}

export interface TrashRecordResponse extends TrashAnalysis {
  id: string
  createdAt: string
  latitude: number
  longitude: number
  imageUrl?: string | null
  source?: string | null
}

export interface HeatmapBucket {
  geohash: string
  latitude: number
  longitude: number
  count: number
  totalGlass: number
  totalPlastic: number
  totalPaper: number
  totalOrganic: number
  totalMetal: number
  totalOther: number
  totalEWaste: number
  totalHazardous: number
  totalSpecialTreatment: number
}
