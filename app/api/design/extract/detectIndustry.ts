// Auto-detect industry category from extracted design data
export function detectIndustry(title: string, url: string, metadata: any): string {
  const titleLower = title.toLowerCase()
  const urlLower = url.toLowerCase()
  const metaStr = JSON.stringify(metadata).toLowerCase()
  
  // Industry detection based on domain keywords and extracted data
  const industryMap: Record<string, string[]> = {
    'SaaS': ['stripe', 'notion', 'slack', 'figma', 'intercom', 'pipedrive', 'segment', 'mixpanel', 'amplitude', 'datadog', 'app', 'dashboard', 'analytics', 'software'],
    'Fintech': ['revolut', 'wise', 'n26', 'robinhood', 'kraken', 'coinbase', 'paypal', 'square', 'klarna', 'affirm', 'finance', 'payment', 'banking', 'crypto'],
    'E-commerce': ['shopify', 'woocommerce', 'magento', 'etsy', 'amazon', 'alibaba', 'ebay', 'wish', 'shein', 'store', 'shop', 'ecommerce', 'product'],
    'Social Media': ['facebook', 'twitter', 'instagram', 'tiktok', 'snapchat', 'linkedin', 'reddit', 'pinterest', 'social', 'feed', 'community'],
    'Travel': ['airbnb', 'booking', 'expedia', 'kayak', 'tripadvisor', 'hotels', 'travel', 'booking', 'flight', 'vacation'],
    'Education': ['udemy', 'coursera', 'skillshare', 'duolingo', 'education', 'learning', 'course', 'student', 'academy'],
    'Healthcare': ['teladoc', 'healthcare', 'medical', 'health', 'clinic', 'doctor', 'patient', 'wellness'],
    'Entertainment': ['netflix', 'hulu', 'disney', 'spotify', 'youtube', 'twitch', 'gaming', 'entertainment', 'stream', 'video', 'music'],
    'Productivity': ['asana', 'monday', 'jira', 'trello', 'task', 'project', 'productivity', 'collaboration', 'workflow'],
    'Marketing': ['marketing', 'campaign', 'analytics', 'email', 'crm', 'customer', 'sales', 'conversion'],
  }
  
  // Check domain keywords first
  for (const [category, keywords] of Object.entries(industryMap)) {
    if (keywords.some(kw => titleLower.includes(kw) || urlLower.includes(kw))) {
      return category
    }
  }
  
  // Check extracted metadata
  for (const [category, keywords] of Object.entries(industryMap)) {
    if (keywords.some(kw => metaStr.includes(kw))) {
      return category
    }
  }
  
  // Detect by architecture and design patterns
  if (metaStr.includes('react') || metaStr.includes('next.js') || metaStr.includes('dashboard')) {
    return 'SaaS'
  }
  
  if (metaStr.includes('product') || metaStr.includes('cart') || metaStr.includes('payment')) {
    return 'E-commerce'
  }
  
  if (metaStr.includes('feed') || metaStr.includes('social') || metaStr.includes('community')) {
    return 'Social Media'
  }
  
  // Fallback to General if no match
  return 'General'
}
