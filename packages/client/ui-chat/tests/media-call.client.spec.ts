// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { ToolResultNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { latestMediaCall } from '../src/client/chat/ChatView.tsx'
import { conversationMedia } from '../src/client/details/DetailsPanel.tsx'
import { mediaCalls } from '../src/client/details/tool-node-reader.ts'
import { chatSnapshotFixture } from './chat-snapshot-fixture.client.ts'

describe('latestMediaCall', () => {
  it('selects the newest settled Tool result that contains an image', () => {
    const image = {
      attachmentId: AttachmentId(`sha256:${'a'.repeat(64)}`),
      mediaType: 'image/png' as const,
      bytes: 68,
      width: 640,
      height: 320,
      name: 'offer.png',
    }
    const media: ToolResultNode = {
      kind: 'tool-result', seq: 3, time: 3, callId: 'airi-get',
      call: { name: 'airi_get', argsRaw: '{}' }, callTime: 2,
      content: [{ type: 'image', attachment: image }], isError: false, subCalls: [],
    }
    const text: ToolResultNode = {
      ...media, seq: 4, time: 4, callId: 'later-text',
      content: [{ type: 'text', text: 'done' }],
    }
    expect(latestMediaCall(chatSnapshotFixture({ nodes: [media, text] }))).toBe(media)
  })

  it('selects an original resource even when no thumbnail was returned', () => {
    const resource: ToolResultNode = {
      kind: 'tool-result', seq: 5, time: 5, callId: 'pdf', subCalls: [], isError: false,
      call: { name: 'airi_get', argsRaw: '{}' }, callTime: 4,
      content: [{ type: 'text', text: JSON.stringify({
        original: { url: '/airi-resource?signature=x', media_type: 'application/pdf', name: 'offer.pdf' },
      }) }],
    }

    expect(latestMediaCall(chatSnapshotFixture({ nodes: [resource] }))).toBe(resource)
  })

  it('collects every media result in conversation order', () => {
    const first: ToolResultNode = {
      kind: 'tool-result', seq: 2, time: 2, callId: 'first', subCalls: [], isError: false,
      call: { name: 'airi_get', argsRaw: '{}' }, callTime: 1,
      content: [{ type: 'text', text: JSON.stringify({
        original: { url: '/airi-resource?signature=one', media_type: 'application/pdf', name: 'one.pdf' },
      }) }],
    }
    const second: ToolResultNode = {
      ...first, seq: 4, time: 4, callId: 'second',
      content: [{ type: 'text', text: JSON.stringify({
        original: { url: '/airi-resource?signature=two', media_type: 'image/jpeg', name: 'two.jpg' },
      }) }],
    }
    const repeated = { ...first, seq: 6, time: 6, callId: 'repeated' }

    const snapshot = chatSnapshotFixture({ nodes: [second, repeated, first] })
    expect(mediaCalls(snapshot)).toEqual([first, second, repeated])
    expect(conversationMedia(snapshot).originals.map(item => item.name)).toEqual(['one.pdf', 'two.jpg'])
  })
})
