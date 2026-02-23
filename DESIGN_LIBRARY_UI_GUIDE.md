# Design Library Agent - UI Guide

## Overview

The Design Library Agent is a visual workflow builder tailored for building and managing a curated collection of design references. The UI is organized around four core workflows that work together to help you establish a high-quality design knowledge base.

## Core Components

### 1. Node Palette (Left Side)
The node palette is reorganized to prioritize design workflows:

**Design Library Section (Featured)**
- **Import Excel** - Bulk import design links from your spreadsheet
- **Catalog Design** - Manually enter design details (colors, typography, layouts)
- **Save to Library** - Store designs with metadata and quality ratings
- **Search Library** - Query your library by industry, style, or quality

**Workflows Section**
- Standard workflow nodes (Prompt, Text Model, Conditions, etc.)
- Use these to build custom automation on top of your library

### 2. Templates Menu (Top Left)
Pre-built workflows organized by category:

**Design Library Workflows**
- Bulk Design Import - Import your entire Excel spreadsheet
- Design URL Analyzer - Analyze a single website and save patterns
- Design-Assisted Generation - Generate components informed by your library

**Standard Workflows**
- Simple Generation, Conditional Flow, etc.

### 3. Floating Add Button (+)
Located bottom-right for quick node addition:
- Design Library nodes listed first with color coding
- Workflows section below
- Drag to canvas or click to add

### 4. Onboarding Card
Displays best practices and quick reference:
- Overview of each design node type
- Quick start guide with checkpoints
- Quality tier reference (9-10: Premium, 7-8: Production, 5-6: Reference)

### 5. Design Library Sidebar
Shows library status and tips:
- Total designs count
- Industries represented
- Average quality score
- Recent additions
- Design tips and best practices
- Quick reference for Excel columns and quality tiers

## Workflow Examples

### Example 1: Build Your Library from Excel
```
Start → Import Excel → Catalog Design → Save to Library → End
```
- Import your spreadsheet with design links
- For each link, catalog the design details
- Save with quality score and industry tags

### Example 2: Add a Single Reference
```
Start → Catalog Design → Save to Library → End
```
- Manually enter a design you want to remember
- Record colors, typography, layout notes
- Tag with industry and style

### Example 3: Search for Inspiration
```
Start → Search Library → (use output in other workflows) → End
```
- Query by industry: "SaaS"
- Query by style: "Minimalist"
- Get back relevant patterns to reference

## Color Coding

Design nodes use distinct colors for quick recognition:

- **Import Excel** - Emerald green (data import)
- **Catalog Design** - Cyan blue (analysis/entry)
- **Save to Library** - Indigo purple (storage)
- **Search Library** - Amber yellow (retrieval)

## Best Practices for Using the UI

1. **Start with Templates** - Use a pre-built template as your base, then customize
2. **Quality First** - Only add designs rated 7+. Your library is only as good as its worst reference
3. **Consistent Tagging** - Use the same tags across designs for better searchability
4. **Regular Updates** - Import new designs weekly to keep your library current
5. **Industry Focus** - Use industry categories to keep designs organized and relevant

## Node Configuration

### Import Excel Node
- **File URL** - Link to your Excel file
- **Sheet Name** - Which sheet contains design links
- **Column Mappings** - URL, Category, Industry, Notes

### Catalog Design Node
- **Website URL** - Link to the design reference
- **Industry Category** - SaaS, E-commerce, FinTech, etc.
- **Design Description** - What you liked about this design
- **Color Palette** - Key colors (hex values)
- **Typography** - Fonts used
- **Layout Notes** - Key layout patterns
- **Tags** - Custom searchable tags

### Save to Library Node
- **Source URL** - Reference link
- **Industry** - Categorization
- **Style** - Minimalist, Bold, Corporate, etc.
- **Quality Score** - 1-10 rating
- **Tags** - Searchable keywords

### Search Library Node
- **Query** - Search term (industry, style, tag)
- **Quality Filter** - Minimum quality score
- **Results Limit** - How many to return

## Keyboard Shortcuts

- **Enter** in Prompt Bar - Generate/Execute
- **Drag nodes** - Arrange workflow
- **+ Button** - Quick node add menu
- **Esc** - Close menus

## Tips for Maximum Effectiveness

1. **Export Your Library** - After building, you can export your entire library for backups
2. **Share References** - Tag designs that teams should reference
3. **Version Your Library** - Export snapshots of your library periodically
4. **Use Consistent Naming** - Keep tag names consistent for better search results
5. **Quality Over Quantity** - 50 premium designs beat 500 mediocre ones

---

The Design Library Agent is built to help you become a better designer/builder by surrounding yourself with high-quality references that inform every decision you make.
