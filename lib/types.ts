import type { Node, Edge } from "@xyflow/react"

// Node types
export type NodeType =
  | "start"
  | "end"
  | "prompt"
  | "textModel"
  | "imageGeneration"
  | "conditional"
  | "javascript"
  | "httpRequest"
  | "embeddingModel"
  | "tool"
  | "audio"
  | "structuredOutput"
  | "memory"
  // Design Intelligence nodes
  | "urlAnalyzer"
  | "imageAnalyzer"
  | "designRetriever"
  | "excelParser"
  | "designStore"

// Node data types
export interface BaseNodeData {
  label?: string
  status?: NodeStatus
  output?: unknown
  isExpanded?: boolean
  onUpdate?: (data: unknown) => void
}

export interface StartNodeData extends BaseNodeData {}

export interface EndNodeData extends BaseNodeData {}

export interface PromptNodeData extends BaseNodeData {
  content?: string
}

export interface TextModelNodeData extends BaseNodeData {
  model?: string
  temperature?: number
  maxTokens?: number
  structuredOutput?: boolean
  schema?: string
  schemaName?: string
}

export interface ImageGenerationNodeData extends BaseNodeData {
  model?: string
  aspectRatio?: string
  outputFormat?: string
}

export interface ConditionalNodeData extends BaseNodeData {
  condition?: string
}

export interface JavaScriptNodeData extends BaseNodeData {
  code?: string
}

export interface HttpRequestNodeData extends BaseNodeData {
  url?: string
  method?: string
  headers?: string
  body?: string
}

export interface EmbeddingModelNodeData extends BaseNodeData {
  model?: string
  dimensions?: number
}

export interface ToolNodeData extends BaseNodeData {
  name?: string
  description?: string
  code?: string
  implementation?: string
}

export interface AudioNodeData extends BaseNodeData {
  model?: string
  voice?: string
  speed?: number
}

export interface StructuredOutputNodeData extends BaseNodeData {
  schemaName?: string
  schema?: string
  mode?: string
}

export interface MemoryNodeData extends BaseNodeData {
  operation?: "load" | "save" | "loadAll" | "addMessage" | "getMessages"
  sessionId?: string
  key?: string
  memoryType?: "fact" | "preference" | "entity" | "summary"
  messageRole?: "user" | "assistant" | "system"
  limit?: number
}

// Design Intelligence Node Data Types
export interface UrlAnalyzerNodeData extends BaseNodeData {
  url?: string
  analysisDepth?: "basic" | "detailed" | "comprehensive"
  extractImages?: boolean
  industry?: string
}

export interface ImageAnalyzerNodeData extends BaseNodeData {
  imageUrl?: string
  analysisType?: "colors" | "typography" | "layout" | "full"
  model?: string
  extractColorPalette?: boolean
  extractTypography?: boolean
  extractPatterns?: boolean
}

export interface DesignRetrieverNodeData extends BaseNodeData {
  query?: string
  industry?: string
  style?: string
  minQuality?: number
  limit?: number
  retrievePatterns?: boolean
  retrieveColors?: boolean
  retrieveTypography?: boolean
  retrieveLayouts?: boolean
}

export interface ExcelParserNodeData extends BaseNodeData {
  fileUrl?: string
  sheetName?: string
  urlColumn?: string
  categoryColumn?: string
  industryColumn?: string
  notesColumn?: string
  skipRows?: number
  columnMappings?: Record<string, string>
  parsedCount?: number
}

export interface DesignStoreNodeData extends BaseNodeData {
  operation?: "save_reference" | "save_pattern" | "save_system" | "update"
  generateEmbedding?: boolean
  industry?: string
  styleCategory?: string
  tags?: string
  qualityScore?: number
  autoCategorie?: boolean
}

// Workflow types
export interface Workflow {
  nodes: Node[]
  edges: Edge[]
  version?: string
  createdAt?: string
  updatedAt?: string
}

// Execution types
export interface ExecutionResult {
  nodeId: string
  type: string
  output: unknown
  error?: string
}

export interface StreamUpdate {
  type: "node_start" | "node_complete" | "node_error" | "complete" | "error"
  nodeId?: string
  nodeType?: string
  output?: unknown
  error?: string
  executionLog?: ExecutionResult[]
}

// Run types for observability
export interface RunStep {
  nodeId: string
  nodeType: string
  nodeName?: string
  status: "pending" | "running" | "completed" | "error"
  startedAt?: string
  completedAt?: string
  duration?: number
  input?: unknown
  output?: unknown
  error?: string
}

export interface Run {
  id: string
  status: "running" | "completed" | "failed"
  startedAt: string
  completedAt?: string
  duration?: number
  steps: RunStep[]
  workflowSnapshot?: {
    nodes: Node[]
    edges: Edge[]
  }
}

export type NodeStatus = "idle" | "running" | "completed" | "error"
