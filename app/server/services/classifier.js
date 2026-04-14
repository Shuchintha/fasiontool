import OpenAI from 'openai';
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

Respond ONLY with a valid JSON object containing: description, garment_type, style, material, color_palette (array of strings), pattern, season, occasion, consumer_profile, trend_notes, location_continent, location_country, location_city.`;

let client;

function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OPENAI_API_KEY is not configured. Set it in app/server/.env');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
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
  const openai = getClient();

  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  const mimeType = getMimeType(imagePath);
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const result = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: dataUrl, detail: 'high' },
          },
          { type: 'text', text: FASHION_PROMPT },
        ],
      },
    ],
    max_tokens: 1024,
  });

  const responseText = result.choices[0].message.content;
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
