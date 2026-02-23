# Design Library - Usage Guide

## Quick Start

### Adding Your First Design

1. **Single URL**
   - Paste a design URL (e.g., `https://stripe.com`)
   - Click "Add"
   - Wait for extraction to complete
   - Design appears in gallery with extracted details

2. **Multiple URLs via Excel**
   - Create a CSV or XLSX file:
     ```
     URL,Title,Industry
     https://stripe.com,Stripe,FinTech
     https://vercel.com,Vercel,SaaS
     https://dribbble.com,Dribbble,Design
     ```
   - Click "Import Excel"
   - Select your file
   - All designs extracted and added

### Browsing Your Library

1. **Filter by Industry**
   - Click industry buttons: "SaaS", "E-commerce", etc.
   - Shows only designs from that industry

2. **Search**
   - Type in search box to find by name or tag
   - Results update in real-time

3. **View Details**
   - Click any design card
   - Right panel slides in with all information
   - Click colors to copy hex codes
   - Click fonts to copy typography names

### Generating Prompts

1. **Select a Design**
   - Click any design card to view details

2. **Generate Prompt**
   - Click "Copy Prompt" button
   - Prompt automatically copied to clipboard

3. **Use in Design Work**
   - Paste prompt into your design tool
   - Use as reference for consistency
   - Build with same quality standards

## Example Workflow

### Building a SaaS Dashboard

1. **Add References**
   - Add 3-5 high-quality SaaS design URLs
   - Examples: Stripe, Vercel, Linear, Figma

2. **Extract Common Patterns**
   - Review extracted colors across designs
   - Notice shared typography (usually sans-serif)
   - Identify common layout patterns (sidebars, top nav)

3. **Generate Unified Prompt**
   - Open each reference
   - Copy prompts from 2-3 top choices
   - Combine themes manually or use as separate references

4. **Build Consistently**
   - Use extracted color palettes
   - Match typography selections
   - Follow identified layout patterns
   - Maintain similar quality benchmarks

## Extraction Details

### What Gets Extracted

#### Colors
- All hex colors (#000000, #FFFFFF, etc.)
- RGB values
- Limits to 5 most common
- Stored exactly as found

#### Typography
- Font-family values from CSS
- Common web fonts detected (Inter, Helvetica, etc.)
- Limits to 3 most prominent
- Shows actual font names used

#### Layout
- Grid vs. Flexbox detection
- Multi-section layouts vs. minimal
- Structure description (e.g., "Header, Hero, Content, Footer")

#### Architecture
- Card-based components
- Modal/dialog usage
- Tab/toggle patterns
- Responsive design indicators

#### Tags (Automatic)
- `dark-mode`: If dark theme detected
- `light-mode`: If light theme detected
- `animated`: If animations/transitions present
- `responsive`: If mobile-responsive
- `glassmorphism`: If glass effects used
- `gradient`: If gradients found
- `shadows`: If shadow effects present

### Quality Score

Auto-calculated based on:
- Number of extracted colors (variety)
- Number of detected fonts (sophistication)
- Layout complexity
- Architecture patterns found
- Result: 1-10 score

Higher scores = more complete, sophisticated designs

## Tips for Best Results

1. **Use Well-Designed Sites**
   - Extract from professional, high-quality websites
   - Avoid overly complex single-page apps
   - SaaS, e-commerce, and design agency sites work best

2. **Build a Diverse Library**
   - Add designs from different industries
   - Include different design approaches (minimal, bold, etc.)
   - Cross-industry references useful for inspiration

3. **Organize with Tags**
   - Use search + tags to find designs quickly
   - Tags auto-generate but can be notes
   - Industry filter handles primary organization

4. **Regular Updates**
   - Add new design references monthly
   - Remove outdated designs
   - Keep library fresh and relevant

## Keyboard Shortcuts

- **Enter** in URL input: Add design
- **Escape** in detail panel: Close panel
- **Cmd/Ctrl + C** on colors: Copy hex code
- **Cmd/Ctrl + C** on "Copy Prompt": Copy design brief

## Troubleshooting

### Extraction Failed
- Check URL is accessible
- Try a simpler design (fewer complex scripts)
- Some sites block extraction - that's normal

### Excel Import Shows No Results
- Ensure first column is URL
- No header row needed (starts from row 1)
- URLs must be complete (https://...)

### Colors Not Extracted
- Site may use CSS-in-JS (harder to parse)
- Colors might be dynamically generated
- Try a different design reference

### No Typography Found
- Fonts might be imported from external services
- Local fonts not detected
- Check extracted details in detail panel

## Export & Integration

### Copy Prompt for Other Tools
- Use copied design brief in:
  - Other design tools (Figma, Sketch)
  - AI design assistants (v0, Claude, etc.)
  - Development teams as specification

### Future: API Access
- Coming soon: API to programmatically access library
- Integrate extracted colors into design systems
- Export as CSS variables or design tokens
