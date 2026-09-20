import type { ChatNode } from '../contract/chat-nodes.ts'
import type { OriginalResource } from '../contract/slots.ts'
import type { ChatNodeStore, ChatSnapshot, ToolCallBlock, ToolResultNode } from '../contract/snapshot.ts'

function toolNode(node: ReturnType<ChatNodeStore['get']>): ChatNode<'tool-call'> | undefined {
  return node?.kind === 'tool-call' ? node as ChatNode<'tool-call'> : undefined
}

/**
 * Find any root or nested Tool lifecycle through the internal Node store.
 * @param snapshot - current Conversation snapshot.
 * @param callId - root or nested call identity.
 * @returns current Tool lifecycle when materialized in the loaded window.
 */
export function findToolCall(snapshot: ChatSnapshot, callId: string): ToolCallBlock | undefined {
  const visit = (block: ToolCallBlock): ToolCallBlock | undefined => {
    if (block.callId === callId) return block
    for (const child of block.subCalls) {
      const found = visit(child)
      if (found !== undefined) return found
    }
    return undefined
  }
  for (const node of snapshot.nodes.values()) {
    const root = toolNode(node)?.data.root
    if (root === undefined) continue
    const found = visit(root)
    if (found !== undefined) return found
  }
  return undefined
}

/** Read the trusted same-origin original descriptor embedded in a Tool text result. */
export function originalResources(block: ToolCallBlock): readonly OriginalResource[] {
  if (!('kind' in block)) return []
  for (const item of block.content) {
    if (item.type !== 'text') continue
    try {
      const original = (JSON.parse(item.text) as { original?: Record<string, unknown> }).original
      if (original === undefined) continue
      const url = typeof original.url === 'string' ? original.url : ''
      const mediaType = typeof original.media_type === 'string' ? original.media_type : ''
      const name = typeof original.name === 'string' ? original.name : ''
      const parsed = new URL(url, window.location.origin)
      if (parsed.origin !== window.location.origin || parsed.pathname !== '/airi-resource') continue
      if (mediaType === '' || name === '') continue
      const sourceUrl = typeof original.source_url === 'string' ? original.source_url : ''
      const source = sourceUrl === '' ? undefined : new URL(sourceUrl)
      if (source !== undefined && source.protocol !== 'http:' && source.protocol !== 'https:') continue
      return [{
        url: `${parsed.pathname}${parsed.search}`,
        mediaType,
        name,
        ...(source === undefined ? {} : { sourceUrl: source.href }),
      }]
    } catch {
      // Generic Tool text may be prose rather than JSON.
    }
  }
  return []
}

/** Settled Tool results containing media, in conversation order. */
export function mediaCalls(snapshot: ChatSnapshot): readonly ToolResultNode[] {
  const found: ToolResultNode[] = []
  const visit = (block: ToolCallBlock): void => {
    if ('kind' in block && (
      block.content.some(item => item.type === 'image') || originalResources(block).length > 0
    )) found.push(block)
    for (const child of block.subCalls) visit(child)
  }
  for (const key of snapshot.order) {
    const node = snapshot.nodes.get(key)
    if (node?.kind === 'tool-call') visit((node.data as { readonly root: ToolCallBlock }).root)
  }
  return found.sort((left, right) => left.seq - right.seq)
}
