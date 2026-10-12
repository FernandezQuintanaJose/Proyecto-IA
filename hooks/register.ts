import type { Register } from 'claude-code'

type Tier = 'haiku' | 'sonnet' | 'opus'

const COMPACT_EVERY = 20
const PLAN_MARK = '[dragon:plan]'
const TIER_OF_WORD: Record<string, Tier> = { ligero: 'haiku', normal: 'sonnet', pesado: 'opus' }
const WORD_OF_TIER: Record<Tier, string> = { haiku: 'ligero', sonnet: 'normal', opus: 'pesado' }

const GENERA = /(^|[^\p{L}])(genera|génera|generalo|genéralo|vuélvemelo a pasar|vuelvemelo a pasar)([^\p{L}]|$)/iu
const OPUS = /planea|planeaci|arquitectura|seguridad|evalu|decisi[oó]n|regla nueva|reglas nuevas|viabilidad|auditor/i
const CODE = /genera|código|codigo|funci[oó]n|bug|script|archivo|implementa|refactor|corrige|arregla|error/i
const SHORT = /^(s[ií]|no|ok|vale|listo|gracias|dale|perfecto|contin[uú]a|y\?|cu[aá]l|qu[eé]|c[oó]mo|d[oó]nde|cu[aá]nto)\b/i
const FAIL = /no funciona|sigue (igual|fallando)|otra vez|sigue el error|falla|no sirve/i

const RULES = [
  'Reglas fijas de Dragon (no repetirlas al usuario):',
  '- Responde en español, corto y directo.',
  '- No inventes. Si no sabes o no verificaste algo, dilo; verifica con búsqueda o con el código antes de afirmar.',
  '- Reutiliza lo que ya existe (plugins, skills, archivos, herramientas instaladas) antes de crear algo nuevo.',
  '- Al recomendar plugins o herramientas, recomienda solo opciones seguras: oficiales o de socios verificados, de alcance contenido, sin permisos amplios ni cuentas externas innecesarias. Dilo si piden permisos amplios.',
  '- Escribe o edita código solo si el último mensaje del usuario dice "genera" (o "vuélvemelo a pasar"). Si no, responde o pregunta.',
  '- Para planear con todo lo necesario, el usuario usa /planear.',
].join('\n')

const SAVING =
  'Ahorro de tokens activo: respuestas breves, sin recapitular lo ya dicho, sin repetir el código que no cambió.'

const INSTALLED = [
  'Data (SQL, análisis, dashboards)',
  'DB Schema Spy (esquema y diagramas ER)',
  'OWASP Security Audit (auditoría OWASP Top 10)',
  'Security Guidance (avisos de seguridad al editar)',
  'playwright (pruebas en navegador)',
  'context7 (documentación actual de librerías)',
  'github (repos, issues, PR)',
  'code-review y pr-review-toolkit (revisión)',
  'code-simplifier (simplificar)',
  'commit-commands (commits)',
  'frontend-design (interfaces)',
  'Headroom (archivos grandes)',
  'skill-creator (crear skills)',
].join('; ')

const CHECKLIST =
  'seguridad, ciclo de vida, dispositivos y plataformas, arquitectura, estados, redes, persistencia, concurrencia, APIs, patrones, memoria, UX/UI, pruebas, QA, rendimiento, publicación, multiplataforma, manejo de errores, costos y permisos'

const planPrompt = (goal: string): string =>
  [
    PLAN_MARK,
    'Haz una planeación completa. NO escribas código ni archivos: solo planea.',
    goal.trim() === ''
      ? 'Antes de nada, pregunta lo mínimo: qué quiere lograr el usuario y de qué tipo es el proyecto (web, IA, app, script). Espera su respuesta.'
      : `Objetivo del usuario: ${goal.trim()}`,
    `1. Revisa esta lista: ${CHECKLIST}.`,
    '2. Di si es posible: "viable", "viable con condiciones" o "no recomendable". Verifica límites y requisitos reales con búsqueda web y cita la fuente; si no pudiste verificar algo, dilo. Es un juicio con la información disponible, no una garantía; en temas legales o de cumplimiento, recomienda confirmar con un especialista.',
    `3. Aprovecha lo ya instalado, sin rehacer nada: ${INSTALLED}. Indica en qué paso usarías cada uno. Si falta algo, di cuál y por qué es seguro.`,
    '4. Entrega la ficha: objetivo, tipo, dispositivos y plataformas, permisos, costos, riesgos, pasos, y al final "Por decidir" con lo que el usuario aún no decidió.',
    '5. Ofrece guardar la ficha en fichas/<proyecto>/ficha.md cuando el usuario diga "genera".',
  ].join('\n')

const omisionesPrompt = [
  PLAN_MARK,
  'NO escribas código ni archivos. Lee las fichas en fichas/*/ficha.md (si existen) y lista, por proyecto, lo que sigue en "Por decidir", sin repetir lo ya decidido.',
  'Si no hay fichas, dilo y sugiere usar /planear.',
].join('\n')

const MENU = [
  'Dragon:',
  '/planear [objetivo]  planeación completa y ficha',
  '/omisiones  lo que aún no decidiste',
  '/modelo ligero|normal|pesado  cambia de modelo',
  '/ahorro  activa o apaga el ahorro',
  '/candado  activa o apaga el candado de "genera"',
  '/estado  modelo, turnos, ahorro y candado',
].join('\n')

const tierOf = (model: string): Tier | null => {
  const m = model.toLowerCase()
  if (m.includes('haiku')) return 'haiku'
  if (m.includes('opus')) return 'opus'
  if (m.includes('sonnet')) return 'sonnet'
  return null
}

