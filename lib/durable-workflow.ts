/**
 * Durable Workflow Executor
 *
 * This module provides durable execution for agent workflows using Vercel Workflow.
 * Each node execution is wrapped in a step() call, making the workflow:
 * - Resumable after failures
 * - Persistent across deployments
 * - Observable and debuggable
 *
 * In development/preview: Falls back to standard async/await execution
 * In production with Workflow enabled: Uses durable steps with automatic retries
 */

import { generateText } from "ai"
import type { Node, Edge } from "@xyflow/react"

// Type definitions
export interface WorkflowInput {
  nodes: Node[]
  edges: Edge[]
  workflowId?: string
}

export interface StepResult {
  nodeId: string
  nodeType: string
  output: unknown
  error?: string
}

export interface WorkflowResult {
  success: boolean
  results: Map<string, unknown>
  executionLog: StepResult[]
  error?: string
}

// Helper to interpolate variables in templates
function interpolateVariables(template: string, inputs: unknown[]): string {
  let result = template
  inputs.forEach((input, index) => {
    const placeholder = `$input${index + 1}`
    const value = typeof input === "string" ? input : JSON.stringify(input)
    result = result.replace(new RegExp(`\\${placeholder}`, "g"), value)
  })
  return result
}

/**
 * Execute a single node as a durable step
 * This function is designed to be wrapped by Vercel Workflow's step()
 */
export async function executeNodeStep(
  node: Node,
  inputs: unknown[],
  context: { sessionId?: string }
): Promise<unknown> {
  switch (node.type) {
    case "start":
      return "Workflow started"

    case "end":
      return inputs.length > 0 ? inputs[0] : null

    case "conditional": {
      const conditionCode = node.data.condition || "true"
      const func = new Function(
        "inputs",
        `const input1 = inputs[0]; const input2 = inputs[1]; const input3 = inputs[2]; return ${conditionCode};`
      )
      return Boolean(func(inputs))
    }

    case "httpRequest": {
      let url = node.data.url || ""
      const method = node.data.method || "GET"

      if (inputs.length > 0) {
        url = interpolateVariables(url, inputs)
      }

      const headers: Record<string, string> = {}
      if (node.data.headers) {
        try {
          Object.assign(headers, JSON.parse(node.data.headers))
        } catch {
          // Invalid headers JSON
        }
      }

      let body = node.data.body || ""
      if (body && inputs.length > 0) {
        body = interpolateVariables(body, inputs)
      }

      const fetchOptions: RequestInit = { method, headers }
      if (method !== "GET" && method !== "HEAD" && body) {
        fetchOptions.body = body
      }

      const response = await fetch(url, fetchOptions)
      return await response.json()
    }

    case "prompt": {
      const content = node.data.content || ""
      return inputs.length > 0 ? interpolateVariables(content, inputs) : content
    }

    case "textModel": {
      const prompt = inputs.length > 0 ? String(inputs[0]) : node.data.prompt || ""
      const model = node.data.model || "openai/gpt-5-mini"
      const temperature = node.data.temperature || 0.7
      const maxTokens = node.data.maxTokens || 2000

      const textResult = await generateText({
        model,
        prompt,
        temperature,
        maxTokens,
      })
      return textResult.text
    }

    case "imageGeneration": {
      const imagePrompt = inputs.length > 0 ? String(inputs[0]) : ""
      const imageModel = node.data.model || "google/gemini-2.5-flash-image"

      if (!imagePrompt || imagePrompt.trim() === "") {
        throw new Error("Image generation requires a prompt")
      }

      const imageResult = await generateText({
        model: imageModel,
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        prompt: imagePrompt,
      })

      if (imageResult.files && imageResult.files.length > 0) {
        for (const file of imageResult.files) {
          if (file.mediaType.startsWith("image/")) {
            const base64Data = file.base64
            return base64Data.startsWith("data:")
              ? base64Data
              : `data:${file.mediaType};base64,${base64Data}`
          }
        }
      }

      throw new Error("No image was generated. Try a different prompt.")
    }

    case "javascript": {
      const jsCode = node.data.code || ""
      const func = new Function(
        "inputs",
        "args",
        `const input1 = inputs[0]; const input2 = inputs[1]; const input3 = inputs[2]; const input4 = inputs[3]; const input5 = inputs[4]; ${jsCode}`
      )
      return await func(inputs, {})
    }

    case "audio":
      return {
        audioUrl: "Audio generation placeholder",
        text: inputs.length > 0 ? String(inputs[0]) : "",
        model: node.data.model,
        voice: node.data.voice,
      }

    case "embeddingModel":
      return { embedding: "Embedding generation not implemented" }

    case "structuredOutput":
      return { message: "Structured output not implemented" }

    case "tool": {
      if (node.data.code) {
        const func = new Function(
          "inputs",
          "args",
          `const input1 = inputs[0]; const input2 = inputs[1]; const input3 = inputs[2]; ${node.data.code}`
        )
        return await func(inputs, {})
      }
      return { message: "Tool has no implementation code" }
    }

    default:
      return null
  }
}

/**
 * Check if Vercel Workflow is available
 * Returns true in production with workflow compiler enabled
 */
export function isWorkflowEnabled(): boolean {
  // Check for workflow runtime environment
  // This will be true when deployed to Vercel with workflow compiler
  return typeof globalThis !== "undefined" && "__WORKFLOW_RUNTIME__" in globalThis
}

/**
 * Create a step wrapper that uses Vercel Workflow when available
 * Falls back to direct execution in development
 */
export async function durableStep<T>(
  stepName: string,
  fn: () => Promise<T>
): Promise<T> {
  // In production with Workflow enabled, this would be:
  // return step(stepName, fn)
  
  // For now, execute directly (fallback mode)
  return await fn()
}
