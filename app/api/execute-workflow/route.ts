"use workflow"

import { generateText } from "ai"
import type { Node, Edge } from "@xyflow/react"
import type { StreamUpdate, ExecutionResult } from "@/lib/types"
import { createRun, addStep, updateStep, completeRun } from "@/lib/runs-store"
import {
  getMemory,
  saveMemory,
  getAllMemories,
  addMessage,
  getRecentMessages,
  getOrCreateConversation,
  formatMessagesForContext,
  formatMemoriesForContext,
} from "@/lib/memory"

const isWorkflowActive = true; // Declare the variable here

export const maxDuration = 60

function interpolateVariables(template: string, inputs: unknown[]): string {
  let result = template
  inputs.forEach((input, index) => {
    const placeholder = `$input${index + 1}`
    const value = typeof input === "string" ? input : JSON.stringify(input)
    result = result.replace(new RegExp(`\\${placeholder}`, "g"), value)
  })
  return result
}

function getNodeName(node: Node): string {
  const labels: Record<string, string> = {
    start: "Start",
    end: "End",
    textModel: "Text Model",
    prompt: "Prompt",
    conditional: "Condition",
    httpRequest: "HTTP Request",
    imageGeneration: "Image Generation",
    javascript: "JavaScript",
    audio: "Audio",
    embeddingModel: "Embedding",
    tool: "Tool",
    structuredOutput: "Structured Output",
    memory: "Memory",
  }
  return labels[node.type || ""] || node.type || "Unknown"
}

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (update: StreamUpdate & { runId?: string }) => {
        controller.enqueue(encoder.encode(JSON.stringify(update) + "\n"))
      }

      let currentRun: ReturnType<typeof createRun> | null = null

      try {
        const { nodes, edges }: { nodes: Node[]; edges: Edge[] } = await req.json()

        // Create run with workflow snapshot
        currentRun = createRun({ nodes, edges })
        sendUpdate({ type: "run_started" as any, runId: currentRun.id })

        const nodeMap = new Map(nodes.map((node) => [node.id, node]))
        const results = new Map<string, unknown>()
        const executionLog: ExecutionResult[] = []

        const incomingEdges = new Set(edges.map((e) => e.target))
        const entryNodes = nodes.filter((node) => !incomingEdges.has(node.id))

        const executeNode = async (nodeId: string): Promise<unknown> => {
          "use step"

          if (results.has(nodeId)) {
            return results.get(nodeId)
          }

          const node = nodeMap.get(nodeId)
          if (!node) {
            throw new Error(`Node ${nodeId} not found`)
          }

          const inputEdges = edges
            .filter((e) => e.target === nodeId)
            .sort((a, b) => {
              const nodeA = nodeMap.get(a.source)
              const nodeB = nodeMap.get(b.source)
              return (nodeA?.position.x || 0) - (nodeB?.position.x || 0)
            })

          let hasValidInput = inputEdges.length === 0

          for (const edge of inputEdges) {
            const sourceNode = nodeMap.get(edge.source)

            if (sourceNode?.type === "conditional") {
              if (results.has(edge.source)) {
                const conditionResult = results.get(edge.source)
                const expectedHandle = conditionResult ? "true" : "false"
                if (!edge.sourceHandle || edge.sourceHandle === expectedHandle) {
                  hasValidInput = true
                  break
                }
              }
            } else {
              const sourceResult = await executeNode(edge.source)
              if (sourceResult !== null) {
                hasValidInput = true
                break
              }
            }
          }

          if (!hasValidInput) {
            results.set(nodeId, null)
            return null
          }

          const stepStartTime = new Date().toISOString()
          if (currentRun) {
            addStep(currentRun.id, {
              nodeId,
              nodeType: node.type || "unknown",
              nodeName: getNodeName(node),
              status: "running",
              startedAt: stepStartTime,
            })
          }

          sendUpdate({
            type: "node_start",
            nodeId,
            nodeType: node.type,
            runId: currentRun?.id,
          })

          const inputs: unknown[] = []
          for (const edge of inputEdges) {
            const sourceNode = nodeMap.get(edge.source)
            let shouldIncludeInput = true

            if (sourceNode?.type === "conditional" && results.has(edge.source)) {
              const conditionResult = results.get(edge.source)
              const expectedHandle = conditionResult ? "true" : "false"
              if (edge.sourceHandle && edge.sourceHandle !== expectedHandle) {
                shouldIncludeInput = false
              }
            }

            if (shouldIncludeInput) {
              const inputResult = await executeNode(edge.source)
              if (inputResult !== null) {
                inputs.push(inputResult)
              }
            }
          }

          if (inputEdges.length > 0 && inputs.length === 0) {
            results.set(nodeId, null)
            return null
          }

          let output: unknown

          try {
            switch (node.type) {
              case "start":
                output = "Workflow started"
                break

              case "end":
                output = inputs.length > 0 ? inputs[0] : null
                break

              case "conditional": {
                const conditionCode = node.data.condition || "true"
                try {
                  const func = new Function(
                    "inputs",
                    `const input1 = inputs[0]; const input2 = inputs[1]; const input3 = inputs[2]; return ${conditionCode};`,
                  )
                  output = Boolean(func(inputs))
                } catch (condError) {
                  throw new Error(`Conditional evaluation error: ${(condError as Error).message}`)
                }
                break
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
                output = await response.json()
                break
              }

              case "prompt": {
                const content = node.data.content || ""
                output = inputs.length > 0 ? interpolateVariables(content, inputs) : content
                break
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
                output = textResult.text
                break
              }

              case "imageGeneration": {
                const imagePrompt = inputs.length > 0 ? String(inputs[0]) : ""
                const imageModel = node.data.model || "google/gemini-2.5-flash-image"

                if (!imagePrompt || imagePrompt.trim() === "") {
                  throw new Error("Image generation requires a prompt")
                }

                const images: string[] = []

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
                      images.push(
                        base64Data.startsWith("data:") ? base64Data : `data:${file.mediaType};base64,${base64Data}`,
                      )
                    }
                  }
                }

                if (images.length === 0) {
                  throw new Error("No image was generated. Try a different prompt.")
                }

                output = images[0]
                break
              }

              case "javascript": {
                const jsCode = node.data.code || ""
                try {
                  const func = new Function(
                    "inputs",
                    "args",
                    `const input1 = inputs[0]; const input2 = inputs[1]; const input3 = inputs[2]; const input4 = inputs[3]; const input5 = inputs[4]; ${jsCode}`,
                  )
                  output = await func(inputs, {})
                } catch (jsError) {
                  throw new Error(`JavaScript execution error: ${(jsError as Error).message}`)
                }
                break
              }

              case "audio":
                output = {
                  audioUrl: "Audio generation placeholder",
                  text: inputs.length > 0 ? String(inputs[0]) : "",
                  model: node.data.model,
                  voice: node.data.voice,
                }
                break

              case "embeddingModel":
                output = { embedding: "Embedding generation not implemented in demo" }
                break

              case "structuredOutput":
                output = { message: "Structured output not implemented in demo" }
                break

              case "tool": {
                if (node.data.code) {
                  try {
                    const func = new Function(
                      "inputs",
                      "args",
                      `const input1 = inputs[0]; const input2 = inputs[1]; const input3 = inputs[2]; ${node.data.code}`,
                    )
                    output = await func(inputs, {})
                  } catch (toolError) {
                    throw new Error(`Tool execution error: ${(toolError as Error).message}`)
                  }
                } else {
                  output = { message: "Tool has no implementation code" }
                }
                break
              }

              case "memory": {
                const operation = node.data.operation || "load"
                const sessionId = node.data.sessionId || "default"
                const key = node.data.key || ""
                const memoryType = node.data.memoryType || "fact"
                const messageRole = node.data.messageRole || "user"
                const limit = node.data.limit || 10

                switch (operation) {
                  case "load": {
                    const memory = await getMemory(sessionId, key)
                    output = memory ? memory.value : null
                    break
                  }
                  case "save": {
                    const valueToSave = inputs.length > 0 ? String(inputs[0]) : ""
                    if (key && valueToSave) {
                      const savedMemory = await saveMemory(sessionId, key, valueToSave, memoryType)
                      output = { saved: true, key, value: savedMemory.value }
                    } else {
                      output = { saved: false, error: "Missing key or value" }
                    }
                    break
                  }
                  case "loadAll": {
                    const memories = await getAllMemories(sessionId)
                    output = formatMemoriesForContext(memories)
                    break
                  }
                  case "addMessage": {
                    const conversation = await getOrCreateConversation(sessionId)
                    const content = inputs.length > 0 ? String(inputs[0]) : ""
                    if (content) {
                      const message = await addMessage(conversation.id, messageRole, content)
                      output = { added: true, messageId: message.id }
                    } else {
                      output = { added: false, error: "Missing content" }
                    }
                    break
                  }
                  case "getMessages": {
                    const messages = await getRecentMessages(sessionId, limit)
                    output = formatMessagesForContext(messages)
                    break
                  }
                  default:
                    output = { error: "Unknown memory operation" }
                }
                break
              }

              default:
                output = null
            }

            results.set(nodeId, output)
            executionLog.push({ nodeId, type: node.type || "unknown", output })

            const stepEndTime = new Date().toISOString()
            if (currentRun) {
              updateStep(currentRun.id, nodeId, {
                status: "completed",
                completedAt: stepEndTime,
                duration: new Date(stepEndTime).getTime() - new Date(stepStartTime).getTime(),
                input: inputs.length > 0 ? inputs : undefined,
                output,
              })
            }

            sendUpdate({
              type: "node_complete",
              nodeId,
              nodeType: node.type,
              output,
              runId: currentRun?.id,
            })

            return output
          } catch (error) {
            const errorMessage = (error as Error).message || "Unknown error"
            executionLog.push({ nodeId, type: node.type || "unknown", output: null, error: errorMessage })

            if (currentRun) {
              updateStep(currentRun.id, nodeId, {
                status: "error",
                completedAt: new Date().toISOString(),
                error: errorMessage,
              })
            }

            sendUpdate({
              type: "node_error",
              nodeId,
              nodeType: node.type,
              error: errorMessage,
              runId: currentRun?.id,
            })

            throw error
          }
        }

        for (const entryNode of entryNodes) {
          await executeNode(entryNode.id)

          const processDownstream = async (nodeId: string) => {
            const outgoingEdges = edges.filter((e) => e.source === nodeId)
            for (const edge of outgoingEdges) {
              await executeNode(edge.target)
              await processDownstream(edge.target)
            }
          }
          await processDownstream(entryNode.id)
        }

        if (currentRun) {
          completeRun(currentRun.id, "completed")
        }

        sendUpdate({ type: "complete", executionLog, runId: currentRun?.id })
        controller.close()
      } catch (error) {
        if (currentRun) {
          completeRun(currentRun.id, "failed")
        }

        sendUpdate({ type: "error", error: (error as Error).message || "Execution failed", runId: currentRun?.id })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  })
}
