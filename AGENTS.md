# AGENTS.md

Este repositorio usa [`PROJECT_INSTRUCTIONS.md`](PROJECT_INSTRUCTIONS.md) como guía canónica para agentes. Léela antes de tocar código.

## Orden de lectura

1. [`PROJECT_INSTRUCTIONS.md`](PROJECT_INSTRUCTIONS.md) — reglas y estado del proyecto.
2. [`docs/README.md`](docs/README.md) — índice temático; abre solo lo necesario.
3. El documento del tema y el código implicado (`src/...`).

## Recordatorio rápido

- Phaser **4.2.1** + TypeScript + Vite; resolución **480 × 270**, `pixelArt`, Arcade sin gravedad.
- La `y` es profundidad: Y-Sort con `setDepth(y)` y cuerpo en los pies.
- Un golpe solo conecta en el mismo carril (`|Δy| <= 16`).
- No hay cooperativo, ataques enemigos, game over ni fase de conducción todavía.
- Al terminar: `npm run build`, prueba manual si aplica y actualiza el documento del tema.

El código es la fuente de verdad: si la documentación discrepa, corrige la documentación.
