import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
test('registers through public sidebar and header slots and releases every effect', () => {
  const registrations = [], effects = [], removed = []
  let plugin
  const style = { remove: () => removed.push('style') }
  const context = { window: { __ModuleLoader__: { load: descriptor => { plugin = descriptor.factory(() => ({})) } } }, document: { createElement: () => style, head: { append: value => assert.equal(value, style) } } }
  vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), context)
  const ctx = {
    effect: start => effects.push(start()),
    locale: { register: () => () => removed.push('locale'), bind: () => key => key },
    sidebarRightTabs: { register: def => { assert.equal(def.kind, 'airi-resources'); return () => removed.push('tab') } },
    slots: {
      inject: (name, callback) => { const release = callback(); return release },
      register: (definition, component) => { registrations.push(definition); assert.equal(typeof component, 'function'); return () => removed.push(definition.name) },
    },
  }
  plugin.apply(ctx)
  assert.deepEqual(registrations.map(value => value.name), ['sidebar.right.pane.tab', 'conversation.session.header.utilities'])
  for (const dispose of effects.reverse()) dispose()
  assert.equal(removed.length, 5)
})
