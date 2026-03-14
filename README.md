# Hitman's Library

A professional design system gallery where you can browse, analyze, and manage curated design websites. Think of it as a personal Pinterest for web design inspiration—extract colors, typography, and visual assets from any website for easy reference.

**Live:** https://mars-hitman-library.vercel.app

---

## What is This?

Hitman's Library solves a common problem: **keeping track of inspiring websites and their design systems**.

When you discover a website with great colors or typography, you usually bookmark it. But after 50+ bookmarks, finding that specific site again is impossible. Hitman's Library **automatically extracts and organizes design data** so you never lose track.

### What Gets Extracted?

- **Colors** - Primary, secondary, accent colors in HEX format (copy-paste ready)
- **Typography** - Heading font, body font, and monospace font used
- **OG Image** - Visual thumbnail for instant recognition
- **Metadata** - Quality rating, layout style, architecture type, industry category

- **Public Gallery** (`/`) - Browse and filter design websites by industry, colors, and typography. View design metadata with copyable color codes and typography details.
---

## Two Interfaces

### 1. Public Gallery (`/`) - Browse & Discover

**What you can do:**
- Browse all sites or filter by industry (SaaS, E-commerce, Portfolio, etc.)
- Search for specific websites by name or URL
- Click any site to see its colors (copy hex codes with one click), typography, and metadata
- View high-resolution OG images to visually identify sites instantly
- Works on desktop, tablet, and mobile with sticky filters for easy navigation

**Real example workflow:**
1. You're looking for SaaS design inspiration
2. Click the "SaaS" industry filter
3. Browse through all SaaS websites in your collection
4. Click a site you like → see its exact colors and fonts
5. Copy the colors directly to your design tool


