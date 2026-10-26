# Índice de documentación

Documentación de **G.R.I.P.E.** dividida por temas para que un agente LLM (o una persona) cargue solo el contexto que necesita. El código es la fuente de verdad: si un documento y el código discrepan, gana el código y hay que corregir el documento.

Para agentes: [`../AGENTS.md`](../AGENTS.md) → [`../PROJECT_INSTRUCTIONS.md`](../PROJECT_INSTRUCTIONS.md) → este índice.

## Lecturas frecuentes

| Si vas a tocar... | Lee, en orden |
| :--- | :--- |
| Combate, daño o hitboxes | [`combate.md`](combate.md) → [`joseph.md`](joseph.md) → [`merdellon.md`](merdellon.md) |
| El jugador | [`joseph.md`](joseph.md) → [`controles.md`](controles.md) → [`armas.md`](armas.md) |
| Enemigos | [`merdellon.md`](merdellon.md) → [`combate.md`](combate.md) |
| Escenario, cámara o scroll | [`escenas.md`](escenas.md) → [`arquitectura.md`](arquitectura.md) |
| Props, consumibles o pickups | [`objetos.md`](objetos.md) → [`assets.md`](assets.md) |
| Armas y proyectiles | [`armas.md`](armas.md) → [`assets.md`](assets.md) |
| HUD o UI | [`hud.md`](hud.md) → [`escenas.md`](escenas.md) |
| Sonido | [`audio.md`](audio.md) |
| Añadir una funcionalidad nueva | [`recetas.md`](recetas.md) → [`estructura-proyecto.md`](estructura-proyecto.md) |
| Saber qué falta | [`roadmap.md`](roadmap.md) → [`diseno-previsto.md`](diseno-previsto.md) |

## Todos los documentos

| Documento | Contenido | Estado |
| :--- | :--- | :--- |
| [`arquitectura.md`](arquitectura.md) | Configuración de Phaser, 2.5D, Y-Sort, físicas y profundidad | Implementado |
| [`controles.md`](controles.md) | Teclado y mando actuales; mapeo cooperativo previsto | Mixto |
| [`combate.md`](combate.md) | Tipos, daño, knockback, i-frames, profundidad y tablas | Implementado |
| [`joseph.md`](joseph.md) | Jugador actual: animaciones, movimiento, salto y ataques | Implementado |
| [`merdellon.md`](merdellon.md) | Enemigo actual: stats, IA, reacciones y muerte | Implementado |
| [`objetos.md`](objetos.md) | Props rompibles, consumibles y su arte | Implementado |
| [`armas.md`](armas.md) | Armas recogibles, lanzables y proyectiles | Implementado |
| [`escenas.md`](escenas.md) | `TestArenaScene` y diseño de fases futuras | Mixto |
| [`hud.md`](hud.md) | Paneles de jugador/enemigo, GO y ayuda | Implementado |
| [`audio.md`](audio.md) | Efectos procedurales con Web Audio | Implementado |
| [`assets.md`](assets.md) | Carpetas, normalización de hojas y retratos | Implementado |
| [`estructura-proyecto.md`](estructura-proyecto.md) | Árbol real, árbol previsto y dónde añadir código | Implementado |
| [`diseno-previsto.md`](diseno-previsto.md) | Visión: arquetipos, cooperativo, fases y conducción | Previsto |
| [`roadmap.md`](roadmap.md) | Limitaciones actuales y próximos pasos | — |
| [`recetas.md`](recetas.md) | Recetas y checklists para tareas habituales | — |

## Cómo mantenerla

- Un tema por archivo; evitar duplicar detalles entre documentos. Si un dato aparece en dos sitios, deja el detalle en uno y enlaza desde el otro.
- Al cambiar comportamiento, actualiza el documento del tema y, si cambia el alcance, [`roadmap.md`](roadmap.md).
- Marcar siempre lo **implementado** frente a lo **previsto**. No describir como existente algo que solo está diseñado.
- Usar rutas relativas a la raíz del proyecto (`src/...`, `public/...`) para que el agente pueda abrir el código directamente.
