import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const runtime=process.env.DSH_RUNTIME_TEST_ROOT
if(!runtime)throw new Error('Set DSH_RUNTIME_TEST_ROOT to the installed 0.2.1 runtime directory')
test('migrates legacy persona, native adapters, and model endpoint exactly once',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'airi-migration-'))
 try{
  const preset=path.join(home,'.agent-presets/airi-memory')
  for(const folder of [preset+'/tools',home+'/profiles/web',home+'/profiles/headless'])fs.mkdirSync(folder,{recursive:true})
  const tools=['airi-appointment-shared.mjs','airi-memory-tools.mjs','airi-people-tools.mjs','airi-appointment-delivery.mjs']
  for(const file of tools)fs.writeFileSync(path.join(preset,'tools',file),'const result = await ctx.shell.run(spec)\n')
  fs.writeFileSync(path.join(preset,'agent.cordis.yml'),"- id: persona\n  name: '@deepseek-ai/dsh-persona'\n  config:\n    text: |-\n      AIRI fixture identity\n- id: native\n  name: './tools/airi-memory-tools.mjs'\n")
  for(const profile of ['web','headless'])fs.writeFileSync(home+'/profiles/'+profile+'/cordis.patch.yml','# existing operator patch\n[]\n')
  fs.writeFileSync(home+'/settings.yaml',JSON.stringify({'agent-default-model':{provider:'deepseek-official',model:'deepseek-flash'},'llm-deepseek':{baseURL:'https://api.deepseek.com'},'llm-pi-ai':{profiles:[{id:'test-provider',apiKeyEnv:'TEST_PROVIDER_KEY'}]}}))
  const command=new URL('../migrate-profile.mjs',import.meta.url).pathname
  execFileSync(process.execPath,[command,runtime,home,home+'/settings.yaml'])
  const patch=fs.readFileSync(home+'/profiles/web/cordis.patch.yml','utf8')
  assert(patch.startsWith('# existing operator patch'))
  assert(patch.includes('prefix: |-'));assert(patch.includes('baseURL: https://api.deepseek.com/anthropic'))
  assert(patch.includes('test-provider'));assert(patch.includes('TEST_PROVIDER_KEY'))
  assert(fs.existsSync(home+'/settings.yaml.imported'));assert(!fs.existsSync(home+'/settings.yaml'))
  for(const file of tools)assert(fs.readFileSync(path.join(preset,'tools',file),'utf8').includes('ctx.shell.execute(spec)'))
  execFileSync(process.execPath,[command,runtime,home,home+'/settings.yaml.imported'])
  assert.equal(fs.readFileSync(home+'/profiles/web/cordis.patch.yml','utf8'),patch)
 }finally{fs.rmSync(home,{recursive:true,force:true})}
})
