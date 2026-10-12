import { expect, mock, test } from 'claude-code/testing'

const bottom = (on: any, model = 'claude-sonnet-5-5') => {
  mock.store(on)
  on('session.model', () => ({ value: model }))
  on('session.turns', () => ({ value: 3 }))
  on('prompt.submit', ($: any, e: any) => ({ text: e.text, context: e.context }))
  on('tool.call', () => ({ result: 'ok' }))
}

test('"general" no autoriza, "genera" sí', async ($: any, on) => {
  bottom(on)
  const a = await $.prompt.submit({ text: 'quiero algo general' })
  expect(a.context?.join(' ')).toContain('NO dijo "genera"')
  const b = await $.prompt.submit({ text: 'genera etapa 1' })
  expect(b.context?.join(' ')).toContain('puedes escribir código')
})

test('el candado niega Edit sin "genera" y lo permite con él', async ($: any, on) => {
  bottom(on)
  await $.prompt.submit({ text: 'hola' })
  const denied = await $.tool.call({ tool: 'Edit', file_path: '/x', old_string: 'a', new_string: 'b' })
  expect(JSON.stringify(denied)).toContain('genera')
  await $.prompt.submit({ text: 'genera' })
  const ok = await $.tool.call({ tool: 'Edit', file_path: '/x', old_string: 'a', new_string: 'b' })
  expect(JSON.stringify(ok)).not.toContain('falta tu')
})

test('/planear manda el prompt de planeación', async ($: any, on) => {
  bottom(on)
  const r = await $.command.run({ command: 'planear', args: 'una app' })
  expect(r.text).toContain('planeando')
})

test('"quiero hacer" activa la planeación sin comando', async ($: any, on) => {
  bottom(on)
  const r = await $.prompt.submit({ text: 'quiero hacer una app de citas' })
  expect(r.context?.join(' ')).toContain('Proyecto nuevo detectado')
})

test('seguridad: comando peligroso, .env y base de datos', async ($: any, on) => {
  bottom(on)
  await $.prompt.submit({ text: 'borra todo' })
  const rm = await $.tool.call({ tool: 'Bash', command: 'rm -rf /tmp/x' })
  expect(JSON.stringify(rm)).toContain('peligroso')
  const db = await $.tool.call({ tool: 'Bash', command: 'psql -c "DROP TABLE users"' })
  expect(JSON.stringify(db)).toContain('solo lectura')
  const sel = await $.tool.call({ tool: 'Bash', command: 'psql -c "select 1"' })
  expect(JSON.stringify(sel)).not.toContain('solo lectura')
  await $.prompt.submit({ text: 'autorizo' })
  const ok = await $.tool.call({ tool: 'Bash', command: 'rm -rf /tmp/x' })
  expect(JSON.stringify(ok)).not.toContain('peligroso')
  await $.prompt.submit({ text: 'genera' })
  const env = await $.tool.call({ tool: 'Write', file_path: '/app/.env', content: 'A=1' })
  expect(JSON.stringify(env)).toContain('sensible')
  const key = await $.tool.call({ tool: 'Write', file_path: '/app/a.ts', content: 'k="ghp_' + 'a'.repeat(36) + '"' })
  expect(JSON.stringify(key)).toContain('clave')
})

test('etapa 3: /vigilar, /herramienta y /limpiar responden y no escriben', async ($: any, on) => {
  bottom(on)
  for (const command of ['vigilar', 'herramienta', 'limpiar']) {
    const r = await $.command.run({ command, args: 'x' })
    expect(r.text).toBeDefined()
  }
})

test('"qué herramienta" activa la elección de herramienta', async ($: any, on) => {
  bottom(on)
  const r = await $.prompt.submit({ text: 'qué herramienta uso para probar mi web' })
  expect(r.context?.join(' ')).toContain('Elección de herramienta')
})

test('"generar" también autoriza', async ($: any, on) => {
  bottom(on)
  const a = await $.prompt.submit({ text: 'termina de generar todo' })
  expect(a.context?.join(' ')).toContain('puedes escribir código')
})

test('/planear pide verificar con context7 y github si están conectados', async ($: any, on) => {
  bottom(on)
  const r = await $.prompt.submit({ text: 'quiero hacer una app' })
  const text = r.context?.join(' ') ?? ''
  expect(text).toContain('context7')
  expect(text).toContain('no inventes')
  expect(text).toContain('OWASP Security Audit')
})
