/** Add an AIRI declaration and saved model options to a 0.2.1 profile, preserving its existing patch. */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const [runtime, home, settingsFile] = process.argv.slice(2)
if (!runtime || !home || !settingsFile) throw new Error('Usage: node migrate-profile.mjs <runtime-directory> <DSH_HOME> <legacy-settings-file>')
const patch = path.join(home, 'profiles/web/cordis.patch.yml')
const original = fs.readFileSync(patch, 'utf8')
const tools = path.join(home, '.agent-presets/airi-memory/tools')
for (const file of ['airi-appointment-shared.mjs', 'airi-memory-tools.mjs', 'airi-people-tools.mjs', 'airi-appointment-delivery.mjs']) {
  const target = path.join(tools, file)
  const source = fs.readFileSync(target, 'utf8')
  const legacy = 'const result = await ctx.shell.run(spec)'
  if (source.includes(legacy)) fs.writeFileSync(target, source.replace(legacy, 'const result = await (await ctx.shell.execute(spec)).result()'))
}
if (original.includes('id: preset-airi-memory')) { console.log('Existing AIRI declaration preserved; native adapters refreshed'); process.exit(0) }
const yaml = createRequire(path.join(runtime, 'package.json'))('js-yaml')
const settings = yaml.load(fs.readFileSync(settingsFile, 'utf8'))
const preset = path.join(home, '.agent-presets/airi-memory')
let plugins = fs.readFileSync(path.join(preset, 'agent.cordis.yml'), 'utf8')
plugins = plugins.replace(/name: '\.\/(.*?)'/g, (_, file) => `name: '${path.join(preset, file)}'`)
plugins = plugins.replace(/^(\s*)text: \|-/m, '$1prefix: |-')
plugins = plugins.replace(/!!js "process\.getBuiltinModule\('node:url'\)\.fileURLToPath\(new URL\('skills\/', baseUrl\)\)"/g, `'${path.join(preset, 'skills')}'`)
const indented = plugins.trimEnd().split('\n').map(line => '          ' + line).join('\n')
let migration = `\n- insert:\n    - id: preset-airi-memory\n      name: '@deepseek-ai/dsh-agent-preset'\n      config:\n        id: airi-memory\n        name: AIRI\n        plugins:\n${indented}\n\n- id: agent-preset-registry\n  config:\n    default: airi-memory\n`
for (const id of ['agent-default-model', 'llm-deepseek', 'llm-pi-ai']) {
  if (!settings[id]) continue
  const config = structuredClone(settings[id])
  if (id === 'llm-deepseek' && /^https:\/\/api\.deepseek\.com\/?$/.test(config.baseURL || '')) config.baseURL = 'https://api.deepseek.com/anthropic'
  migration += '\n' + yaml.dump([{ id, config }])
}
const headless = path.join(home, 'profiles/headless/cordis.patch.yml')
if (fs.existsSync(headless)) {
  const rows = []
  for (const id of ['agent-default-model', 'llm-deepseek', 'llm-pi-ai']) {
    if (!settings[id]) continue
    const config = structuredClone(settings[id])
    if (id === 'llm-deepseek' && /^https:\/\/api\.deepseek\.com\/?$/.test(config.baseURL || '')) config.baseURL = 'https://api.deepseek.com/anthropic'
    rows.push({ id, config })
  }
  fs.writeFileSync(headless, fs.readFileSync(headless, 'utf8') + '\n' + yaml.dump(rows))
}
fs.writeFileSync(patch, original + `\n- insert:\n    - id: airi-resources\n      name: '${path.join(home, 'plugins/dsh-airi-resources/lib/index.js')}'\n` + migration)
console.log('Migrated AIRI preset, skill paths, and saved model configuration')

const legacy = path.join(home, 'settings.yaml')
const imported = path.join(home, 'settings.yaml.imported')
if (fs.existsSync(legacy) && !fs.existsSync(imported)) fs.renameSync(legacy, imported)
