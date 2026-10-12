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
const NEW_PROJECT = /(quiero|necesito|quisiera|voy a|vamos a)\s+(hacer|crear|construir|armar|desarrollar|montar|programar)/i
const PENDING = /qu[eé] me falta|por decidir|sin decidir|omisiones|qu[eé] (no he|falta) decid/i
const AUTHORIZE = /(^|[^\p{L}])autorizo([^\p{L}]|$)/iu
const DANGER = /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r|git\s+push\b.*(--force|-f\b)|git\s+reset\s+--hard|(curl|wget)\b[^|]*\|\s*(sudo\s+)?(sh|bash)|\bmkfs\b|\bdd\s+if=|chmod\s+-R\s+777|:\(\)\s*\{/i
const SENSITIVE_FILE = /(^|\/)(\.env(\..*)?|id_rsa|id_ed25519|credentials|\.netrc|\.npmrc)$|\.(pem|key|p12|pfx)$/i
const SECRET = /AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[abprs]-[A-Za-z0-9-]{10,}/
const DB_CLI = /\b(psql|mysql|mariadb|sqlite3|mongosh|redis-cli|sqlcmd)\b/i
const DB_WRITE = /\b(insert|update|delete|drop|alter|truncate|create|replace|grant|revoke)\b|\b(flushall|flushdb)\b/i
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

const planBody = (goal: string): string[] => [
    'Haz una planeación completa. NO escribas código ni archivos: solo planea.',
    goal.trim() === ''
      ? 'Antes de nada, pregunta lo mínimo: qué quiere lograr el usuario y de qué tipo es el proyecto (web, IA, app, script). Espera su respuesta.'
      : `Objetivo del usuario: ${goal.trim()}`,
    `1. Revisa esta lista: ${CHECKLIST}.`,
    '2. Di si es posible: "viable", "viable con condiciones" o "no recomendable". Verifica límites y requisitos reales con búsqueda web y cita la fuente; si no pudiste verificar algo, dilo. Es un juicio con la información disponible, no una garantía; en temas legales o de cumplimiento, recomienda confirmar con un especialista.',
    `3. Aprovecha lo ya instalado, sin rehacer nada: ${INSTALLED}. Indica en qué paso usarías cada uno. Si falta algo, di cuál y por qué es seguro.`,
    '4. Entrega la ficha: objetivo, tipo, dispositivos y plataformas, permisos, costos, riesgos, pasos, y al final "Por decidir" con lo que el usuario aún no decidió.',
    '5. Ofrece guardar la ficha en fichas/<proyecto>/ficha.md cuando el usuario diga "genera".',
  ]

const planPrompt = (goal: string): string => [PLAN_MARK, ...planBody(goal)].join('\n')

const omisionesBody = [
  'NO escribas código ni archivos. Lee las fichas en fichas/*/ficha.md (si existen) y lista, por proyecto, lo que sigue en "Por decidir", sin repetir lo ya decidido.',
  'Si no hay fichas, dilo y sugiere usar /planear.',
]
const omisionesPrompt = [PLAN_MARK, ...omisionesBody].join('\n')

const MENU = [
  'Dragon trabaja solo; estos comandos sirven para forzar algo a mano.',
  '/planear [objetivo]  empiezas algo nuevo: ¿se puede? ¿qué falta? (sale solo si dices "quiero hacer...")',
  '/omisiones  no recuerdas qué falta decidir (sale solo si preguntas "qué me falta")',
  '/modelo ligero|normal|pesado|auto|manual  quieres fijar el modelo o apagar el cambio automático',
  '/ahorro  quieres respuestas más largas, o volver a las cortas',
  '/candado  necesitas que escriba sin decir "genera"',
  '/basedatos  necesitas escribir en la base (por defecto solo lee)',
  '/estado  quieres ver modelo, turnos y ajustes',
  'Palabras: "genera" permite escribir; "autorizo" permite un comando peligroso.',
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
  let isDangerOk = false
  let streak = { tier: null as Tier | null, n: 0 }

  on('session.start', async ($, e, next) => {
    for (const [name, description] of [
      ['dragon', 'Menú de Dragon'],
      ['planear', 'Planeación completa y ficha del proyecto'],
      ['omisiones', 'Lo que aún no has decidido'],
      ['modelo', 'Cambia de modelo: ligero, normal o pesado'],
      ['ahorro', 'Activa o apaga el ahorro de tokens'],
      ['candado', 'Activa o apaga el candado de "genera"'],
      ['basedatos', 'Alterna la base de datos entre solo lectura y escritura'],
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
    isDangerOk = AUTHORIZE.test(e.text)
    failures = FAIL.test(e.text) ? failures + 1 : 0

    const notes = [
      isAuthorized
        ? '[dragon] El usuario dijo "genera": puedes escribir código.'
        : '[dragon] El usuario NO dijo "genera": no escribas ni edites archivos; solo responde o pregunta.',
    ]
    if (!isAuthorized && NEW_PROJECT.test(e.text)) {
      notes.push('[dragon] Proyecto nuevo detectado. Sigue este procedimiento de planeación:', ...planBody(e.text))
    } else if (!isAuthorized && PENDING.test(e.text)) {
      notes.push('[dragon] Pendientes detectados. Sigue este procedimiento:', ...omisionesBody)
    }

    const pick = suggest(e.text, failures)
    lastSuggestion = pick.tier
    streak = { tier: pick.tier, n: streak.tier === pick.tier ? streak.n + 1 : 1 }
    const current = tierOf(await $.session.model())
    if (current !== null && current !== pick.tier) {
      $.ui.status(`modelo: ${current}, sugerido: ${pick.tier} (${pick.why})`)
      const isAuto = (await $.store.get('auto')) !== false
      if (pick.tier !== 'opus' && isAuto && streak.n >= 2) {
        const tier = pick.tier
        $.clock.after(300, () => {
          $.command.run({ command: 'model', args: tier }).catch(() => {
            $.ui.toast(`No pude cambiar a ${tier}. Escribe tú: /model ${tier}`)
          })
        })
        $.ui.toast(`Cambiando a ${tier} (${pick.why}).`)
      } else if (lastToast !== pick.tier) {
        lastToast = pick.tier
        $.ui.toast(
          pick.tier === 'opus'
            ? `¿Subir a Opus (${pick.why})? Gasta más. Usa /modelo pesado.`
            : `Conviene ${pick.tier} (${pick.why}). Usa /modelo ${WORD_OF_TIER[pick.tier]}.`,
        )
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

    return next({ ...e, context: [...(e.context ?? []), ...notes] })
  })

  on('tool.call', async ($, e, next) => {
    const isWrite = e.tool === 'Edit' || e.tool === 'Write' || e.tool === 'NotebookEdit'
    if (isWrite && !isAuthorized && (await $.store.get('candado')) !== false) {
      return { deny: 'Dragon: falta tu "genera". Dime "genera" y lo escribo.' }
    }

    const path = 'file_path' in e && typeof e.file_path === 'string' ? e.file_path : ''
    if (path !== '' && SENSITIVE_FILE.test(path) && (e.tool === 'Read' || isWrite)) {
      return { deny: `Dragon: ${path} es un archivo sensible (secretos). No lo toco; edítalo tú.` }
    }

    if (isWrite && SECRET.test(JSON.stringify(e))) {
      return { deny: 'Dragon: el contenido parece traer una clave o token. Usa una variable de entorno en su lugar.' }
    }

    if (e.tool === 'Bash') {
      if (DANGER.test(e.command) && !isDangerOk) {
        return { deny: 'Dragon: comando peligroso. Si de verdad lo quieres, escribe "autorizo" en tu mensaje.' }
      }
      if (DB_CLI.test(e.command) && DB_WRITE.test(e.command) && (await $.store.get('dbEscritura')) !== true) {
        return { deny: 'Dragon: la base de datos está en solo lectura (select). Activa la escritura con /basedatos.' }
      }
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
    const arg = e.args.trim().toLowerCase()
    if (arg === 'auto' || arg === 'manual') {
      await $.store.set('auto', arg === 'auto')

      return { text: `Cambio de modelo: ${arg}.` }
    }
    const tier = TIER_OF_WORD[arg]
    if (tier === undefined) return { text: 'Usa: /modelo ligero | normal | pesado | auto | manual' }
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

  on('command.run', { command: 'basedatos' }, async $ => {
    const isOn = (await $.store.get('dbEscritura')) === true
    await $.store.set('dbEscritura', !isOn)

    return { text: `Base de datos: ${isOn ? 'solo lectura' : 'escritura permitida'}.` }
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
        `Cambio de modelo: ${(await $.store.get('auto')) !== false ? 'auto' : 'manual'}`,
        `Base de datos: ${(await $.store.get('dbEscritura')) === true ? 'escritura' : 'solo lectura'}`,
      ].join('\n'),
    }
  })
}
