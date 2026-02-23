"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react"
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react"
import type { OnNodesChange, OnEdgesChange, OnConnect } from "@xyflow/react"
import { DEFAULT_NODE_DATA, WORKFLOW_VERSION } from "@/lib/constants"
import type { NodeType, Workflow } from "@/lib/types"

interface UseWorkflowOptions {
  initialNodes?: Node[]
  initialEdges?: Edge[]
}

export function useWorkflow(options: UseWorkflowOptions = {}) {
  const [nodes, setNodes] = useState<Node[]>(options.initialNodes || [])
  const [edges, setEdges] = useState<Edge[]>(options.initialEdges || [])
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set())
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const nodeIdCounter = useRef(0)

  // Sync node ID counter with existing nodes
  useEffect(() => {
    const maxId = Math.max(...nodes.map((n) => Number.parseInt(n.id) || 0), 0)
    nodeIdCounter.current = maxId + 1
  }, [])

  const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [])

  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])

  const onConnect: OnConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [])

  const addNode = useCallback(
    (type: NodeType, position?: { x: number; y: number }) => {
      if (!reactFlowInstance && !position) return null

      const newId = `${Date.now()}-${nodeIdCounter.current++}`
      const nodePosition =
        position ||
        reactFlowInstance!.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })

      const newNode: Node = {
        id: newId,
        type,
        position: nodePosition,
        data: { ...DEFAULT_NODE_DATA[type] },
      }

      setNodes((nds) => [...nds, newNode])
      setNewNodeIds((prev) => new Set(prev).add(newId))

      return newId
    },
    [reactFlowInstance],
  )

  const updateNode = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)))
  }, [])

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
      if (expandedNodeId === nodeId) {
        setExpandedNodeId(null)
      }
    },
    [expandedNodeId],
  )

  const clearCanvas = useCallback(() => {
    setNodes([])
    setEdges([])
    setExpandedNodeId(null)
    setNewNodeIds(new Set())
    nodeIdCounter.current = 1
  }, [])

  const selectNode = useCallback((nodeId: string | null) => {
    setExpandedNodeId((prev) => (prev === nodeId ? null : nodeId))
    if (nodeId) {
      setNewNodeIds((prev) => {
        const next = new Set(prev)
        next.delete(nodeId)
        return next
      })
    }
  }, [])

  const exportWorkflow = useCallback((): Workflow => {
    return {
      nodes,
      edges,
      version: WORKFLOW_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }, [nodes, edges])

  const importWorkflow = useCallback((workflow: Workflow) => {
    if (workflow.nodes && workflow.edges) {
      setNodes(workflow.nodes)
      setEdges(workflow.edges)
      setExpandedNodeId(null)
      setNewNodeIds(new Set())

      const maxId = Math.max(
        ...workflow.nodes.map((n) => {
          const parts = n.id.split("-")
          return Number.parseInt(parts[parts.length - 1]) || 0
        }),
        0,
      )
      nodeIdCounter.current = maxId + 1
    }
  }, [])

  const fitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2 })
  }, [reactFlowInstance])

  return {
    // State
    nodes,
    edges,
    expandedNodeId,
    newNodeIds,
    reactFlowInstance,

    // Setters
    setNodes,
    setEdges,
    setReactFlowInstance,

    // Callbacks
    onNodesChange,
    onEdgesChange,
    onConnect,

    // Actions
    addNode,
    updateNode,
    deleteNode,
    clearCanvas,
    selectNode,
    exportWorkflow,
    importWorkflow,
    fitView,
  }
}
