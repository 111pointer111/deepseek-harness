import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resourcesFrom } from '../src/resources.mjs'
const origin = 'https://dsh.example'
const image = id => ({ type: 'image', attachment: { attachmentId: id, mediaType: 'image/jpeg', name: 'preview.jpg' } })
const resource = (ref, mediaType = 'image/heic') => ({ type: 'text', text: JSON.stringify({ resource_ref: ref, original: { url: `/airi-resource?resource_ref=${ref}`, media_type: mediaType, name: `${ref}.heic` } }) })
const result = content => ({ kind: 'tool-result', content, isError: false, subCalls: [] })
const snapshot = blocks => ({ order: blocks.map((_, i) => i), nodes: { get: key => ({ kind: 'tool-call', data: { root: blocks[key] } }) } })
test('pairs HEIC and video previews with their original and deduplicates repeated retrieval', () => {
  const resources = resourcesFrom(snapshot([
    result([resource('one'), image('jpeg-one')]), result([resource('two', 'video/mp4'), image('jpeg-two')]), result([resource('one'), image('jpeg-new')]),
  ]), origin)
  assert.equal(resources.length, 2)
  assert.equal(resources[0].preview.attachmentId, 'jpeg-new')
  assert.equal(resources[1].mediaType, 'video/mp4')
  assert.equal(resources[1].preview.attachmentId, 'jpeg-two')
})
test('retains thumbnail-only results and nested tool results', () => {
  const parent = { kind: 'tool-start', subCalls: [result([image('a')]), result([image('a')]), result([image('b')])] }
  assert.deepEqual(resourcesFrom(snapshot([parent]), origin).map(item => item.id), ['a', 'b'])
})
test('ignores external, executable, and non-resource URLs', () => {
  for (const url of ['https://evil.example/airi-resource', 'javascript:alert(1)', '/other-path']) {
    const content = [{ type: 'text', text: JSON.stringify({ original: { url, media_type: 'image/jpeg', name: 'bad.jpg' } }) }]
    assert.deepEqual(resourcesFrom(snapshot([result(content)]), origin), [])
  }
})
test('keeps sessions separate and tolerates text-only tools', () => {
  assert.equal(resourcesFrom(snapshot([result([resource('first')])]), origin).length, 1)
  assert.deepEqual(resourcesFrom(snapshot([result([{ type: 'text', text: 'ordinary prose' }])]), origin), [])
  assert.deepEqual(resourcesFrom(undefined, origin), [])
})
