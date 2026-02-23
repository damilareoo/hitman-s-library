// Font source mapping - links to where users can find, trial, and purchase fonts
interface FontSource {
  name: string
  url: string
  type: 'free' | 'trial' | 'premium'
  category: 'serif' | 'sans-serif' | 'monospace' | 'display'
}

interface FontMapping {
  [key: string]: FontSource
}

// Comprehensive mapping of common web fonts to their sources
export const FONT_SOURCES: FontMapping = {
  // Google Fonts (Free & Open Source)
  'Inter': { name: 'Inter', url: 'https://fonts.google.com/specimen/Inter', type: 'free', category: 'sans-serif' },
  'Playfair Display': { name: 'Playfair Display', url: 'https://fonts.google.com/specimen/Playfair+Display', type: 'free', category: 'serif' },
  'Poppins': { name: 'Poppins', url: 'https://fonts.google.com/specimen/Poppins', type: 'free', category: 'sans-serif' },
  'Roboto': { name: 'Roboto', url: 'https://fonts.google.com/specimen/Roboto', type: 'free', category: 'sans-serif' },
  'Montserrat': { name: 'Montserrat', url: 'https://fonts.google.com/specimen/Montserrat', type: 'free', category: 'sans-serif' },
  'Raleway': { name: 'Raleway', url: 'https://fonts.google.com/specimen/Raleway', type: 'free', category: 'sans-serif' },
  'Lora': { name: 'Lora', url: 'https://fonts.google.com/specimen/Lora', type: 'free', category: 'serif' },
  'Dm Sans': { name: 'DM Sans', url: 'https://fonts.google.com/specimen/DM+Sans', type: 'free', category: 'sans-serif' },
  'Dm Mono': { name: 'DM Mono', url: 'https://fonts.google.com/specimen/DM+Mono', type: 'free', category: 'monospace' },
  'Space Mono': { name: 'Space Mono', url: 'https://fonts.google.com/specimen/Space+Mono', type: 'free', category: 'monospace' },
  'IBM Plex Mono': { name: 'IBM Plex Mono', url: 'https://fonts.google.com/specimen/IBM+Plex+Mono', type: 'free', category: 'monospace' },
  'Courier Prime': { name: 'Courier Prime', url: 'https://fonts.google.com/specimen/Courier+Prime', type: 'free', category: 'monospace' },
  'Inconsolata': { name: 'Inconsolata', url: 'https://fonts.google.com/specimen/Inconsolata', type: 'free', category: 'monospace' },
  'JetBrains Mono': { name: 'JetBrains Mono', url: 'https://www.jetbrains.com/lp/mono/', type: 'free', category: 'monospace' },
  'Fira Code': { name: 'Fira Code', url: 'https://github.com/tonsky/FiraCode', type: 'free', category: 'monospace' },
  'Source Code Pro': { name: 'Source Code Pro', url: 'https://fonts.google.com/specimen/Source+Code+Pro', type: 'free', category: 'monospace' },
  
  // Adobe Fonts (Trial/Premium)
  'Adobe Garamond': { name: 'Adobe Garamond', url: 'https://fonts.adobe.com', type: 'premium', category: 'serif' },
  'Gotham': { name: 'Gotham', url: 'https://fonts.adobe.com', type: 'premium', category: 'sans-serif' },
  'Myriad Pro': { name: 'Myriad Pro', url: 'https://fonts.adobe.com', type: 'premium', category: 'sans-serif' },
  'Garamond': { name: 'Garamond', url: 'https://fonts.adobe.com', type: 'premium', category: 'serif' },
  
  // Typekit (Adobe)
  'Typekit': { name: 'Typekit', url: 'https://fonts.adobe.com', type: 'premium', category: 'sans-serif' },
  
  // Monotype (Premium Fonts)
  'Arial': { name: 'Arial', url: 'https://www.monotype.com', type: 'premium', category: 'sans-serif' },
  'Times New Roman': { name: 'Times New Roman', url: 'https://www.monotype.com', type: 'premium', category: 'serif' },
  'Helvetica': { name: 'Helvetica', url: 'https://www.monotype.com', type: 'premium', category: 'sans-serif' },
  'Helvetica Neue': { name: 'Helvetica Neue', url: 'https://www.monotype.com', type: 'premium', category: 'sans-serif' },
  'Georgia': { name: 'Georgia', url: 'https://www.monotype.com', type: 'premium', category: 'serif' },
  'Courier': { name: 'Courier', url: 'https://www.monotype.com', type: 'premium', category: 'monospace' },
  
  // MyFonts (Premium)
  'Futura': { name: 'Futura', url: 'https://www.myfonts.com', type: 'premium', category: 'sans-serif' },
  'Bodoni': { name: 'Bodoni', url: 'https://www.myfonts.com', type: 'premium', category: 'serif' },
  'Avenir': { name: 'Avenir', url: 'https://www.linotype.com', type: 'premium', category: 'sans-serif' },
  'Optima': { name: 'Optima', url: 'https://www.linotype.com', type: 'premium', category: 'sans-serif' },
  
  // Fonts.com (Premium)
  'Gill Sans': { name: 'Gill Sans', url: 'https://www.fonts.com', type: 'premium', category: 'sans-serif' },
  'Trebuchet MS': { name: 'Trebuchet MS', url: 'https://www.fonts.com', type: 'premium', category: 'sans-serif' },
  
  // Colophon Foundry & Indie Foundries (Premium)
  'Freight Display': { name: 'Freight Display', url: 'https://www.fontbureau.com', type: 'premium', category: 'display' },
  'Lyon': { name: 'Lyon', url: 'https://www.lyontype.com', type: 'premium', category: 'serif' },
  
  // FontAwesome (Free)
  'Font Awesome': { name: 'Font Awesome', url: 'https://fontawesome.com', type: 'free', category: 'display' },
  
  // System Fonts
  '-apple-system': { name: 'System Font', url: 'https://fonts.google.com', type: 'free', category: 'sans-serif' },
  'BlinkMacSystemFont': { name: 'System Font', url: 'https://fonts.google.com', type: 'free', category: 'sans-serif' },
  'Segoe UI': { name: 'Segoe UI', url: 'https://www.monotype.com', type: 'premium', category: 'sans-serif' },
  'system-ui': { name: 'System UI', url: 'https://fonts.google.com', type: 'free', category: 'sans-serif' },
  
  // Additional Google Fonts
  'Open Sans': { name: 'Open Sans', url: 'https://fonts.google.com/specimen/Open+Sans', type: 'free', category: 'sans-serif' },
  'Source Sans Pro': { name: 'Source Sans Pro', url: 'https://fonts.google.com/specimen/Source+Sans+Pro', type: 'free', category: 'sans-serif' },
  'Lato': { name: 'Lato', url: 'https://fonts.google.com/specimen/Lato', type: 'free', category: 'sans-serif' },
  'Dosis': { name: 'Dosis', url: 'https://fonts.google.com/specimen/Dosis', type: 'free', category: 'sans-serif' },
  'Mulish': { name: 'Mulish', url: 'https://fonts.google.com/specimen/Mulish', type: 'free', category: 'sans-serif' },
  'Sora': { name: 'Sora', url: 'https://fonts.google.com/specimen/Sora', type: 'free', category: 'sans-serif' },
  'Outfit': { name: 'Outfit', url: 'https://fonts.google.com/specimen/Outfit', type: 'free', category: 'sans-serif' },
  'Manrope': { name: 'Manrope', url: 'https://fonts.google.com/specimen/Manrope', type: 'free', category: 'sans-serif' },
  'Plus Jakarta Sans': { name: 'Plus Jakarta Sans', url: 'https://fonts.google.com/specimen/Plus+Jakarta+Sans', type: 'free', category: 'sans-serif' },
  'Urbanist': { name: 'Urbanist', url: 'https://fonts.google.com/specimen/Urbanist', type: 'free', category: 'sans-serif' },
  'Geist': { name: 'Geist', url: 'https://vercel.com/font', type: 'free', category: 'sans-serif' },
  'Instrument Sans': { name: 'Instrument Sans', url: 'https://fonts.google.com/specimen/Instrument+Sans', type: 'free', category: 'sans-serif' },
}

