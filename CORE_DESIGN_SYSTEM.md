# Design Intelligence Agent - Core Functionality Guide

## Overview

This repurposed Design Intelligence Agent focuses on **core database-driven functionality** without AI dependencies. You manually catalog and organize your design library, making it fast, reliable, and completely under your control.

---

## How It Works

### 1. Link Analyzer Node
**Purpose**: Manually catalog a design reference from any website

**What You Provide**:
- Website URL
- Design Description
- Color Palette (comma-separated hex codes)
- Typography (font names)
- Layout Notes (description of layout approach)
- Industry Category
- Tags (comma-separated)

**What It Does**: 
Creates a structured design record in your database with all metadata

**Example Workflow**:
```
1. Visit Stripe.com
2. Open Link Analyzer Node
3. Enter: "https://stripe.com"
4. Add description: "Modern fintech dashboard with clean typography"
5. Colors: "#FFFFFF, #000000, #635BFF"
6. Typography: "Inter, Helvetica"
7. Industry: "FinTech"
8. Tags: "minimalist, dark-mode, modern, payment"
9. Save
```

---

### 2. Design Store Node
**Purpose**: Save analyzed designs to your library with quality rating

**Configuration**:
- Design Reference URL
- Industry (SaaS, E-commerce, FinTech, etc.)
- Style (Minimalist, Bold, Corporate, etc.)
- Tags
- Quality Score (1-10):
  - **9-10**: Premium, award-worthy designs
  - **7-8**: Production-ready, high quality
  - **5-6**: Good reference, useful patterns
  - **1-4**: Conceptual, early stage

**Quality Scoring Tips**:
- Only store designs scoring 7+ for consistency
- Re-rate monthly as your standards evolve
- Higher scores appear first in searches

---

### 3. Design Retriever Node
**Purpose**: Search your design library for inspiration

**Filters**:
- Query (e.g., "SaaS dashboard")
- Industry
- Style
- Minimum Quality (threshold)
- Results Limit

**What You Get**:
- Relevant design references
- Color palettes used
- Typography choices
- Layout patterns
- All metadata for that design

---

### 4. Excel Parser Node
**Purpose**: Bulk import design links from your spreadsheet

**How to Use**:
1. Create Excel with columns: URL | Industry | Style | Notes
2. Open Excel Parser Node
3. Drop file or paste Google Sheets URL
4. Configure column mappings
5. Skip header rows if needed
6. Parser extracts all URLs for batch processing

---

## Database Schema

### Tables Used

**design_sources**
- Stores URLs, file names, source type
- Contains analyzed_content JSON
- quality_score, tags, analyzed_at

**design_industries**
- Pre-populated with 10 industries
- SaaS, E-commerce, FinTech, HealthTech, EdTech, Media, Design, Agency, Startup, Enterprise

**design_colors**
- Primary, secondary, accent colors
- Palette name
- Contrast score
- Accessibility compliance

**design_typography**
- Font family
- Heading/body sizes
- Line height, letter spacing
- Usage context

**design_styles**
- Style name
- Components list
- Design tokens (JSON)
- Accessibility features
- Documentation URL

---

## Workflow Templates

### Template 1: Build Your Library
```
Excel Parser 
  ↓ (reads your spreadsheet)
Link Analyzer Nodes (in batch)
  ↓ (analyze each URL)
Design Store
  ↓ (save to library)
Complete
```

**Use Case**: Import 20-50 design references you've curated

---

### Template 2: Manual Catalog Entry
```
Start
  ↓
Link Analyzer (catalog one design)
  ↓
Design Store (save with metadata)
  ↓
End
```

**Use Case**: Save interesting designs as you discover them

---

### Template 3: Search & Review
```
Start
  ↓
Design Retriever (query: "SaaS minimalist", min quality: 8)
  ↓
Output (view matching references)
```

**Use Case**: Find inspiration before starting a design project

---

## API Endpoints

### Save Design Reference
```
POST /api/design/core
{
  "action": "save-design",
  "sourceUrl": "https://stripe.com",
  "industry": "FinTech",
  "styleCategory": "Minimalist",
  "tags": "modern, dark-mode, payment",
  "qualityScore": 9,
  "colorPalette": "#FFFFFF, #000000, #635BFF",
  "typography": "Inter, Helvetica",
  "layoutNotes": "Sidebar navigation, hero section"
}
```

### Get Designs by Industry
```
POST /api/design/core
{
  "action": "get-designs",
  "industry": "SaaS",
  "limit": 10
}
```

### List All Designs
```
GET /api/design/core?action=list
```

### Get Industries
```
GET /api/design/core?action=industries
```

---

## Best Practices

### 1. Quality Over Quantity
- Start with 10-15 high-quality references per industry
- Only store designs you'd actually want to replicate
- Regularly audit and remove low-quality entries

### 2. Consistent Tagging
Use tags consistently:
- **Layout**: sidebar, hero, grid, cards, modal
- **Style**: minimalist, bold, playful, corporate
- **Feature**: dark-mode, animations, gradient, icons
- **Quality**: production-ready, accessible, fast

### 3. Monthly Updates
- Review new design trends quarterly
- Add 5-10 new designs monthly
- Remove outdated or low-quality entries
- Re-score existing designs as standards evolve

### 4. Organization by Industry
- Maintain separate libraries for different industries
- Use consistent style categories per industry
- Keep related designs grouped by quality score

### 5. Metadata Completeness
When saving, always include:
- Clear industry classification
- 3-5 relevant tags
- Color palette (hex codes)
- Font names used
- Brief layout description
- Accurate quality score

---

## Usage Flow

### Week 1: Build Foundation
1. Export your design links Excel sheet
2. Use Excel Parser to import all links
3. Use Link Analyzer to catalog each
4. Store 20-30 high-quality references

### Week 2-4: Refine & Organize
1. Review stored designs
2. Adjust quality scores
3. Add missing metadata
4. Complete tagging

### Ongoing: Maintain & Grow
1. Add 1-2 new references weekly
2. Search library when starting projects
3. Use retrieved designs as design context
4. Iterate based on your evolving standards

---

## Pro Tips

1. **Before You Design**: Query your library for relevant references
2. **Capture While Browsing**: Use Link Analyzer to save interesting designs
3. **Batch Import**: Run Excel Parser monthly with updated spreadsheet
4. **Quality First**: Only save designs scoring 7+
5. **Consistent Tags**: Develop a tagging vocabulary and stick to it
6. **Regular Audits**: Monthly review to keep library relevant
7. **Export Context**: Use Design Retriever output in your design tools

---

## Your Design Library is Your Superpower

By maintaining a curated, well-organized design library:
- You have instant access to high-quality references
- You maintain consistency across projects
- You reduce time spent searching for inspiration
- You build better first iterations
- You establish your own design language

Start small. Be consistent. Build it up over time. This becomes invaluable.

---

## Troubleshooting

**Problem**: Designs not appearing in search
- Check industry category matches exactly
- Verify quality score passes minimum threshold
- Confirm tags are entered correctly

**Problem**: Duplicate entries
- Review before saving
- Use Design Store quality field to mark duplicates as low score

**Problem**: Tags not working
- Use consistent tag names
- Avoid spaces in tags
- Separate with commas only

---

## Next Steps

1. Set up your initial design library (50-100 designs)
2. Use Design Browser component to visualize your collection
3. Create workflows combining Link Analyzer → Design Store
4. Search your library monthly for inspiration
5. Add new designs regularly to keep library fresh

The system is now ready to use. Focus on quality curation over quantity.
