import { prisma } from "../lib/prisma.js"
import type { TrashAnalysis } from "../types/trash.js"

export async function createTrashRecord(
  analysis: TrashAnalysis,
  latitude: number,
  longitude: number,
  source: string = "claude",
  imageUrl?: string | null
) {
  return prisma.trashRecord.create({
    data: {
      latitude,
      longitude,
      glassPercentage: analysis.glassPercentage,
      plasticPercentage: analysis.plasticPercentage,
      paperPercentage: analysis.paperPercentage,
      organicPercentage: analysis.organicPercentage,
      metalPercentage: analysis.metalPercentage,
      otherPercentage: analysis.otherPercentage,
      eWastePercentage: analysis.eWastePercentage,
      hazardousPercentage: analysis.hazardousPercentage,
      specialTreatmentPercentage: analysis.specialTreatmentPercentage,
      description: analysis.description ?? null,
      suggestedCleanup: analysis.suggestedCleanup ?? null,
      imageUrl: imageUrl ?? null,
      source,
    },
  })
}

export async function updateTrashRecordImageUrl(id: string, imageUrl: string) {
  return prisma.trashRecord.update({
    where: { id },
    data: { imageUrl },
  })
}

export async function listTrashRecords() {
  return prisma.trashRecord.findMany({
    orderBy: { createdAt: "desc" },
  })
}

export async function getTrashRecordById(id: string) {
  return prisma.trashRecord.findUnique({
    where: { id },
  })
}

export async function deleteTrashRecord(id: string) {
  return prisma.trashRecord.delete({
    where: { id },
  })
}
