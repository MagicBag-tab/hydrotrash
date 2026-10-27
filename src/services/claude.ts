import Anthropic from "@anthropic-ai/sdk"
import { env } from "../lib/env.js"
import type { TrashAnalysis } from "../types/trash.js"
import { z } from "zod"

export const visualAnalysisSchema = z.object({
  glassPercentage: z.number().min(0).max(100), plasticPercentage: z.number().min(0).max(100),
  paperPercentage: z.number().min(0).max(100), organicPercentage: z.number().min(0).max(100),
  metalPercentage: z.number().min(0).max(100), otherPercentage: z.number().min(0).max(100),
  eWastePercentage: z.number().min(0).max(100), hazardousPercentage: z.number().min(0).max(100),
  specialTreatmentPercentage: z.number().min(0).max(100),
  description: z.string().optional(), suggestedCleanup: z.string().optional(),
  isEvaluable: z.boolean().default(true), visibleAccumulation: z.boolean().nullable().default(null),
  visibleObstruction: z.boolean().nullable().default(null),
})

function hasRealAnthropicKey(): boolean {
  const k = env.ANTHROPIC_API_KEY
  return Boolean(k && k !== "test" && k !== "demo" && k.startsWith("sk-ant-"))
}

// Demo heurístico (sin API key): composición plausible de desfogue urbano.
// Permite probar Fase 1/3/4/5 sin gastar cuota. Se marca con source "demo".
export function demoAnalysis(seed = ""): TrashAnalysis {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 1000
  // Pesos relativos; se normalizan a 100 abajo
  const w = {
    glass: 3 + (h % 5),
    plastic: 38 + (h % 25), // dominante en escorrentía urbana
    paper: 8 + (h % 8),
    organic: 18 + (h % 12),
    metal: 4 + (h % 5),
    eWaste: 1 + (h % 5),
    hazardous: 4 + (h % 8),
    special: 2 + (h % 6),
  }
  const total = w.glass + w.plastic + w.paper + w.organic + w.metal + w.eWaste + w.hazardous + w.special
  const raw = [w.glass, w.plastic, w.paper, w.organic, w.metal, w.eWaste, w.hazardous, w.special].map((v) => (v / total) * 100)
  // Redondeo a 2 decimales y el residuo va a "other" para sumar exactamente 100
  const parts = raw.map((v) => Math.floor(v * 100) / 100)
  const usedParts = parts.reduce((a, v) => a + v, 0)
  const [glass, plastic, paper, organic, metal, eWaste, hazardous, special] = parts
  return {
    glassPercentage: glass,
    plasticPercentage: plastic,
    paperPercentage: paper,
    organicPercentage: organic,
    metalPercentage: metal,
    otherPercentage: Number((100 - usedParts).toFixed(2)),
    eWastePercentage: eWaste,
    hazardousPercentage: hazardous,
    specialTreatmentPercentage: special,
    description: "Análisis DEMO (sin API key): acumulación típica de desfogue urbano con predominio de plásticos arrastrados por escorrentía.",
    suggestedCleanup: "Instalar biobarda aguas abajo, jornada de limpieza y verificar descargas clandestinas en este punto.",
    isEvaluable: true,
    visibleAccumulation: true,
    visibleObstruction: null,
  }
}

function getClient(): Anthropic | null {
  if (!hasRealAnthropicKey()) return null
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
}

const MODEL = "claude-3-5-sonnet-20241022"

const SYSTEM_PROMPT = `You are a waste detection system. Analyze only visible trash in the image. Do not infer mass, flow, pollution, bacteria, flooding, or kg/day.
If the opening is not visible or image quality is insufficient, set isEvaluable false and visibleAccumulation/visibleObstruction null. Distinguish visible trash accumulation from obstruction of the opening.

Include standard recyclables (glass, plastic, paper, organic, metal), plus:
- e-waste: electronics, batteries, cables
- hazardous: chemicals, paint, medical, sharp objects
- special treatment: items that need dedicated collection (e.g. tires, mattresses, large appliances)

Respond with a single JSON object only, no markdown or extra text. Use this exact shape (percentages must sum to 100):
{
  "glassPercentage": number,
  "plasticPercentage": number,
  "paperPercentage": number,
  "organicPercentage": number,
  "metalPercentage": number,
  "otherPercentage": number,
  "eWastePercentage": number,
  "hazardousPercentage": number,
  "specialTreatmentPercentage": number,
  "description": "short description of what you see",
  "suggestedCleanup": "brief recommendation to clean this area",
  "isEvaluable": true,
  "visibleAccumulation": true,
  "visibleObstruction": false
}`

const PERCENTAGE_KEYS: (keyof TrashAnalysis)[] = [
  "glassPercentage",
  "plasticPercentage",
  "paperPercentage",
  "organicPercentage",
  "metalPercentage",
  "otherPercentage",
  "eWastePercentage",
  "hazardousPercentage",
  "specialTreatmentPercentage",
]

export async function analyzeImageForTrash(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<TrashAnalysis> {
  const client = getClient()
  // Sin API key real -> demo heurístico para hackatón (no llama a Anthropic)
  if (!client) {
    return demoAnalysis(imageBase64.slice(0, 64))
  }
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze the trash in this image and respond with the JSON object only.",
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
  })

  const text =
    response.content?.find((block): block is { type: "text"; text: string } => block.type === "text")?.text ?? ""
  const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim()
  const parsed = visualAnalysisSchema.parse(JSON.parse(cleaned))

  const raw: Record<string, number> = {}
  let sum = 0
  for (const key of PERCENTAGE_KEYS) {
    const v = parsed[key] ?? 0
    raw[key] = Math.max(0, Number(v))
    sum += raw[key]
  }
  if (sum > 0 && Math.abs(sum - 100) > 0.01) {
    const scale = 100 / sum
    for (const key of PERCENTAGE_KEYS) {
      raw[key] = raw[key] * scale
    }
  }

  return {
    ...raw,
    description: parsed.description,
    suggestedCleanup: parsed.suggestedCleanup,
    isEvaluable: parsed.isEvaluable,
    visibleAccumulation: parsed.visibleAccumulation,
    visibleObstruction: parsed.visibleObstruction,
  } as TrashAnalysis
}