---

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18 or higher ([download here](https://nodejs.org))
- A Neon PostgreSQL database ([free account](https://neon.tech))

### Step 1: Clone & Install

```bash
git clone https://github.com/damilareoo/hitman-s-library.git
cd hitman-s-library
pnpm install  # or npm install / yarn install
```

### Step 2: Set Up Database

1. Create free account at [neon.tech](https://neon.tech)
2. Create a new database
3. Copy your connection URL (looks like: `postgresql://user:pass@host/dbname`)

### Step 3: Configure Environment

```bash
# Create .env.local file
cp .env.example .env.local

# Add your database URL
echo "DATABASE_URL=your_neon_connection_url" >> .env.local
```

### Step 4: Run It

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How It Works (Behind the Scenes)

Don't need technical details? Skip to [Using the App](#using-the-app).

### Architecture Overview

```
Your Browser
    ↓
Next.js Server
    ├→ Puppeteer (opens websites & extracts content)
    ├→ Tailwind CSS (beautiful UI)
    └→ Neon Database (stores everything)
```

### What Happens When You Add a Site

1. **Site submission** goes through automated extraction
2. **Puppeteer** (automated browser) opens that website
3. It extracts:
   - Website title
   - All colors used in CSS
   - All fonts loaded (heading, body, code)
   - OG image from `<meta og:image>` tag
   - Page layout and architecture style
4. All data is saved to the database
5. Site instantly appears in your gallery with thumbnail

### Tech Stack (What Powers It)

| Component | Technology | Why? |
|-----------|-----------|------|
| Frontend | React 19 + Tailwind CSS | Fast, responsive UI |
| Backend | Next.js 16 | Full-stack in one framework |
| Database | Neon PostgreSQL | Reliable, powerful queries |
| Browser Control | Puppeteer | Automates website analysis |
| UI Components | shadcn/ui | Beautiful, accessible components |

---

## Using the App

### Gallery (`/`)

#### Basic Browsing
1. Open [https://mars-hitman-library.vercel.app](https://mars-hitman-library.vercel.app)
2. On desktop/tablet: See sidebar with industry filters
3. On mobile: Tap sticky filter bar at top
4. Click any site card to see details

#### Viewing Site Details

When you click a site, a panel opens showing:

**Colors Section**
- Shows all extracted colors in HEX format
- Hover over any color → copy button appears
- Click to copy → toast notification confirms

**Typography Section**
- Shows heading font (e.g., "Inter")
- Shows body font (e.g., "Roboto")
- Shows monospace font (e.g., "JetBrains Mono")
- Click any font → copies to clipboard

**Metadata Section**
- Quality rating (1-10)
- Layout style (e.g., "Minimal", "Dense")
- Industry category (e.g., "SaaS", "E-commerce")

#### Filtering

**By Industry**
- Click industry tag (e.g., "SaaS", "Portfolio")
- Only sites in that category show

**By Search**
- Use search bar (desktop) or sticky search (mobile)
- Type website name, URL, or tags
- Results filter in real-time

---

## Database Schema (What Gets Stored)

Don't worry about this unless you're modifying the code.

### design_sources Table
Stores main website information.

```
id (auto)          | Integer - unique ID
source_url         | Text - website URL (e.g., https://stripe.com)
source_name        | Text - website name (e.g., Stripe)
source_type        | Text - type (always "website" for now)
industry           | Text - category (SaaS, Portfolio, E-commerce, etc.)
thumbnail_url      | Text - OG image URL for visual display
metadata           | JSON - description, quality score, layout, architecture
tags               | Array - optional tags (e.g., [payments, fintech])
created_at         | Timestamp - when site was added
analyzed_at        | Timestamp - when content was extracted
```

### design_colors Table
Stores color palettes.

```
id (auto)          | Integer - unique ID
source_id          | Integer - links to design_sources
primary_color      | Text - main color in HEX (e.g., #FF5733)
secondary_color    | Text - secondary color
accent_color       | Text - accent color
all_colors         | Array - all unique colors found
color_harmony      | Text - harmony type (complementary, analogous, etc.)
mood               | Text - color mood (warm, cool, vibrant, etc.)
created_at         | Timestamp - when extracted
```

### design_typography Table
Stores font information.

```
id (auto)          | Integer - unique ID
source_id          | Integer - links to design_sources
heading_font       | Text - font used for headings (e.g., Inter)
body_font          | Text - font used for body text (e.g., Roboto)
mono_font          | Text - font used for code (e.g., JetBrains Mono)
mood               | Text - typography mood (professional, playful, etc.)
created_at         | Timestamp - when extracted
```

---

## API Endpoints (For Developers)

These are the "roads" the app travels to get/send data. You don't need to know these to use the app.

### Adding a Site
```bash
POST /api/design/extract

Body:
{
  "url": "https://example.com",
  "notes": "Optional description"
}

Response:
{
  "id": 1,
  "success": true,
  "title": "Example",
  "industry": "SaaS",
  "colors": ["#FF5733", "#33FF57"],
  "typography": ["Inter", "Roboto"]
}
```

### Getting All Sites
```bash
GET /api/design/list

Optional params:
?search=stripe          # Search by name
?industry=SaaS          # Filter by industry
```

### Deleting a Site
```bash
DELETE /api/design/delete

Body:
{
  "id": 1
}
```

### Advanced Search
```bash
GET /api/design/filter-advanced

Params:
?industry=SaaS&page=1&limit=20
```

### Bulk Import
```bash
POST /api/design/import-excel

Body: FormData with CSV/Excel file
```

---

## Troubleshooting

### "Sites not showing" or "Empty gallery"
1. Make sure you're in the admin panel (`/admin`)
2. Add at least one site first
3. Go back to gallery (`/`) to see it

### "Images not loading"
1. Check your internet connection
2. The app tries to get OG images from websites - some sites don't have them
3. If all images fail, there may be a server issue (check console for errors)

### "Can't add sites" or getting errors
1. Check that your database URL is correct in `.env.local`
2. Make sure Neon database is running
3. Open browser console (F12) to see error messages

### "Adding sites is slow"
1. This is normal - the app opens each website in a browser to extract content
2. Extraction takes 5-15 seconds per site depending on website complexity
3. Bulk import is faster if adding many sites

### "Performance is slow"
1. If you have 1000+ sites, consider archiving old ones
2. Database queries can be optimized (check `lib/design-library.ts`)
3. Clear browser cache (sometimes helps with image loading)

---

## Development Tips

### Project File Structure

```
app/                      # Pages and server code
├── page.tsx             # Gallery homepage
├── admin/
│   └── page.tsx         # Admin control panel
├── api/
│   └── design/          # API routes for all operations
├── layout.tsx           # Global layout (header, theme)
└── globals.css          # Tailwind setup & design tokens

lib/                      # Utility functions
├── types.ts             # TypeScript interfaces (what data looks like)
├── design-library.ts    # Database queries
├── browser-extraction.ts # Puppeteer website analysis
└── typography-extraction.ts # Font detection

components/              # Reusable UI pieces
├── site-thumbnail.tsx   # Shows website images
├── typography-display.tsx # Shows fonts
└── ui/                  # Pre-made components (button, input, etc.)

public/                   # Images, icons, assets
```

### Making Changes

**Adding a new filter:**
1. Edit `app/api/design/filter-advanced/route.ts`
2. Update the SQL query
3. Update `app/admin/page.tsx` to show new filter option

**Storing new data:**
1. Add column to database table (contact your database provider)
2. Extract new data in `lib/browser-extraction.ts`
3. Save in `app/api/design/extract/route.ts`
4. Display in components

**Creating new page:**
1. Create `app/your-page/page.tsx`
2. Next.js automatically makes it a route at `/your-page`
3. Import components as needed

---

## Future Features (Planned)

- Color palette editor (customize and save palettes)
- Design pattern tagging (organize layout patterns)
- AI-powered insights (summarize trends from your library)
- Figma/CSS export (generate design code directly)
- Collaborative notes (add annotations to sites)
- Advanced analytics (see what styles are trending)
- Webhook integrations (connect to external tools)

---

## Deployment to Production

### Using Vercel (Easiest)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → select your repo
4. Add environment variables:
   - `DATABASE_URL` - your Neon connection URL
5. Click "Deploy"
6. Your site is live at `your-project.vercel.app`

### Using Your Own Server

1. Build: `pnpm build`
2. Start: `pnpm start`
3. Keep running in background (use PM2, screen, etc.)

---

## Getting Help

- **Issues?** Open a GitHub issue on the [repository](https://github.com/damilareoo/hitman-s-library)
- **Questions?** Check this README first, then open a discussion
- **Want to contribute?** Fork the repo, make changes, submit a pull request

---

## License

MIT - Use this code however you want, just give credit.

---

## Version Info

**Current Version:** 1.0.0  
**Last Updated:** March 2026  
**Maintainer:** Damilare  
**Repository:** https://github.com/damilareoo/hitman-s-library

**Key Features in This Version:**
- ✅ Browse and search design sites
- ✅ Extract colors and typography automatically
- ✅ Admin panel for site management
- ✅ Bulk import via CSV/Excel
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Copy colors with one click
- ✅ Visual thumbnails for all sites
- ✅ Industry categorization
- ✅ Pagination for large collections

