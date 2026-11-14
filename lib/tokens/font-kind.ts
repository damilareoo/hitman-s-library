// lib/tokens/font-kind.ts
// What kind of typeface a family name is. System fallbacks (Georgia, SFMono,
// sans-serif…) are not choices a site made; serif and mono are read from the
// name, the way designers say them.
const SYSTEM = /^(sfmono|sf mono|sf pro|menlo|monaco|consolas|courier|georgia|times|times new roman|arial|helvetica|helvetica neue|system-ui|-apple-system|blinkmacsystemfont|segoe ui|roboto|ui-monospace|ui-sans-serif|ui-serif|monospace|sans-serif|serif|cursive|fantasy|liberation|dejavu)/i
const SERIFS = /serif|playfair|garamond|georgia|times|fraunces|newsreader|lora|merriweather|baskerville|caslon|cormorant|crimson|tiempos|sectra|canela|domaine|ogg|recoleta|editorial|didot|bodoni|freight|lyon|spectral|literata|source serif|pt serif|ibm plex serif|gt alpina|reckless|signifier|epicene|tobias|financier|noe display|ivar|gt super|saol|kepler|minion|mercury|chronicle|plantin|sabon/i

export const isSystemFont = (font: string) => SYSTEM.test(font.trim())
export const isSerif = (font: string) => !isSystemFont(font) && SERIFS.test(font) && !/sans/i.test(font)
export const isMono = (font: string) => !isSystemFont(font) && /mono|code|courier/i.test(font)
export const isSans = (font: string) => !isSystemFont(font) && !isSerif(font) && !isMono(font)
