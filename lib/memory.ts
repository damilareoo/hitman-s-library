import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Conversation {
  id: string
  session_id: string
  user_id?: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: "user" | "assistant" | "system"
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Memory {
  id: string
  session_id: string
  user_id?: string
  key: string
  value: string
  type: "fact" | "preference" | "entity" | "summary"
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Conversation functions
export async function createConversation(sessionId: string, userId?: string): Promise<Conversation> {
  const result = await sql`
    INSERT INTO conversations (session_id, user_id)
    VALUES (${sessionId}, ${userId || null})
    RETURNING *
  `
  return result[0] as Conversation
}

export async function getConversation(sessionId: string): Promise<Conversation | null> {
  const result = await sql`
    SELECT * FROM conversations
    WHERE session_id = ${sessionId}
    ORDER BY created_at DESC
    LIMIT 1
  `
  return (result[0] as Conversation) || null
}

export async function getOrCreateConversation(sessionId: string, userId?: string): Promise<Conversation> {
  const existing = await getConversation(sessionId)
  if (existing) return existing
  return createConversation(sessionId, userId)
}

// Message functions
export async function addMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata?: Record<string, unknown>,
): Promise<Message> {
  const result = await sql`
    INSERT INTO messages (conversation_id, role, content, metadata)
    VALUES (${conversationId}, ${role}, ${content}, ${JSON.stringify(metadata || {})})
    RETURNING *
  `
  return result[0] as Message
}

export async function getMessages(conversationId: string, limit = 50): Promise<Message[]> {
  const result = await sql`
    SELECT * FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `
  return result as Message[]
}

export async function getRecentMessages(sessionId: string, limit = 10): Promise<Message[]> {
  const result = await sql`
    SELECT m.* FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.session_id = ${sessionId}
    ORDER BY m.created_at DESC
    LIMIT ${limit}
  `
  return (result as Message[]).reverse()
}

// Memory functions
export async function saveMemory(
  sessionId: string,
  key: string,
  value: string,
  type: "fact" | "preference" | "entity" | "summary" = "fact",
  userId?: string,
): Promise<Memory> {
  // Upsert - update if exists, insert if not
  const result = await sql`
    INSERT INTO memories (session_id, user_id, key, value, type)
    VALUES (${sessionId}, ${userId || null}, ${key}, ${value}, ${type})
    ON CONFLICT (session_id, key) 
    DO UPDATE SET value = ${value}, type = ${type}, updated_at = NOW()
    RETURNING *
  `
  return result[0] as Memory
}

export async function getMemory(sessionId: string, key: string): Promise<Memory | null> {
  const result = await sql`
    SELECT * FROM memories
    WHERE session_id = ${sessionId} AND key = ${key}
    LIMIT 1
  `
  return (result[0] as Memory) || null
}

export async function getAllMemories(sessionId: string): Promise<Memory[]> {
  const result = await sql`
    SELECT * FROM memories
    WHERE session_id = ${sessionId}
    ORDER BY updated_at DESC
  `
  return result as Memory[]
}

export async function getMemoriesByType(
  sessionId: string,
  type: "fact" | "preference" | "entity" | "summary",
): Promise<Memory[]> {
  const result = await sql`
    SELECT * FROM memories
    WHERE session_id = ${sessionId} AND type = ${type}
    ORDER BY updated_at DESC
  `
  return result as Memory[]
}

export async function deleteMemory(sessionId: string, key: string): Promise<void> {
  await sql`
    DELETE FROM memories
    WHERE session_id = ${sessionId} AND key = ${key}
  `
}

export async function clearSessionMemories(sessionId: string): Promise<void> {
  await sql`DELETE FROM memories WHERE session_id = ${sessionId}`
  await sql`DELETE FROM conversations WHERE session_id = ${sessionId}`
}

// Format messages for LLM context
export function formatMessagesForContext(messages: Message[]): string {
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
}

// Format memories for LLM context
export function formatMemoriesForContext(memories: Memory[]): string {
  if (memories.length === 0) return ""

  const grouped = memories.reduce(
    (acc, m) => {
      if (!acc[m.type]) acc[m.type] = []
      acc[m.type].push(`- ${m.key}: ${m.value}`)
      return acc
    },
    {} as Record<string, string[]>,
  )

  return Object.entries(grouped)
    .map(([type, items]) => `[${type.toUpperCase()}]\n${items.join("\n")}`)
    .join("\n\n")
}
