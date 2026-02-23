import type { NodeType } from "./types"

export const PROVIDER_LOGOS: Record<string, string> = {
  OpenAI: "/images/openai.avif",
  xAI: "/images/xai.avif",
  Google: "/images/google.avif",
  "Black Forest Labs": "/images/blackforestlabs.avif",
}

// AI Models available through AI Gateway
export const TEXT_MODELS = [
  // OpenAI
  { value: "openai/gpt-5", label: "GPT-5", group: "OpenAI" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", group: "OpenAI" },
  { value: "openai/gpt-4.1", label: "GPT-4.1", group: "OpenAI" },
  { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", group: "OpenAI" },
  { value: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano", group: "OpenAI" },
  { value: "openai/o3", label: "o3", group: "OpenAI" },
  { value: "openai/o3-mini", label: "o3 Mini", group: "OpenAI" },
  { value: "openai/o4-mini", label: "o4 Mini", group: "OpenAI" },
  // Google Gemini models
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", group: "Google" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", group: "Google" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", group: "Google" },
  { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", group: "Google" },
  { value: "google/gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", group: "Google" },
  // xAI (Grok)
  { value: "xai/grok-4", label: "Grok 4", group: "xAI" },
  { value: "xai/grok-4-fast", label: "Grok 4 Fast", group: "xAI" },
  { value: "xai/grok-3", label: "Grok 3", group: "xAI" },
  { value: "xai/grok-3-fast", label: "Grok 3 Fast", group: "xAI" },
  { value: "xai/grok-3-mini", label: "Grok 3 Mini", group: "xAI" },
  { value: "xai/grok-3-mini-fast", label: "Grok 3 Mini Fast", group: "xAI" },
] as const

// Updated default node data
export const DEFAULT_NODE_DATA: Record<NodeType, Record<string, unknown>> = {
  start: {},
  end: {},
  prompt: { content: "Enter your prompt..." },
  textModel: {
    model: "openai/gpt-5-mini",
    temperature: 0.7,
    maxTokens: 2000,
  },
  imageGeneration: { model: "google/gemini-2.5-flash-image", aspectRatio: "1:1", outputFormat: "png" },
  conditional: { condition: "input1 === 'value'" },
  javascript: { code: "// Access inputs as input1, input2, etc.\nreturn input1.toUpperCase()" },
  httpRequest: { url: "https://api.example.com", method: "GET" },
  embeddingModel: { model: "openai/text-embedding-3-small", dimensions: 1536 },
  tool: { name: "customTool", description: "A custom tool" },
  audio: { model: "openai/tts-1", voice: "alloy", speed: 1.0 },
  structuredOutput: { schemaName: "Schema", mode: "object" },
  memory: { operation: "load", sessionId: "default", key: "", memoryType: "fact", limit: 10 },
  // Design Intelligence nodes
  urlAnalyzer: { url: "", analysisDepth: "detailed", extractImages: true, industry: "" },
  imageAnalyzer: { imageUrl: "", analysisType: "full", model: "openai/gpt-5", extractColorPalette: true, extractTypography: true, extractPatterns: true },
  designRetriever: { query: "", industry: "", style: "", minQuality: 7, limit: 5, retrievePatterns: true, retrieveColors: true, retrieveTypography: true, retrieveLayouts: true },
  excelParser: { fileUrl: "", sheetName: "Sheet1", urlColumn: "A", categoryColumn: "B", industryColumn: "C", notesColumn: "D", skipRows: 1 },
  designStore: { operation: "save_reference", generateEmbedding: true, industry: "", styleCategory: "", tags: "", qualityScore: 8, autoCategorie: true },
}

export const IMAGE_MODELS = [
  { value: "google/gemini-3-pro-image", label: "Gemini 3 Pro Image", group: "Google" },
  { value: "google/gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image", group: "Google" },
] as const

export const EMBEDDING_MODELS = [
  { value: "openai/text-embedding-3-small", label: "text-embedding-3-small" },
  { value: "openai/text-embedding-3-large", label: "text-embedding-3-large" },
] as const

export const TTS_VOICES = [
  { value: "alloy", label: "Alloy" },
  { value: "echo", label: "Echo" },
  { value: "fable", label: "Fable" },
  { value: "onyx", label: "Onyx" },
  { value: "nova", label: "Nova" },
  { value: "shimmer", label: "Shimmer" },
] as const

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const

export const ASPECT_RATIOS = ["1:1", "16:9", "4:3", "3:2", "9:16"] as const

// Node type metadata
export const NODE_TYPES: Record<NodeType, { label: string; description: string; category?: string }> = {
  start: { label: "Start", description: "Workflow entry point", category: "flow" },
  end: { label: "End", description: "Workflow output", category: "flow" },
  prompt: { label: "Prompt", description: "Text template", category: "core" },
  textModel: { label: "Text Model", description: "LLM generation", category: "ai" },
  imageGeneration: { label: "Image", description: "Image generation", category: "ai" },
  conditional: { label: "Conditional", description: "Branch logic", category: "flow" },
  javascript: { label: "JavaScript", description: "Custom code", category: "core" },
  httpRequest: { label: "HTTP", description: "API requests", category: "integration" },
  embeddingModel: { label: "Embedding", description: "Vector embeddings", category: "ai" },
  tool: { label: "Tool", description: "Custom function", category: "core" },
  audio: { label: "Audio", description: "Text-to-speech", category: "ai" },
  structuredOutput: { label: "Structured", description: "Schema output", category: "core" },
  memory: { label: "Memory", description: "Persistent storage", category: "storage" },
  // Design Intelligence nodes
  urlAnalyzer: { label: "URL Analyzer", description: "Extract design from websites", category: "design" },
  imageAnalyzer: { label: "Image Analyzer", description: "Extract design from images", category: "design" },
  designRetriever: { label: "Design Retriever", description: "Find matching patterns", category: "design" },
  excelParser: { label: "Excel Parser", description: "Import design links", category: "design" },
  designStore: { label: "Design Store", description: "Save to knowledge base", category: "design" },
}

// Workflow templates - core functionality
export const WORKFLOW_TEMPLATES = [
  // Design Intelligence Templates
  {
    id: "design-url-analyzer",
    name: "Design URL Analyzer",
    description: "Analyze a website and store design patterns to knowledge base",
    nodes: [
      { id: "1", type: "start", position: { x: 50, y: 250 }, data: {} },
      { id: "2", type: "urlAnalyzer", position: { x: 350, y: 250 }, data: { url: "https://stripe.com", analysisDepth: "comprehensive", extractImages: true, industry: "SaaS" } },
      { id: "3", type: "designStore", position: { x: 750, y: 250 }, data: { operation: "save_reference", generateEmbedding: true, qualityScore: 9, tags: "stripe, saas, payments, modern" } },
      { id: "4", type: "end", position: { x: 1100, y: 250 }, data: {} },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
    ],
  },
  {
    id: "design-bulk-import",
    name: "Bulk Design Import",
    description: "Import multiple design references from Excel spreadsheet",
    nodes: [
      { id: "1", type: "start", position: { x: 50, y: 250 }, data: {} },
      { id: "2", type: "excelParser", position: { x: 350, y: 250 }, data: { sheetName: "Design Links", urlColumn: "A", industryColumn: "B", categoryColumn: "C", skipRows: 1 } },
      { id: "3", type: "urlAnalyzer", position: { x: 750, y: 250 }, data: { analysisDepth: "detailed", extractImages: true } },
      { id: "4", type: "designStore", position: { x: 1100, y: 250 }, data: { operation: "save_reference", generateEmbedding: true, autoCategorie: true } },
      { id: "5", type: "end", position: { x: 1450, y: 250 }, data: {} },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
      { id: "e4-5", source: "4", target: "5" },
    ],
  },
  {
    id: "design-assisted-generation",
    name: "Design-Assisted UI Generation",
    description: "Generate UI components with design intelligence context",
    nodes: [
      { id: "1", type: "start", position: { x: 50, y: 250 }, data: {} },
      { id: "2", type: "designRetriever", position: { x: 350, y: 250 }, data: { query: "Modern SaaS dashboard with dark mode", industry: "SaaS", style: "Minimalist", minQuality: 8, limit: 5 } },
      { id: "3", type: "prompt", position: { x: 700, y: 250 }, data: { content: "Based on these design references:\n\n$input1\n\nGenerate a React component for a modern SaaS dashboard sidebar. Include navigation items, user profile section, and theme toggle. Use the color palette and typography from the references." } },
      { id: "4", type: "textModel", position: { x: 1050, y: 250 }, data: { model: "openai/gpt-5", temperature: 0.7, maxTokens: 3000 } },
      { id: "5", type: "end", position: { x: 1400, y: 250 }, data: {} },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
      { id: "e4-5", source: "4", target: "5" },
    ],
  },
  {
    id: "design-image-analysis",
    name: "Design Screenshot Analysis",
    description: "Analyze design from screenshots and store to knowledge base",
    nodes: [
      { id: "1", type: "start", position: { x: 50, y: 250 }, data: {} },
      { id: "2", type: "imageAnalyzer", position: { x: 350, y: 250 }, data: { analysisType: "full", model: "openai/gpt-5", extractColorPalette: true, extractTypography: true, extractPatterns: true } },
      { id: "3", type: "designStore", position: { x: 700, y: 250 }, data: { operation: "save_reference", generateEmbedding: true, autoCategorie: true } },
      { id: "4", type: "end", position: { x: 1050, y: 250 }, data: {} },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
    ],
  },
  // Standard Templates
  {
    id: "simple-generation",
    name: "Simple Text Generation",
    description: "Basic prompt to text generation workflow",
    nodes: [
      { id: "1", type: "start", position: { x: 100, y: 200 }, data: {} },
      { id: "2", type: "prompt", position: { x: 400, y: 200 }, data: { content: "Write a haiku about AI" } },
      {
        id: "3",
        type: "textModel",
        position: { x: 750, y: 200 },
        data: { model: "openai/gpt-5-mini", temperature: 0.7, maxTokens: 300 },
      },
      { id: "4", type: "end", position: { x: 1100, y: 200 }, data: {} },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
    ],
  },
  {
    id: "image-generation",
    name: "Image Generation",
    description: "Generate images from text prompts",
    nodes: [
      { id: "1", type: "start", position: { x: 100, y: 200 }, data: {} },
      { id: "2", type: "prompt", position: { x: 400, y: 200 }, data: { content: "A futuristic city at sunset" } },
      {
        id: "3",
        type: "imageGeneration",
        position: { x: 750, y: 200 },
        data: { model: "google/gemini-2.5-flash-image", aspectRatio: "16:9" },
      },
      { id: "4", type: "end", position: { x: 1100, y: 200 }, data: {} },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
    ],
  },
  {
    id: "conditional-flow",
    name: "Conditional Flow",
    description: "Workflow with branching logic based on conditions",
    nodes: [
      { id: "1", type: "start", position: { x: 50, y: 350 }, data: {} },
      {
        id: "2",
        type: "prompt",
        position: { x: 350, y: 350 },
        data: { content: "Analyze the sentiment of: $input1" },
      },
      {
        id: "3",
        type: "textModel",
        position: { x: 700, y: 350 },
        data: { model: "openai/gpt-5-mini", temperature: 0.3, maxTokens: 100 },
      },
      {
        id: "4",
        type: "conditional",
        position: { x: 1050, y: 350 },
        data: { condition: "input1.toLowerCase().includes('positive')" },
      },
      {
        id: "5",
        type: "prompt",
        position: { x: 1350, y: 150 },
        data: { content: "Generate an enthusiastic response for positive feedback" },
      },
      {
        id: "7",
        type: "textModel",
        position: { x: 1700, y: 150 },
        data: { model: "openai/gpt-5-mini", temperature: 0.7, maxTokens: 200 },
      },
      {
        id: "6",
        type: "prompt",
        position: { x: 1350, y: 550 },
        data: { content: "Generate an empathetic response for negative feedback" },
      },
      {
        id: "8",
        type: "textModel",
        position: { x: 1700, y: 550 },
        data: { model: "openai/gpt-5-mini", temperature: 0.7, maxTokens: 200 },
      },
      { id: "9", type: "end", position: { x: 2050, y: 350 }, data: {} },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
      { id: "e4-5", source: "4", target: "5", sourceHandle: "true" },
      { id: "e4-6", source: "4", target: "6", sourceHandle: "false" },
      { id: "e5-7", source: "5", target: "7" },
      { id: "e6-8", source: "6", target: "8" },
      { id: "e7-9", source: "7", target: "9" },
      { id: "e8-9", source: "8", target: "9" },
    ],
  },
  {
    id: "http-api",
    name: "HTTP API Call",
    description: "Fetch data from an API and process it",
    nodes: [
      { id: "1", type: "start", position: { x: 100, y: 200 }, data: {} },
      {
        id: "2",
        type: "httpRequest",
        position: { x: 400, y: 200 },
        data: { url: "https://api.example.com/data", method: "GET" },
      },
      {
        id: "3",
        type: "prompt",
        position: { x: 750, y: 200 },
        data: { content: "Summarize this data: $input1" },
      },
      {
        id: "4",
        type: "textModel",
        position: { x: 1100, y: 200 },
        data: { model: "openai/gpt-5-mini", temperature: 0.5, maxTokens: 500 },
      },
      { id: "5", type: "end", position: { x: 1450, y: 200 }, data: {} },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4" },
      { id: "e4-5", source: "4", target: "5" },
    ],
  },
] as const

export type WorkflowTemplate = (typeof WORKFLOW_TEMPLATES)[number]

// Local storage key
export const STORAGE_KEY = "ai-agent-builder-workflow"

// Version for workflow compatibility
export const WORKFLOW_VERSION = "1.0.0"
