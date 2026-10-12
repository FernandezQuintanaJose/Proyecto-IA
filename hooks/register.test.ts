import { expect, mock, test } from 'claude-code/testing'

const bottom = (on: any, model = 'claude-sonnet-5-5') => {
  mock.store(on)
  on('session.model', () => ({ value: model }))
  on('session.turns', () => ({ value: 3 }))
  on('prompt.submit', ($: any, e: any) => ({ text: e.text, context: e.context }))
  on('tool.call', () => ({ result: 'ok' }))
}

test('"general" no autoriza, "genera" sí', async ($, on) => {
  bottom(on)
  const a = await $.prompt.submit({ text: 'quiero algo general' })
  expect(a.context?.join(' ')).toContain('NO dijo "genera"')
  const b = await $.prompt.submit({ text: 'genera etapa 1' })
  expect(b.context?.join(' ')).toContain('puedes escribir código')
})

test('el candado niega Edit sin "genera" y lo permite con él', async ($, on) => {
  bottom(on)
  await $.prompt.submit({ text: 'hola' })
  const denied = await $.tool.call({ tool: 'Edit', file_path: '/x', old_string: 'a', new_string: 'b' })
  expect(JSON.stringify(denied)).toContain('genera')
  await $.prompt.submit({ text: 'genera' })
  const ok = await $.tool.call({ tool: 'Edit', file_path: '/x', old_string: 'a', new_string: 'b' })
  expect(JSON.stringify(ok)).not.toContain('falta tu')
})

test('/planear manda el prompt de planeación', async ($, on) => {
  bottom(on)
  const r = await $.command.run({ command: 'planear', args: 'una app' })
  expect(r.text).toContain('planeando')
})
