# Design Intelligence Agent - Complete Guide

Your v0 Agent Builder now includes a **Design Intelligence System** that learns from your design library and produces high-quality, contextually-aware UI components and layouts.

## 🎯 Core Features

### 1. **Link Analyzer Node** - Extract Design from URLs
- Analyzes websites and extracts design patterns
- Detects color palettes, typography, layout structures
- Stores patterns with quality scoring
- Works with any public website

**Use**: Drag a URL Analyzer node, input website URL, and store the analysis

### 2. **Excel Parser Node** - Bulk Import from Spreadsheet
- Connects to your Excel/Google Sheets with design links
- Maps columns: URL, Industry, Category, Notes
- Batch processes multiple URLs
- Perfect for updating your design library regularly

**Use**: Upload your spreadsheet and configure column mappings

### 3. **Design Retriever Node** - Search Your Knowledge Base
- Queries your stored design patterns by industry/style
- Returns relevant colors, typography, layouts
- Semantic search with quality filtering
- Extracts specific elements (patterns, colors, typography, layouts)

**Use**: In workflow, retrieve designs matching your project context

### 4. **Design Store Node** - Save to Knowledge Base
- Stores analyzed designs with metadata
- Generates semantic embeddings for smart search
- Auto-categorizes by AI
- Tags for organization

**Use**: Save analyzed designs after link or image analysis

### 5. **Image Analyzer Node** - Extract from Screenshots
- Analyzes design screenshots/images
- Extracts colors, typography, patterns
- Identifies layout structures
- Stores visual intelligence

**Use**: Upload design screenshots to learn from them

## 📊 Database Schema

Your Neon database includes:

- **design_sources** - Stores URLs, files, images analyzed
- **design_patterns** - Layout, component, interaction patterns
- **design_colors** - Color palettes with accessibility scores
- **design_typography** - Font families, sizes, line heights
- **design_styles** - Design systems and component libraries
- **design_industries** - Industry categorization (SaaS, E-commerce, etc.)
- **design_embeddings** - Vector embeddings for semantic search
- **excel_imports** - Tracks Excel file imports

## 🚀 Workflow Templates

### Template 1: Design URL Analyzer
1. Start → URL Analyzer → Design Store → End
- Perfect for saving individual design references

### Template 2: Bulk Design Import
1. Start → Excel Parser → URL Analyzer → Design Store → End
- Import all links from your spreadsheet at once

### Template 3: Design-Assisted UI Generation
1. Start → Design Retriever → Prompt → Text Model → End
- Generate components informed by your design library
- Pass retrieved context to prompt for consistent outputs

### Template 4: Design Screenshot Analysis
1. Start → Image Analyzer → Design Store → End
- Analyze screenshots and store insights

## 💡 How to Build High-Quality First Iterations

### Step 1: Build Your Design Library
```
1. Export your links spreadsheet to Excel/CSV
2. Upload using "Bulk Design Import" template
3. Or manually analyze websites one-by-one
```

### Step 2: Tag Designs Properly
When storing, use tags like:
- `modern`, `minimalist`, `bold`, `playful`
- `dark-mode`, `light-mode`, `gradient`
- `dashboard`, `landing-page`, `form`
- `accessible`, `fast`, `high-quality`

### Step 3: Use for Generation
Create workflow:
```
Design Retriever (search for "SaaS dashboard, dark, modern")
↓
Prompt ("Based on these references, build a React component...")
↓
Text Model
↓
Output
```

## 🎨 Quality Scoring

When saving designs:
- **9-10**: Industry-leading, award-worthy designs
- **7-8**: High-quality, production-ready
- **5-6**: Good examples, useful reference
- **1-4**: Conceptual, early stage

Higher scores appear first in searches.

## 📈 Industry Categories

Pre-configured industries:
- SaaS
- E-commerce
- FinTech
- HealthTech
- EdTech
- Media
- Design
- Agency
- Startup
- Enterprise

## 🔍 Semantic Search

Your designs are automatically embedded using OpenAI's text-embedding-3-small. This means:
- Search "modern dashboard" finds visually similar designs
- Search "financial app" finds relevant industry examples
- Style similarity works across different websites

## 💾 Design Library Best Practices

1. **Consistent Quality**: Only save production-ready designs (score 7+)
2. **Rich Metadata**: Use descriptive tags and categories
3. **Regular Updates**: Import new links from your spreadsheet
4. **Industry Focus**: Maintain designs by target industry
5. **Accessibility**: Prioritize designs with WCAG compliance

## 🔗 API Endpoints

### Analyze URL/Image
```
POST /api/design-intelligence/analyze
{
  "type": "analyze-url" | "extract-image",
  "url": "https://...",
  "industry": "SaaS",
  "analysisDepth": "detailed"
}
```

### Search Designs
```
POST /api/design-intelligence/search
{
  "action": "search-by-industry" | "get-context" | "list-industries",
  "industry": "SaaS",
  "query": "dashboard",
  "limit": 5
}
```

## 🎯 Pro Tips

1. **Build incrementally**: Start with 10-15 high-quality references per industry
2. **Update quarterly**: Re-analyze trending design patterns
3. **Tag consistently**: Use same tags for easy searching
4. **Leverage context**: Always use Design Retriever before Text Model
5. **Iterate**: Save generated outputs you like back to the library
6. **Monitor quality**: Review lower-scored items for patterns

## 🚀 Example: Building a SaaS Dashboard

```
Workflow:
1. Start
2. Design Retriever
   - Query: "SaaS dashboard, dark mode, minimalist"
   - Industry: SaaS
   - Min Quality: 8
   - Limit: 5
3. Prompt
   - "Based on these design references, create a React dashboard component with:"
   - "- Sidebar navigation"
   - "- Color palette from references"
   - "- Typography matching examples"
   - "- Responsive grid layout"
4. Text Model (GPT-5)
5. End
```

**Result**: Component generated with exact design language from your library!

## 🔄 Continuous Improvement

Your design library becomes more valuable over time:
- Each design stored improves future generation quality
- More examples = better context for AI
- Semantic search learns from your curation
- Industry patterns emerge automatically

Start with 5-10 designs per industry. Build from there. Every design you add makes your future outputs better.
