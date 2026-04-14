# Fashion Garment Classification & Inspiration Web App

A lightweight AI-powered web application that helps fashion designers organize, search, and reuse inspiration imagery captured in the field. Upload garment photos, get automatic AI classification via OpenAI GPT-4o, and browse/filter your collection with rich metadata.

## Features

- **AI-Powered Classification** — Upload an image and receive structured metadata: garment type, style, material, color palette, pattern, season, occasion, consumer profile, trend notes, and estimated geographic origin
- **Full-Text Search** — Search across descriptions, annotations, and tags using SQLite FTS5
- **Dynamic Filters** — Filter by 13 attribute categories plus time and designer filters, all populated from your actual data
- **Designer Annotations** — Add custom notes, tags, and designer attribution to any image
- **Evaluation Pipeline** — Built-in tooling to benchmark AI classification accuracy against ground truth labels

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Tailwind CSS 3.4, React Router 7 |
| Backend | Express 4.21, Node.js (ES modules) |
| Database | SQLite via better-sqlite3, FTS5 for full-text search |
| AI Model | OpenAI GPT-4o (`gpt-4o`) |
| Testing | Vitest 3.1, Supertest |

## Quick Start

### Prerequisites

- Node.js 18+
- An OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Setup

```bash
# Clone and install
git clone <repo-url>
cd fashiontooltesting
npm install

# Configure environment
cp app/server/.env.example app/server/.env
# Edit .env and add your OPENAI_API_KEY

# Start development servers (frontend + backend)
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Environment Variables

Create `app/server/.env`:

```
OPENAI_API_KEY=your_api_key_here
PORT=3001
```

## Project Structure

```
├── app/
│   ├── client/                # React frontend
│   │   ├── src/
│   │   │   ├── api.js         # API client
│   │   │   ├── App.jsx        # Router and layout
│   │   │   ├── components/    # Reusable UI components
│   │   │   │   ├── FilterSidebar.jsx
│   │   │   │   └── ImageCard.jsx
│   │   │   └── pages/         # Route pages
│   │   │       ├── BrowsePage.jsx
│   │   │       ├── ImageDetailPage.jsx
│   │   │       └── UploadPage.jsx
│   │   └── vite.config.js
│   └── server/                # Express backend
│       ├── db.js              # SQLite schema, FTS5, helpers
│       ├── index.js           # Express app entry point
│       ├── routes/
│       │   ├── annotations.js # Annotation CRUD
│       │   ├── filters.js     # Dynamic filter generation
│       │   └── images.js      # Upload, list, search, detail
│       └── services/
│           └── classifier.js  # OpenAI GPT-4o classifier
├── eval/                      # Evaluation pipeline
│   ├── download_images.js     # Pexels image downloader
│   ├── evaluate.js            # Classification accuracy evaluator
│   └── ground_truth.json      # 60 labeled test images
├── tests/
│   ├── unit/                  # Unit tests (classifier parsing)
│   ├── integration/           # Integration tests (filters, FTS)
│   └── e2e/                   # E2E tests (full API workflow)
└── vitest.config.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/images/upload` | Upload and classify an image |
| `GET` | `/api/images` | Paginated image listing |
| `GET` | `/api/images/search` | Search with filters + FTS |
| `GET` | `/api/images/:id` | Single image with full metadata |
| `GET` | `/api/filters` | Dynamic filter options |
| `POST` | `/api/images/:id/annotations` | Add annotation |
| `PUT` | `/api/annotations/:id` | Update annotation |
| `DELETE` | `/api/annotations/:id` | Delete annotation |

## Testing

```bash
# Run all tests (48 tests across 3 suites)
npm test

# Run specific test suites
npx vitest run tests/unit/
npx vitest run tests/integration/
npx vitest run tests/e2e/
```

**Test coverage:**
- **Unit tests (11)** — Classifier output parsing: valid/missing/null/empty fields, color palette normalization (array, JSON string, comma-separated), raw response preservation
- **Integration tests (23)** — Database-level filter/search: dynamic filter generation for all 13 categories + time + designer, location filters (continent/country/city), time filters (year/month/combined), combined attribute filters, multi-select IN clauses, FTS5 full-text search across descriptions/notes/tags
- **E2E tests (14)** — Full API workflow via Supertest: health check, upload with AI classification, browse listing, image detail, dynamic filters, attribute filtering, FTS search, annotation CRUD, error handling

## Evaluation Pipeline

The eval pipeline benchmarks GPT-4o classification accuracy against 60 human-labeled ground truth images across 10 fashion categories.

### Running the Evaluation

```bash
# 1. Download test images from Pexels (requires PEXELS_API_KEY in .env)
node eval/download_images.js

# 2. Run evaluation against ground truth
node eval/evaluate.js
```

### Ground Truth Categories

The 60 evaluation images span:
- Fashion dresses, streetwear outfits, formal suits
- Bohemian clothing, athletic wear, vintage fashion
- Knitwear sweaters, leather jackets, traditional ethnic wear
- Sustainable eco fashion

### Evaluation Metrics

The evaluator compares 5 attributes per image against ground truth:
- **garment_type** — Primary garment category
- **style** — Fashion style classification
- **material** — Fabric/material identification
- **occasion** — Appropriate occasion
- **location_context** — Geographic/cultural context

Matching uses fuzzy comparison: exact match, substring containment, and mismatch. Per-attribute accuracy is reported in a summary table, with detailed per-image results saved to `eval/eval_results.json`.

## Architecture Decisions

### Why SQLite?

For a POC/single-designer tool, SQLite offers:
- Zero configuration — no separate database server needed
- Single-file database — easy to back up or reset
- FTS5 integration — full-text search without additional infrastructure
- WAL mode — good read concurrency for a single-user app

**Trade-off**: Not suitable for multi-user concurrent writes. For production scale, migrate to PostgreSQL.

### Why FTS5 with Contentless Tables?

FTS5 contentless tables (`content=''`) avoid data duplication between the main tables and the search index. We use explicit `rowid` management to join FTS results back to the images table, since contentless FTS5 tables don't return stored column values.

### Why GPT-4o?

- Strong vision capabilities — excellent at analyzing fashion imagery with fine-grained detail
- JSON mode via `response_format` — enforces consistent structured output
- Fast inference — suitable for interactive upload experience

**Trade-off**: Classification accuracy depends on image quality and prompt engineering. Requires an OpenAI API key with vision access.

### Why No Authentication?

This is a single-designer tool / POC. The "designer" field on annotations serves as a lightweight identifier without the complexity of a full auth system.

## Limitations

1. **No image deletion** — Once uploaded, images can only be managed by clearing the database
2. **Single-user** — No authentication or multi-user access control
3. **Classification accuracy** — Depends on GPT-4o model capabilities; material and pattern identification can be inconsistent for similar-looking fabrics
4. **No image preprocessing** — Raw images are sent to GPT-4o without resizing or normalization
5. **SQLite concurrency** — WAL mode helps but doesn't support true concurrent writes
6. **Local storage only** — Images stored on disk, no cloud storage integration

## Development

```bash
# Frontend only
cd app/client && npm run dev

# Backend only
cd app/server && npm run dev

# Both (from root)
npm run dev
```

The frontend proxies `/api` and `/uploads` requests to the backend (port 3001) via Vite's proxy configuration.
