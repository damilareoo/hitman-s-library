"use workflow"

/**
 * Durable Workflow Execution Endpoint
 *
 * This route uses Vercel Workflow for durable execution.
 * Each node is executed as a step(), providing:
 * - Automatic retries on failure
 * - State persistence across function timeouts
 * - Resumable execution after deployments
 */

import { executeNodeStep } from "@/lib/durable-workflow"
import type { Node, Edge } from "@xyflow/react"

export const maxDuration = 60 // 60 seconds max for durable workflows

interface WorkflowPayload {
  nodes: Node[]
  edges: Edge[]
  workflowId?: string
}

export async function POST(req: Request) {
  const payload: WorkflowPayload = await req.json()
  const { nodes, edges, workflowId } = payload

  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const results = new Map<string, unknown>()
  const executionLog: Array<{ nodeId: string; type: string; output: unknown; error?: string }> = []

  // Find entry nodes (nodes with no incoming edges)
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

    // Get input edges sorted by source position
    const inputEdges = edges
      .filter((e) => e.target === nodeId)
      .sort((a, b) => {
        const nodeA = nodeMap.get(a.source)
        const nodeB = nodeMap.get(b.source)
        return (nodeA?.position.x || 0) - (nodeB?.position.x || 0)
      })

    // Check if this node should execute based on conditional routing
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

    // Gather inputs from connected nodes
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

    // Execute the node as a durable step
    try {
      const output = await executeNodeStep(node, inputs, { sessionId: workflowId })
      results.set(nodeId, output)
      executionLog.push({ nodeId, type: node.type || "unknown", output })
      return output
    } catch (error) {
      const errorMessage = (error as Error).message || "Unknown error"
      executionLog.push({ nodeId, type: node.type || "unknown", output: null, error: errorMessage })
      throw error
    }
  }

  // Execute workflow starting from entry nodes
  try {
    for (const entryNode of entryNodes) {
      await executeNode(entryNode.id)

      // Process all downstream nodes
      const processDownstream = async (nodeId: string) => {
        const outgoingEdges = edges.filter((e) => e.source === nodeId)
        for (const edge of outgoingEdges) {
          await executeNode(edge.target)
          await processDownstream(edge.target)
        }
      }
      await processDownstream(entryNode.id)
    }

    return Response.json({
      success: true,
      executionLog,
      results: Object.fromEntries(results),
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: (error as Error).message,
        executionLog,
      },
      { status: 500 }
    )
  }
}
