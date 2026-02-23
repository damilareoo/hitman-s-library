import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 60

const workflowSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        "start",
        "end",
        "prompt",
        "textModel",
        "imageGeneration",
        "conditional",
        "javascript",
        "httpRequest",
        "embeddingModel",
        "tool",
        "audio",
        "structuredOutput",
      ]),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
      data: z.object({
        label: z.string().optional(),
        content: z.string().optional(),
        model: z.string().optional(),
        temperature: z.number().optional(),
        maxTokens: z.number().optional(),
        condition: z.string().optional(),
        code: z.string().optional(),
        url: z.string().optional(),
        method: z.string().optional(),
        body: z.string().optional(),
        aspectRatio: z.string().optional(),
        outputFormat: z.string().optional(),
        voice: z.string().optional(),
        speed: z.number().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        implementation: z.string().optional(),
        schemaName: z.string().optional(),
        schema: z.string().optional(),
        mode: z.string().optional(),
        dimensions: z.number().optional(),
      }),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().optional(),
      label: z.string().optional(),
    }),
  ),
})

const NODE_DESCRIPTIONS = `
Available node types and their data properties:

1. start - Workflow entry point (always include one)
   - data: { label: "Start" }

2. end - Workflow output (always include one at the end)
   - data: { label: "End" }

3. prompt - Text template that can reference previous outputs using $input1, $input2, etc.
   - data: { label: "Prompt Name", content: "Your prompt text here with $input1 for references" }

4. textModel - Generate text using an LLM
   - data: { label: "Model Name", model: "openai/gpt-5-mini", temperature: 0.7, maxTokens: 2000 }
   - model options: "openai/gpt-5", "openai/gpt-5-mini", "anthropic/claude-sonnet-4-20250514", "xai/grok-4"

5. imageGeneration - Generate images
   - data: { label: "Image Gen", model: "google/gemini-2.5-flash-lite", aspectRatio: "1:1", outputFormat: "png" }
   - model options: "google/gemini-2.5-flash-lite", "google/gemini-3-flash", "bfl/flux-2-pro", "bfl/flux-2-flex"

6. conditional - Branch based on JavaScript expression
   - data: { label: "Condition", condition: "input1.includes('positive')" }
   - Has two outputs: use sourceHandle "true" or "false" in edges

7. javascript - Execute custom JavaScript code
   - data: { label: "JS Code", code: "return input1.toUpperCase();" }

8. httpRequest - Make HTTP API calls
   - data: { label: "API Call", url: "https://api.example.com", method: "GET" }

9. embeddingModel - Convert text to vector embeddings
   - data: { label: "Embeddings", model: "openai/text-embedding-3-small", dimensions: 1536 }

10. tool - Custom function tool for AI
    - data: { label: "Tool", name: "myTool", description: "Tool description", implementation: "return result;" }

11. audio - Text-to-speech
    - data: { label: "Audio", model: "openai/tts-1", voice: "alloy", speed: 1.0 }

12. structuredOutput - Generate structured data with schema
    - data: { label: "Structured", schemaName: "Output", schema: "{ name: string }", mode: "json" }
`

export async function POST(req: Request) {
  try {
    const { prompt, existingNodes, existingEdges } = await req.json()

    const systemPrompt = `You are an AI workflow designer. Generate a workflow graph based on the user's description.

${NODE_DESCRIPTIONS}

IMPORTANT RULES:
1. Always start with a "start" node and end with an "end" node
2. Position nodes left-to-right with ~400px horizontal spacing and proper vertical spacing for branches
3. Start node should be around x: 100, y: 300
4. Generate unique IDs for each node (use format: "node-1", "node-2", etc.)
5. Connect nodes with edges - ensure all nodes are connected
6. Edge IDs should be like "edge-1", "edge-2", etc.
7. For conditional nodes, create edges with sourceHandle "true" or "false"
8. Use $input1, $input2 in prompts to reference outputs from connected nodes
9. Make the workflow practical and complete
10. Always include a label in the data object for each node

${
  existingNodes && existingNodes.length > 0
    ? `
CONTEXT: The user has an existing workflow. Either ADD to it or REPLACE it based on their request.
If adding, start node IDs from "node-${Date.now()}-" to avoid conflicts.
`
    : ""
}`

    const { object } = await generateObject({
      model: "anthropic/claude-sonnet-4-20250514",
      schema: workflowSchema,
      system: systemPrompt,
      prompt: `Create a workflow for: ${prompt}`,
    })

    const processedEdges = object.edges.map((edge) => {
      if (edge.sourceHandle === "true") {
        return { ...edge, label: "✓ TRUE", style: { stroke: "#22c55e" } }
      }
      if (edge.sourceHandle === "false") {
        return { ...edge, label: "✗ FALSE", style: { stroke: "#ef4444" } }
      }
      return edge
    })

    return Response.json({ nodes: object.nodes, edges: processedEdges })
  } catch (error) {
    console.error("Error generating workflow:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate workflow" },
      { status: 500 },
    )
  }
}
