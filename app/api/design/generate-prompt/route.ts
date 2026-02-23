import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { design } = await req.json()

    if (!design) {
      return NextResponse.json({ error: 'Design data required' }, { status: 400 })
    }

    const prompt = generateDesignPrompt(design)
    
    return NextResponse.json({ 
      success: true,
      prompt,
      design
    })
  } catch (error) {
    console.error('[v0] Prompt generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate prompt'
    }, { status: 500 })
  }
}

function generateDesignPrompt(design: any): string {
  const {
    title = 'Reference Design',
    url = '',
    colors = [],
    typography = [],
    layout = '',
    architecture = '',
    tags = [],
    industry = ''
  } = design

  // Format colors with more detail
  const colorDetails = colors.length > 0 
    ? colors.slice(0, 6).map((c, i) => {
        const colorNames = ['Primary/Brand', 'Secondary', 'Accent', 'Background', 'Text', 'Border']
        return `${colorNames[i] || `Color ${i + 1}`}: ${c}`
      }).join('\n  ')
    : 'Extract primary color palette from reference'

  const fontList = typography.length > 0 
    ? typography.slice(0, 4).map((f, i) => {
        const fontUse = i === 0 ? 'Headings' : i === 1 ? 'Body' : i === 2 ? 'Code/Mono' : 'Accents'
        return `${fontUse}: ${f}`
      }).join('\n  ')
    : 'Modern sans-serif system fonts'

  const hasAnimations = tags.includes('animated')
  const hasDarkMode = tags.includes('dark-mode')
  const isGlassmorphic = tags.includes('glassmorphism')
  const isResponsive = tags.includes('responsive')

  const prompt = `# COMPREHENSIVE DESIGN REFERENCE RECONSTRUCTION

## SOURCE REFERENCE
**Design Name:** ${title}
**Reference URL:** ${url}
**Industry/Category:** ${industry || 'General Web Design'}
**Design Patterns:** ${tags.length > 0 ? tags.join(' • ') : 'Standard web design patterns'}

---

## VISUAL DESIGN SYSTEM - COMPLETE SPECIFICATION

### COLOR PALETTE (Exact Implementation)
Analyze and extract these color values:
\`\`\`
${colorDetails}
\`\`\`

**Color Application Rules:**
- Primary: Main CTAs, links, active states, focus indicators, brand accents
- Secondary: Subtle backgrounds, hover states, disabled states, secondary UI
- Accent: Alerts, notifications, important information highlights
- Background: Main canvas, cards, sections
- Text: Default copy (primary), secondary text (muted), hints (low contrast)
- Border: Dividers, input borders, section separators

**Accessibility Compliance:**
- Text contrast: Minimum 4.5:1 for normal text, 3:1 for large text (≥18pt)
- UI components contrast: Minimum 3:1
- Color alone must not convey information (add icons/patterns)
- Support light and dark mode with equal contrast ratios

### TYPOGRAPHY SYSTEM (Exact Metrics)
Font Families:
\`\`\`
${fontList}
\`\`\`

**Typography Scale & Hierarchy:**
- Heading 1 (Hero): 48-56px, weight 700, letter-spacing -0.025em, line-height 1.1
- Heading 2 (Main sections): 36-42px, weight 600, letter-spacing -0.02em, line-height 1.2
- Heading 3 (Subsections): 28-32px, weight 600, letter-spacing -0.01em, line-height 1.3
- Heading 4 (Minor): 20-24px, weight 600, line-height 1.3
- Body Text (paragraphs): 16px, weight 400, line-height 1.6, letter-spacing 0
- Body Small (secondary text): 14px, weight 400, line-height 1.5, color muted
- UI Text (labels/buttons): 14px, weight 500, line-height 1.4
- Caption (hints/small): 12px, weight 400, line-height 1.4, color muted

**Font Loading & Performance:**
- Optimize font loading (system fonts first, then web fonts)
- Use font-display: swap for minimal layout shift
- Limit to 2-3 font families maximum

### LAYOUT & GRID SYSTEM
**Overall Layout Pattern:** ${layout}

**Responsive Grid Architecture:**
- Desktop (1024px+): 12-column grid, 16px-32px gutters, max-width 1440px
- Tablet (768px-1023px): 8-column grid, 16px gutters
- Mobile (320px-767px): 4-column grid, 16px gutters, single column for text-heavy sections

**Key Structural Sections:**
1. **Header/Navigation**: 
   - Height: 64px (desktop), 56px (mobile)
   - Position: Sticky/fixed, z-index strategic layering
   - Logo + Nav items + CTA button layout
   
2. **Hero Section**:
   - Full viewport (100vh) or 50-66% viewport height
   - Overlay text on background image/color
   - CTA button positioned for conversions
   
3. **Content Sections**:
   - Multi-column card layouts on desktop → single column on mobile
   - Consistent spacing between sections (48px-64px vertical rhythm)
   - Max-width containers for readability
   
4. **Call-to-Action Sections**:
   - High contrast background colors
   - Prominent buttons with large padding
   - Clear visual hierarchy
   
5. **Footer**:
   - Multi-column layout (desktop), stacked (mobile)
   - Links organized by category
   - Copyright + social icons

**Spacing & Rhythm:**
- Base spacing unit: 8px (or 4px for fine adjustments)
- Scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Vertical rhythm: Consistent line-height multiples (1.2-1.6)
- Component padding: 12-24px for compact, 24-32px for spacious
- Section margins: 48px-96px between major sections

### COMPONENT LIBRARY SPECIFICATIONS

**Buttons:**
- Primary: Background ${colors[0] || 'brand color'}, white text, 40px-48px height, 16px-24px padding, 4px radius, bold weight
- Secondary: Outline 2px, text color = brand, transparent background, same sizing
- Tertiary: Text-only, underline on hover, no background
- Disabled: 50% opacity, pointer-events none
- Hover: Scale 1.02 or 5% darker, shadow addition
- Active: Scale 0.98, increased shadow
- Focus: 2px ring of brand color, 4px offset

**Cards:**
- Border: 1px solid, color ${colors[4] || 'light gray'}
- Padding: 16-24px
- Border-radius: 4-8px
- Box-shadow: 0 1px 2px rgba(0,0,0,0.05), hover → 0 4px 12px rgba(0,0,0,0.1)
- Hover: Transform translateY(-2px), shadow increase
- Spacing between cards: 16-24px

**Input Fields & Forms:**
- Height: 40px (default), 48px (mobile/touch)
- Padding: 12px horizontal, 8px vertical
- Border: 1px solid ${colors[4] || 'border color'}, 4px radius
- Focus: 2px border ${colors[0] || 'brand color'}, shadow 0 0 0 3px rgba(brand, 0.1)
- Placeholder: ${colors[4] || 'muted color'}, 60% opacity
- Label: 14px, semi-bold, 8px above input, color ${colors[5] || 'text color'}
- Error state: 1px border #DC2626, error icon, error message 12px below

**Navigation:**
- Horizontal flex layout, items spaced 24px-32px
- Active link: Underline (2px) or background highlight
- Hover: Color shift or opacity change
- Mobile: Hamburger icon (3-line icon), slide-out drawer or dropdown
- Mega menu: Grid layout if many items

**Badges/Tags:**
- Padding: 4px 8px
- Border-radius: 12-16px (pill-shaped)
- Background: 10% tint of brand color
- Text: Brand color or darker shade
- Font: 12px, medium weight
- Use: Status indicators, category labels, feature highlights

**Loading & States:**
- Loading: Spinner (circular animation, 2s rotation), skeleton screens for layout
- Empty: Centered icon + message + optional action
- Error: Red icon, error message, retry button
- Success: Green icon, confirmation message, fade out after 3s

### DESIGN POLISH & DETAILS

**Shadows & Elevation:**
- Layer 1 (subtle): 0 1px 2px rgba(0,0,0,0.05)
- Layer 2 (raised): 0 4px 6px rgba(0,0,0,0.1)
- Layer 3 (elevated): 0 10px 15px rgba(0,0,0,0.15)
- Layer 4 (floating): 0 20px 25px rgba(0,0,0,0.2)

**Borders & Dividers:**
- Primary dividers: 1px solid, ${colors[4] || 'light gray'}
- Secondary dividers: 1px solid, 50% opacity
- Interactive element borders: 1px, matches text color or brand on focus

**Transitions & Animations:**
- Default duration: 200-300ms
- Easing: ease-out for entrances, ease-in for exits, ease-in-out for continuous
${hasAnimations ? '- Animations: Include scroll triggers, hover animations, page transitions' : '- Minimal animations: Focus on instant feedback and clarity'}

**Border Radius:**
- Cards/containers: 4-8px
- Buttons/inputs: 4-6px
- Pills/badges: 12-20px (50% for perfect circles)

### RESPONSIVE DESIGN IMPLEMENTATION
${isResponsive ? `**Fully Responsive Structure:**\n- Breakpoints: 320px, 768px, 1024px, 1440px\n- Mobile-first approach: Start mobile, enhance for larger screens\n- Touch targets: Minimum 48px × 48px\n- Images: Srcset for multiple densities, lazy loading\n- CSS Grid/Flexbox: Automatic reflow, no media query hacks` : '**Adaptive Design:**\n- Primary focus on desktop experience\n- Basic mobile considerations\n- Flexible layouts where possible'}

${hasDarkMode ? `**Dark Mode Implementation:**\n- Background: #0f172a or #111827\n- Text: #f8fafc or #f1f5f9\n- Cards/Surfaces: #1e293b or #1f2937\n- Borders: Lighter shade of background\n- All colors adjusted for dark contrast\n- Toggle switch in header for theme selection\n- System preference detection with localStorage persistence` : ''}

### TECHNICAL STACK & IMPLEMENTATION

**Architecture:** ${architecture || 'Modern component-based framework'}

**Build Approach:**  
- Component-driven development with clear separation  
- CSS-in-JS (Tailwind CSS, Styled Components) or SCSS modules  
- CSS Grid + Flexbox for layouts (avoid float/inline-block)  
- Mobile-first media queries  
- BEM or utility-first naming conventions

**Performance Optimization:**  
- Image optimization: WebP format, proper sizes  
- Font loading: System fonts first, web fonts with fallbacks  
- Code splitting: Lazy load components  
- CSS minification and tree-shaking  
- Critical CSS inlined, non-critical deferred

**Accessibility Standards (WCAG 2.1 AA):**  
- Semantic HTML: Use heading hierarchy, landmarks  
- ARIA labels: Labels on inputs, roles on custom components  
- Keyboard navigation: Tab order logical, skip links, focus visible  
- Screen reader support: Alt text, aria-live regions  
- Color independence: Icons/patterns alongside color coding

---

## VISUAL IDENTITY & BRAND APPLICATION

**Primary Use Cases:**  
- Brand color: All primary CTAs, logo, headers, highlights  
- Secondary: Subtle backgrounds, hover states, secondary information  
- Accent: Warnings, alerts, key highlights, interactive feedback  

**Hierarchy & Emphasis:**  
- Use typography weight + size for content hierarchy  
- Color for emphasis (use sparingly)  
- Whitespace for content grouping  
- Visual weight distribution balances composition  

**Design Language Summary:**  
- Style: ${tags.length > 0 ? tags.join(', ') : 'Professional, modern, clean'}  
- Visual tone: Minimalist (subtract) or elaborate (add texture)  
- Interaction philosophy: Instant feedback, smooth transitions  
- Accessibility-first: Design for inclusion from start  

---

## RECONSTRUCTION CHECKLIST

- [ ] Color palette applied to all UI elements with proper contrast  
- [ ] Typography hierarchy implemented across all heading/body levels  
- [ ] Spacing system consistently applied (8px unit grid)  
- [ ] Responsive breakpoints working: mobile, tablet, desktop  
- [ ] All component states implemented: hover, active, focus, disabled, loading, error  
- [ ] Accessibility: Color contrast, keyboard navigation, ARIA labels, semantic HTML  
- [ ] Animations smooth (200-300ms), purposeful, not distracting  
- [ ] Dark mode functional with proper contrast ratios  
- [ ] Images optimized, lazy-loaded  
- [ ] Performance: Fast load, smooth interactions  
- [ ] Cross-browser compatibility verified  
- [ ] Design tokens documented and reusable  
- [ ] Mobile touch targets 48px × 48px minimum  

---

**Reference Source:** ${title} (${url})  
**Design Category:** ${industry}  
**Use this specification for pixel-perfect reconstruction with complete design system coverage.**`.trim()

  return prompt
}