// Get a font source by name (with fuzzy matching)
export function getFontSource(fontName: string): FontSource | null {
  if (!fontName) return null
  
  // Direct match
  if (FONT_SOURCES[fontName]) {
    return FONT_SOURCES[fontName]
  }
  
  // Case-insensitive match
  const normalized = fontName.toLowerCase().trim()
  for (const [key, value] of Object.entries(FONT_SOURCES)) {
    if (key.toLowerCase() === normalized) {
      return value
    }
  }
  
  // Partial match for common variations
  for (const [key, value] of Object.entries(FONT_SOURCES)) {
    if (key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())) {
      return value
    }
  }
  
  return null
}

// Extract category from font name if no source found
export function guessFontCategory(fontName: string): 'serif' | 'sans-serif' | 'monospace' | 'display' {
  const lower = fontName.toLowerCase()
  
  if (lower.includes('mono') || lower.includes('courier') || lower.includes('code') || lower.includes('console')) {
    return 'monospace'
  }
  if (lower.includes('serif') || lower.includes('garamond') || lower.includes('bodoni') || lower.includes('georgia')) {
    return 'serif'
  }
  if (lower.includes('display') || lower.includes('headline') || lower.includes('title')) {
    return 'display'
  }
  
  return 'sans-serif'
}

// Get a label for the font type
export function getFontTypeLabel(type: 'free' | 'trial' | 'premium'): string {
  const labels = {
    'free': 'Free & Open Source',
    'trial': 'Trial Available',
    'premium': 'Premium / Subscription'
  }
  return labels[type]
}

// Get a badge color for the font type
export function getFontTypeBadgeColor(type: 'free' | 'trial' | 'premium'): string {
  const colors = {
    'free': 'bg-green-500/10 text-green-700 border-green-200',
    'trial': 'bg-blue-500/10 text-blue-700 border-blue-200',
    'premium': 'bg-purple-500/10 text-purple-700 border-purple-200'
  }
  return colors[type]
}
