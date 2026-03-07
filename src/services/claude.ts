import Anthropic from "@anthropic-ai/sdk"
import { env } from "../lib/env.js"
import type { TrashAnalysis } from "../types/trash.js"

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const MODEL = "claude-3-5-sonnet-20241022"

const SYSTEM_PROMPT = `You are a waste detection system. Analyze the image and estimate the composition of visible trash.

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
  "suggestedCleanup": "brief recommendation to clean this area"
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
  const parsed = JSON.parse(cleaned) as TrashAnalysis

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
  } as TrashAnalysis
}