const suggest = (text: string, failures: number): { tier: Tier; why: string } => {
  const t = text.trim()
  if (OPUS.test(t)) return { tier: 'opus', why: 'planeación o decisión grande' }
  if (failures >= 2) return { tier: 'opus', why: 'falló dos veces seguidas' }
  if (!CODE.test(t) && (SHORT.test(t) || t.length <= 40)) return { tier: 'haiku', why: 'pregunta o confirmación corta' }
  return { tier: 'sonnet', why: 'trabajo normal' }
}

export const register: Register = on => {
  let isAuthorized = false
  let failures = 0
  let lastSuggestion: Tier | null = null
  let lastToast: Tier | null = null

  on('session.start', async ($, e, next) => {
    for (const [name, description] of [
      ['dragon', 'Menú de Dragon'],
      ['planear', 'Planeación completa y ficha del proyecto'],
      ['omisiones', 'Lo que aún no has decidido'],
      ['modelo', 'Cambia de modelo: ligero, normal o pesado'],
      ['ahorro', 'Activa o apaga el ahorro de tokens'],
      ['candado', 'Activa o apaga el candado de "genera"'],
      ['estado', 'Modelo, turnos, ahorro y candado'],
    ] as const) {
      await $.command.register({ name, description })
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.text.startsWith(PLAN_MARK)) {
      isAuthorized = false

      return next({
        ...e,
        context: [...(e.context ?? []), '[dragon] Modo planeación: no escribas ni edites archivos ni código.'],
      })
    }

    isAuthorized = GENERA.test(e.text)
    failures = FAIL.test(e.text) ? failures + 1 : 0

    const note = isAuthorized
      ? '[dragon] El usuario dijo "genera": puedes escribir código.'
      : '[dragon] El usuario NO dijo "genera": no escribas ni edites archivos; solo responde o pregunta.'

    const pick = suggest(e.text, failures)
    lastSuggestion = pick.tier
    const current = tierOf(await $.session.model())
    if (current !== null && current !== pick.tier) {
      $.ui.status(`modelo: ${current}, sugerido: ${pick.tier} (${pick.why})`)
      if (lastToast !== pick.tier) {
        lastToast = pick.tier
        $.ui.toast(`Conviene ${pick.tier} (${pick.why}). Usa /modelo ${WORD_OF_TIER[pick.tier]}.`)
      }
    } else {
      $.ui.status(undefined)
      lastToast = null
    }

    if ((await $.store.get('ahorro')) !== false) {
      const turns = await $.session.turns()
      if (turns > 0 && turns % COMPACT_EVERY === 0) {
        $.ui.toast(`Llevas ${turns} turnos: usa /compact para ahorrar tokens.`)
      }
    }

    return next({ ...e, context: [...(e.context ?? []), note] })
  })

  on('tool.call', async ($, e, next) => {
    const isWrite = e.tool === 'Edit' || e.tool === 'Write' || e.tool === 'NotebookEdit'
    if (isWrite && !isAuthorized && (await $.store.get('candado')) !== false) {
      return { deny: 'Dragon: falta tu "genera". Dime "genera" y lo escribo.' }
    }

    return next(e)
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: 'Dragon: el candado falló; dime "genera" otra vez.' },
  )

  on('prompt.compose', async ($, e, next) => {
    const ran = await next(e)
    const text = (await $.store.get('ahorro')) !== false ? `${RULES}\n${SAVING}` : RULES

    return { sections: [...ran.sections, { id: 'dragon:reglas', text, scope: 'session' }] }
  })

  on('command.run', { command: 'dragon' }, () => ({ text: MENU }))

  on('command.run', { command: 'planear' }, async ($, e) => {
    $.clock.after(300, () => void $.prompt.submit({ text: planPrompt(e.args) }))

    return { text: 'Dragon: planeando (sin escribir nada).' }
  })

  on('command.run', { command: 'omisiones' }, async $ => {
    $.clock.after(300, () => void $.prompt.submit({ text: omisionesPrompt }))

    return { text: 'Dragon: buscando lo pendiente.' }
  })

  on('command.run', { command: 'modelo' }, async ($, e) => {
    const tier = TIER_OF_WORD[e.args.trim().toLowerCase()]
    if (tier === undefined) return { text: 'Usa: /modelo ligero | normal | pesado' }
    $.clock.after(300, () => {
      $.command.run({ command: 'model', args: tier }).catch(() => {
        $.ui.toast(`No pude cambiarlo desde aquí. Escribe tú: /model ${tier}`)
      })
    })

    return { text: `Cambiando a ${tier}. Si no puedo, te aviso para que escribas /model ${tier}.` }
  })

  on('command.run', { command: 'ahorro' }, async $ => {
    const isOn = (await $.store.get('ahorro')) !== false
    await $.store.set('ahorro', !isOn)

    return { text: `Ahorro: ${isOn ? 'apagado' : 'activo'}.` }
  })

  on('command.run', { command: 'candado' }, async $ => {
    const isOn = (await $.store.get('candado')) !== false
    await $.store.set('candado', !isOn)

    return { text: `Candado de "genera": ${isOn ? 'apagado' : 'activo'}.` }
  })

  on('command.run', { command: 'estado' }, async $ => {
    const model = await $.session.model()
    const turns = await $.session.turns()
    const ahorro = (await $.store.get('ahorro')) !== false
    const candado = (await $.store.get('candado')) !== false

    return {
      text: [
        `Modelo: ${model}`,
        `Sugerido: ${lastSuggestion ?? 'aún nada'}`,
        `Turnos: ${turns}`,
        `Ahorro: ${ahorro ? 'activo' : 'apagado'}`,
        `Candado: ${candado ? 'activo' : 'apagado'}`,
      ].join('\n'),
    }
  })
}
