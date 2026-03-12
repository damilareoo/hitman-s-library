# Hitman's Library

A professional design system gallery where you can browse, analyze, and manage curated design websites. Extracts colors, typography, OG images, and metadata from websites for design inspiration and reference.

**Live:**[ https://hitman-s-library.vercel.app  ](https://mars-hitman-library.vercel.app/)

---

## Overview

Hitman's Library has two interfaces:

- **Public Gallery** (`/`) - Browse and filter design websites by industry, colors, and typography. View design metadata with copyable color codes and typography details.
- Admin gallery- private
---

## Quick Start

### Prerequisites
- Node.js 18+
- Neon PostgreSQL database
- Environment variables configured

### Installation

```bash
# Clone the repository
git clone https://github.com/damilareoo/hitman-s-library.git
cd hitman-s-library

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Add DATABASE_URL from Neon

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the gallery.

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | Neon (PostgreSQL Serverless) |
| Frontend | React 19 + Tailwind CSS 4 |
| UI Components | shadcn/ui + Radix UI |
| Browser Control | Puppeteer (headless extraction) |
| API Client | Native fetch + Neon SDK |

### Project Structure

```
hitman-s-library/
├── app/
│   ├── page.tsx                    # Public gallery interface
│   ├── admin/
│   │   └── page.tsx               # Admin CMS panel
│   ├── layout.tsx                 # Root layout with theme
│   ├── globals.css                # Design tokens & Tailwind setup
│   └── api/
│       ├── design/
│       │   ├── extract/           # Website extraction & analysis
│       │   ├── list/              # Fetch all sites
│       │   ├── filter-advanced/   # Advanced filtering & search
│       │   ├── delete/            # Remove sites
│       │   ├── import-excel/      # Bulk import CSV/Excel
│       │   ├── categories/        # List industries
│       │   └── ...
│       └── og-image/              # Fetch OG image metadata
├── lib/
│   ├── browser-extraction.ts      # Puppeteer-based webpage analysis
│   ├── typography-extraction.ts   # Font detection & parsing
│   ├── design-library.ts          # Database operations
│   ├── types.ts                   # TypeScript interfaces
│   └── ...
├── components/
│   ├── site-thumbnail.tsx         # Image display component
│   ├── typography-display.tsx     # Typography rendering
│   └── ui/                        # shadcn/ui components
└── public/                        # Static assets

```

### Database Schema

#### `design_sources`
Stores website metadata and extraction results.

```sql
CREATE TABLE design_sources (
  id SERIAL PRIMARY KEY,
  source_url TEXT UNIQUE NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT ('website', 'file', 'image'),
  industry TEXT,
  thumbnail_url TEXT,                -- OG image from <meta og:image>
  metadata JSONB,                    -- { description, quality, layout, architecture }
  tags TEXT ARRAY,
  created_at TIMESTAMP DEFAULT NOW(),
  analyzed_at TIMESTAMP
);
```

#### `design_colors`
Extracted color palettes from websites.

```sql
CREATE TABLE design_colors (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES design_sources(id),
  primary_color VARCHAR(7),          -- HEX format
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  all_colors TEXT ARRAY,             -- All unique colors extracted
  color_harmony TEXT,                -- harmony type detected
  mood TEXT,                         -- color mood (e.g., 'warm', 'cool', 'vibrant')
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `design_typography`
Extracted typography and font information.

```sql
CREATE TABLE design_typography (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES design_sources(id),
  heading_font TEXT,                 -- Primary heading font
  body_font TEXT,                    -- Body text font
  mono_font TEXT,                    -- Monospace/code font
  mood TEXT,                         -- typography mood
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Features

### Public Gallery (`/`)

#### Browse & Filter
- **Industry filter** - Filter by design category (SaaS, E-commerce, Portfolio, etc.)
- **Search** - Search by website name, URL, or tags
- **Mobile-friendly** - Sticky category filters on mobile for easy navigation

#### Site Details
- **OG Image** - Visual thumbnail of website
- **Color Palette** - Copy hex codes with one click (toast feedback)
- **Typography** - See heading, body, and monospace fonts used
- **Metadata** - View quality score, layout type, and architecture style

#### Responsive Design
- Desktop: Sidebar filters + main grid (3-column)
- Tablet: Responsive grid with adjusted spacing
- Mobile: Full-width with sticky top filters, bottom sheet details

### Admin CMS (`/admin`)

#### Site Management
- **View all sites** - Paginated list showing all websites (10 per page)
- **Visual thumbnails** - OG images for quick identification
- **Delete instantly** - One-click deletion with no page refresh
- **Industry badges** - Quick identification of site category
- **Timestamps** - See when each site was added

#### Add Websites
- **Single entry** - Input URL and auto-extract title, colors, typography
- **Bulk import** - Upload CSV/Excel file with URLs and categories
- **Auto-categorization** - Industry detected automatically based on website content
- **OG image capture** - Thumbnail extracted from `<meta og:image>` tag
- **Success feedback** - Toast notifications for all operations

#### Search & Filter
- **Real-time search** - Filter sites by name, URL, or industry
- **Instant display** - No page refresh, seamless filtering

---

## API Reference

### Core Endpoints

#### `POST /api/design/extract`
Extract website data and add to library.

```bash
curl -X POST http://localhost:3000/api/design/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "notes": "Optional description"
  }'
```

**Response:**
```json
{
  "id": 1,
  "success": true,
  "title": "Example Website",
  "industry": "SaaS",
  "colors": ["#FF5733", "#33FF57"],
  "typography": ["Inter", "JetBrains Mono"]
}
```

#### `GET /api/design/list`
Fetch all sites or filter by search/industry.

```bash
# Get all sites
curl http://localhost:3000/api/design/list

# Search by name
curl http://localhost:3000/api/design/list?search=stripe

# Filter by industry
curl http://localhost:3000/api/design/list?industry=SaaS
```

#### `DELETE /api/design/delete`
Remove a site from the library.

```bash
curl -X DELETE http://localhost:3000/api/design/delete \
  -H "Content-Type: application/json" \
  -d '{ "id": 1 }'
```

#### `GET /api/design/filter-advanced`
Advanced filtering with pagination.

```bash
curl http://localhost:3000/api/design/filter-advanced \
  ?industry=SaaS&color=%23FF5733&page=1&limit=20
```

#### `POST /api/design/import-excel`
Bulk import sites from CSV/Excel file.

```bash
# CSV/Excel file with columns: url, industry, tags
curl -X POST http://localhost:3000/api/design/import-excel \
  -F "file=@sites.csv"
```

#### `GET /api/og-image`
Fetch OG image metadata from a URL.

```bash
curl http://localhost:3000/api/og-image?url=https://example.com
```

---

## Development

### Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://user:password@host/database
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Running Tests

```bash
pnpm type-check    # TypeScript validation
pnpm lint          # ESLint
pnpm build         # Production build
```

### Key Libraries & Usage

#### Browser Extraction (`lib/browser-extraction.ts`)
Uses Puppeteer to extract website content.

```typescript
import { extractWebsiteData } from '@/lib/browser-extraction'

const data = await extractWebsiteData('https://example.com')
// Returns: { title, description, colors, fonts, layout, architecture }
```

#### Typography Detection (`lib/typography-extraction.ts`)
Analyzes font usage from CSS.

```typescript
import { extractTypography } from '@/lib/typography-extraction'

const fonts = await extractTypography(htmlContent)
// Returns: { headingFonts: [], bodyFonts: [], monoFonts: [] }
```

#### Database Operations (`lib/design-library.ts`)
Handles all data persistence.

```typescript
import { saveDesignSource, getDesignSources } from '@/lib/design-library'

// Save new site
await saveDesignSource({ url, source_name, industry, ... })

// Fetch sites
const sites = await getDesignSources({ industry, search })
```

---

## Performance Optimizations

- **Image caching** - OG images cached via `/api/og-image` with fallback to thum.io
- **Database queries** - Indexed on `industry`, `source_name`, and `created_at`
- **Lazy loading** - Grid items load on demand with intersection observer
- **CSS optimization** - Tailwind v4 with tree-shaking (7.2KB gzipped core)
- **API pagination** - List API supports limit/offset for large datasets

---

## Future Enhancements

### Planned Features
- [ ] **Color palette editor** - Modify and save custom palettes
- [ ] **Design pattern library** - Tag and organize layout patterns
- [ ] **Collaborative notes** - Add design insights and annotations
- [ ] **Export templates** - Generate Figma/CSS exports from sites
- [ ] **AI-powered insights** - Summarize design trends from library
- [ ] **Version history** - Track changes to sites over time
- [ ] **Integration APIs** - Webhook support for external tools
- [ ] **Advanced analytics** - Dashboard with design metrics

### Extension Points

#### Adding New Extraction Features
1. Add field to `design_sources` schema
2. Implement extraction in `lib/browser-extraction.ts`
3. Save to database in `POST /api/design/extract`
4. Display in `components/site-detail.tsx`

#### Adding New Filters
1. Update `GET /api/design/filter-advanced` query
2. Add UI toggle in `app/admin/page.tsx`
3. Update filter state management

#### Adding New API Endpoints
1. Create route in `app/api/design/[feature]/route.ts`
2. Add database query in `lib/design-library.ts`
3. Update admin CMS or gallery to consume

---

## Troubleshooting

### Sites Not Showing in Admin
- Ensure database has sites (check `design_sources` table count)
- Verify `loadSites()` is called in `useEffect` on admin page mount
- Check browser console for API errors

### Images Not Displaying
- OG images fetch via `/api/og-image` - verify endpoint works
- Fallback to `thum.io` if OG image fails - check domain availability
- Inspect network tab for CORS or image errors

### Colors Not Extracted
- Website must have inline styles or `<style>` tags
- Check `lib/browser-extraction.ts` for CSS parsing logic
- Verify Puppeteer can render page (JavaScript-heavy sites may fail)

### Slow Admin Load
- Admin loads all sites by default - consider pagination
- Check database query performance (add indexes on `industry`, `created_at`)
- Monitor Puppeteer process memory for extraction operations

---

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "feat: description"`
3. Push to branch: `git push origin feature/your-feature`
4. Submit pull request

---

## Deployment

### Vercel (Recommended)

```bash
# Connect GitHub repo to Vercel
# Add DATABASE_URL secret in Vercel dashboard
# Deploy
git push origin main
```

### Manual Deployment

```bash
# Build
pnpm build

# Start server
pnpm start
```

---

## License

MIT - See LICENSE file for details

---

## Support

For issues, questions, or feature requests, open an issue on GitHub or contact the maintainer.

---

**Last Updated:** March 2026  
**Maintainer:** Damilare  
**Repository:** https://github.com/damilareoo/hitman-s-library
