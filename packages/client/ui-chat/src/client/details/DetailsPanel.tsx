import { Fragment } from 'react'
import { CodeBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import type { DetailsSlotProps } from '../contract/slots.ts'
import type { ChatSnapshot, RunningToolCall, ToolCallBlock, ToolResultNode } from '../contract/snapshot.ts'
import { findToolCall, mediaCalls, originalResources } from './tool-node-reader.ts'
import css from './DetailsPanel.module.css'

export type DetailsPanelProps = DetailsSlotProps

/** The snapshot-owned block reference must remain stable across unrelated frames. */
interface CallMaterial {
  name: string
  argsRaw: string | null
  block: ToolCallBlock
}

function settledMaterial(node: ToolResultNode, callId: string): CallMaterial {
  return { name: node.call?.name ?? callId, argsRaw: node.call?.argsRaw ?? null, block: node }
}

function runningMaterial(call: RunningToolCall): CallMaterial {
  return { name: call.name, argsRaw: call.argsRaw, block: call }
}

function materialFor(s: ChatSnapshot, callId: string): CallMaterial | null {
  const found = findToolCall(s, callId)
  if (found === undefined) return null
  return 'kind' in found ? settledMaterial(found, callId) : runningMaterial(found)
}

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

/** Flatten a settled result for the no-ui-tool fallback. */
function rawResultText(block: ToolCallBlock): string {
  if (!('kind' in block)) return ''
  const parts = block.content.map(item => item.type === 'text' ? item.text : JSON.stringify(item, null, 2))
  if (parts.length === 0 && block.error !== undefined) parts.push(`${block.error.name}: ${block.error.code}`)
  return parts.join('\n')
}

function resultImages(block: ToolCallBlock) {
  if (!('kind' in block)) return []
  return block.content.flatMap(item => item.type === 'image' ? [{ attachment: item.attachment }] : [])
}

export function conversationMedia(snapshot: ChatSnapshot) {
  const originals = new Map<string, ReturnType<typeof originalResources>[number]>()
  const images = new Map<string, ReturnType<typeof resultImages>[number]>()
  for (const block of mediaCalls(snapshot)) {
    const blockOriginals = originalResources(block)
    if (blockOriginals.length > 0) {
      for (const item of blockOriginals) originals.set(item.url, item)
      continue
    }
    for (const item of resultImages(block)) images.set(item.attachment.attachmentId, item)
  }
  return { originals: [...originals.values()], images: [...images.values()] }
}

export function DetailsPanel({ useChat, useSessions, sessionId, useStore, renderSlot, closeDetails, loadImage, t }: DetailsPanelProps) {
  const selection = useStore(s => s.selection)
  // Session workspace root: a card model resolves omitted or relative
  // tool paths against it without reading Session services.
  const sessionCwd = useSessions(list => list.byId[sessionId]?.cwd)
  const callId = selection?.callId
  const snapshot = useChat(s => s)
  const material = callId === undefined ? null : materialFor(snapshot, callId)
  const allResources = selection?.scope === 'conversation-resources'
  const media = allResources
    ? conversationMedia(snapshot)
    : material === null
      ? { originals: [], images: [] }
      : (() => {
          const originals = originalResources(material.block)
          return { originals, images: originals.length > 0 ? [] : resultImages(material.block) }
        })()
  const resourceCount = media.originals.length + media.images.length
  return (
    <div className={css.root}>
      <div className={css.header}>
        <div className={css.title}>
          {resourceCount > 0 ? t('details.resources') : selection === null ? t('details.title') : material?.name ?? selection.toolName ?? t('details.title')}
        </div>
        <button
          type="button" className={css.close} aria-label={t('details.close')}
          onClick={() => { closeDetails() }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className={css.body}>
        {selection === null || callId === undefined
          ? <div className={css.empty}>{t('details.empty')}</div>
          : material === null
            ? <div className={css.empty}>{t('details.notInWindow')}</div>
            : (
              <>
                {resourceCount > 0 && (
                  <section className={css.section}>
                    <div className={css.sectionLabel}>{t('details.resourcesFound', { count: resourceCount })}</div>
                    {renderSlot('conversation.details.media', { ...media, loadImage, align: 'start' })}
                  </section>
                )}
                {!allResources && material.argsRaw !== null && (
                  <section className={css.section}>
                    <div className={css.sectionLabel}>{t('details.input')}</div>
                    <CodeBlock code={pretty(material.argsRaw)} lang="json" copyLabel={t('copy')} copiedLabel={t('copied')} />
                  </section>
                )}
                {!allResources && <section className={css.section}>
                  <div className={css.sectionLabel}>{t('details.output')}</div>
                  {/* Keyed by the selected call: the body owns per-call view
                      state (the terminal card's expand and copy), which React
                      would otherwise carry into the next selection because the
                      panel does not unmount between calls. */}
                  <Fragment key={callId}>
                    {renderSlot('conversation.details.tool', { block: material.block, cwd: sessionCwd }, {
                      fallback: 'kind' in material.block
                        ? (
                          <pre className={css.code} data-error={material.block.isError || undefined}>
                            {rawResultText(material.block)}
                          </pre>
                        )
                        : <div className={css.empty}>{t('details.running')}</div>,
                    })}
                  </Fragment>
                </section>}
              </>
            )}
      </div>
    </div>
  )
}
