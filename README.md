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
| `/modelo ligero\|normal\|pesado\|auto\|manual` | Fija Haiku, Sonnet u Opus, o activa/apaga el cambio automático |
| `/basedatos` | Alterna la base entre solo lectura (por defecto) y escritura |
| `/ahorro` | Activa o apaga el ahorro de tokens |
| `/candado` | Activa o apaga el candado de "genera" |
| `/vigilar [plataformas]` | Busca en la web cambios y fechas límite en tus plataformas, con fuente |
| `/herramienta [necesidad]` | Elige primero entre lo ya instalado; solo si falta, recomienda hasta 2 plugins seguros |
| `/limpiar` | Informe de lo que sobra; solo lee, borrar requiere "genera" y lista exacta |
| `/estado` | Modelo, turnos, ahorro y candado |

## Automático

- "quiero hacer/crear/construir..." activa la planeación sin escribir `/planear`.
- "qué me falta / por decidir" activa `/omisiones`.
- El modelo cambia solo entre Haiku y Sonnet tras 2 mensajes seguidos con la misma sugerencia; para subir a Opus pregunta. Si no puede cambiarlo, te avisa que escribas `/model <nombre>`.

- "qué herramienta uso" activa `/herramienta`.

## Normas (etapa 3)

Tarjetas en `normas/` (seguridad, pruebas, APIs, datos, UX/UI, publicación). `/planear` las aplica.

## Seguridad (etapa 2)

- Niega comandos peligrosos (`rm -rf`, `git push --force`, `git reset --hard`, `curl | sh`...) salvo que tu mensaje diga "autorizo".
- No lee ni edita `.env`, llaves y credenciales.
- Niega escribir código que traiga claves o tokens.
- Bases de datos en solo lectura desde la terminal (`psql`, `mysql`, `sqlite3`...); `/basedatos` permite escribir.
- Límite: son patrones de texto, no un análisis completo; un comando muy distinto puede escaparse.

## Primera sesión nueva

1. Instala (cuando la rama esté fusionada a la principal): `/plugin marketplace add dragonsteam3141-dotcom/Proyecto-IA` y `/plugin install dragon-asistente@dragon`.
2. Para que `context7` y `github` conecten, el entorno necesita salida de red a `mcp.context7.com` y `api.githubcopilot.com` (Editar entorno, Acceso a la red) y una sesión nueva. Sin eso Dragon sigue funcionando y lo dice en una línea.
3. Prueba con `/dragon` y `/estado`.

## Reglas

- **Candado de "genera":** `Edit`, `Write` y `NotebookEdit` se niegan si tu último mensaje no dice "genera" ("generar" o "vuélvemelo a pasar" también cuentan; "general" no). "general" no cuenta.
- **Modelo por tarea (solo sugiere):** Haiku para confirmaciones y preguntas cortas; Sonnet por defecto; Opus para planeación, arquitectura, seguridad y decisiones grandes, o si Sonnet falla dos veces seguidas. Si `/modelo` no puede cambiarlo, te avisa que escribas `/model <nombre>`.
- **Ahorro:** respuestas breves y aviso de `/compact` cada 20 turnos.
- **Reutiliza lo instalado:** `/planear` usa Data, DB Schema Spy, OWASP Security Audit, playwright, context7, github y los demás antes de proponer algo nuevo.
- **Plugins seguros:** recomienda solo oficiales o de socios verificados y de alcance contenido.

## Estado

Etapas 1 y 2. Validado y con 5 pruebas; aún no probado en una sesión real. Etapa 3 (normas, `/vigilar`, `/herramienta`, `/limpiar`) pendientes.
