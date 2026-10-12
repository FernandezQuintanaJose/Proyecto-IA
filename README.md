# Dragon

Mod de Claude Code (plugin `dragon-asistente`) con un repositorio general: mod, fichas, normas, plantillas y config.

## Instalar

```
/plugin marketplace add dragonsteam3141-dotcom/Proyecto-IA
/plugin install dragon-asistente@dragon
```

## Comandos

| Comando | Qué hace |
|---|---|
| `/dragon` | Menú |
| `/planear [objetivo]` | Planeación completa: revisa la lista, dice si es viable (con fuentes), usa los plugins ya instalados y entrega la ficha |
| `/omisiones` | Lo que aún no has decidido (lee `fichas/*/ficha.md`) |
| `/modelo ligero\|normal\|pesado` | Haiku, Sonnet u Opus |
| `/ahorro` | Activa o apaga el ahorro de tokens |
| `/candado` | Activa o apaga el candado de "genera" |
| `/estado` | Modelo, turnos, ahorro y candado |

## Reglas

- **Candado de "genera":** `Edit`, `Write` y `NotebookEdit` se niegan si tu último mensaje no dice "genera" (o "vuélvemelo a pasar"). "general" no cuenta.
- **Modelo por tarea (solo sugiere):** Haiku para confirmaciones y preguntas cortas; Sonnet por defecto; Opus para planeación, arquitectura, seguridad y decisiones grandes, o si Sonnet falla dos veces seguidas. Si `/modelo` no puede cambiarlo, te avisa que escribas `/model <nombre>`.
- **Ahorro:** respuestas breves y aviso de `/compact` cada 20 turnos.
- **Reutiliza lo instalado:** `/planear` usa Data, DB Schema Spy, OWASP Security Audit, playwright, context7, github y los demás antes de proponer algo nuevo.
- **Plugins seguros:** recomienda solo oficiales o de socios verificados y de alcance contenido.

## Estado

Etapa 1. Validado y con 3 pruebas; aún no probado en una sesión real. Etapas 2 (seguridad) y 3 (normas, `/vigilar`, `/herramienta`, `/limpiar`) pendientes.
