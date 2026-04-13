import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const FASHION_PROMPT = `You are an expert fashion analyst. Analyze this garment/fashion image and provide both a rich natural-language description and structured attributes.

For the description: Write 2-3 sentences describing the garment(s), styling, context, and any notable design details. Be specific about construction, fabric texture, and aesthetic.

For structured attributes, extract the following:
- garment_type: The primary garment category (e.g., "dress", "jacket", "trousers", "blouse", "skirt", "coat", "sweater", "shirt", "suit", "jumpsuit", "shorts", "vest")
- style: The design style (e.g., "casual", "formal", "streetwear", "bohemian", "minimalist", "avant-garde", "vintage", "preppy", "athleisure", "romantic", "grunge", "classic")
- material: The apparent fabric/material (e.g., "cotton", "silk", "denim", "leather", "wool", "linen", "polyester", "chiffon", "velvet", "tweed", "knit", "satin")
- color_palette: Array of dominant colors visible (e.g., ["navy blue", "white", "gold"])
- pattern: The pattern type (e.g., "solid", "striped", "floral", "plaid", "polka dot", "geometric", "abstract", "animal print", "paisley", "checkered", "embroidered", "tie-dye")
- season: The likely season (e.g., "spring", "summer", "fall", "winter", "resort", "transitional")
- occasion: Suitable occasion (e.g., "casual everyday", "office", "evening", "wedding", "beach", "festival", "activewear", "cocktail", "brunch")
- consumer_profile: Target consumer (e.g., "young professional", "teenager", "luxury consumer", "budget conscious", "eco-conscious", "fashion forward", "classic dresser")
- trend_notes: Any relevant trend observations (e.g., "oversized silhouette trending in 2024", "Y2K revival", "quiet luxury aesthetic")
- location_continent: If location context is visible (e.g., "Europe", "Asia", "North America", "South America", "Africa"). Use "Unknown" if not determinable.
- location_country: Specific country if determinable from context clues. Use "Unknown" if not determinable.
- location_city: Specific city if determinable from context clues. Use "Unknown" if not determinable.

Be accurate and specific. If an attribute cannot be determined from the image, use your best professional judgment based on visual cues.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string', description: 'Rich natural-language description of the garment/fashion image' },
    garment_type: { type: 'string' },
    style: { type: 'string' },
    material: { type: 'string' },
    color_palette: { type: 'array', items: { type: 'string' } },
    pattern: { type: 'string' },
    season: { type: 'string' },
    occasion: { type: 'string' },
    consumer_profile: { type: 'string' },
    trend_notes: { type: 'string' },
    location_continent: { type: 'string' },
    location_country: { type: 'string' },
    location_city: { type: 'string' },
  },
  required: [
    'description', 'garment_type', 'style', 'material', 'color_palette',
    'pattern', 'season', 'occasion', 'consumer_profile', 'trend_notes',
    'location_continent', 'location_country', 'location_city',
  ],
};

let genAI;
let model;

function getModel() {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('GEMINI_API_KEY is not configured. Set it in app/server/.env');
    }
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });
  }
  return model;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

export async function classifyImage(imagePath) {
  const m = getModel();

  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  const mimeType = getMimeType(imagePath);

  const result = await m.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
    FASHION_PROMPT,
  ]);

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  return parseClassifierOutput(parsed, responseText);
}

export function parseClassifierOutput(parsed, rawResponse) {
  return {
    description: parsed.description || '',
    garment_type: normalizeString(parsed.garment_type),
    style: normalizeString(parsed.style),
    material: normalizeString(parsed.material),
    color_palette: normalizeColorPalette(parsed.color_palette),
    pattern: normalizeString(parsed.pattern),
    season: normalizeString(parsed.season),
    occasion: normalizeString(parsed.occasion),
    consumer_profile: normalizeString(parsed.consumer_profile),
    trend_notes: parsed.trend_notes || '',
    location_continent: normalizeString(parsed.location_continent),
    location_country: normalizeString(parsed.location_country),
    location_city: normalizeString(parsed.location_city),
    raw_response: rawResponse || JSON.stringify(parsed),
  };
}

function normalizeString(val) {
  if (!val || typeof val !== 'string') return 'Unknown';
  const trimmed = val.trim();
  return trimmed || 'Unknown';
}

function normalizeColorPalette(val) {
  if (Array.isArray(val)) {
    return JSON.stringify(val.map(c => String(c).trim()).filter(Boolean));
  }
  if (typeof val === 'string') {
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr)) return JSON.stringify(arr);
    } catch {
      // If comma-separated string
      return JSON.stringify(val.split(',').map(c => c.trim()).filter(Boolean));
    }
  }
  return JSON.stringify([]);
}
