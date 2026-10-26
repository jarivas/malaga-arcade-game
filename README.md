# G.R.I.P.E. — El Fin del Mundo Comienza en Málaga

Prototipo de **beat 'em up arcade 2.5D** con scroll lateral y profundidad en el eje Y, al estilo de *Cadillacs and Dinosaurs*, *Final Fight* y *Streets of Rage*. La acción transcurre en una Málaga post-apocalíptica. El diseño prevé compaginar fases a pie con una fase de conducción a alta velocidad.

> Documentación pensada para lectura incremental por humanos y agentes LLM. Empieza por este archivo y abre solo el documento que necesites. **El código es la fuente de verdad**; si la documentación y el código discrepan, gana el código.

## Stack

| Pieza | Versión / decisión |
| :--- | :--- |
| Motor | **Phaser 4.2.1** (`phaser`) |
| Lenguaje | **TypeScript** + Vite |
| Resolución base | **480 × 270** (16:9) |
| Escalado | `Phaser.Scale.FIT` + `CENTER_BOTH`, `pixelArt: true` |
| Físicas | Arcade sin gravedad (`gravity: 0`) |
| Cámara | Scroll horizontal con profundidad en Y y Y-Sort |
| Modo previsto | Cooperativo local para 2 jugadores |

## Puesta en marcha

```bash
npm install
npm run dev      # http://localhost:5173
```

Otros comandos:

```bash
npm run build    # Comprueba tipos y genera la build de producción
npm run preview  # Sirve la build generada
```

## Estado actual

La escena jugable es **`TestArenaScene`**:

- Nivel de 1400 × 270 px con scroll lateral, una zona de bloqueo y una oleada de 4 Merdellones.
- **Joseph** jugable con katana, ataque especial 360°, salto 2.5D y tajo aéreo.
- **Merdellón** persigue, recibe daño, es derribado y muere; todavía no ataca.
- **9 props rompibles** que sueltan campero, refresco o dinero.
- **9 armas recogibles**: tubería, bate, botella y cuchillo, con usos y proyectiles.
- HUD retro, aviso `GO! ➔` y SFX procedurales sin archivos externos.

Pendiente principal: ataques enemigos, game over, cooperativo, más oleadas y la fase de conducción. Ver [`docs/roadmap.md`](docs/roadmap.md).

## Controles actuales

| Acción | Teclado | Gamepad |
| :--- | :--- | :--- |
| Mover | `W`, `A`, `S`, `D` | Stick izquierdo / D-pad |
| Ataque con katana | `J` | Botón A (índice 0) |
| Saltar | `Espacio` o `K` | Botón B |
| Ataque aéreo | `J` en el aire | Botón A en el aire |
| Ataque especial | `U` o `J` + `K` | Botón Y o `A` + `B` |

> `A` en el teclado mueve a la izquierda; `A` en el mando ataca. `K` salta y `J` + `K` ejecuta el especial.

## Documentación

| Documento | Para qué |
| :--- | :--- |
| [`docs/README.md`](docs/README.md) | **Índice completo** y rutas de lectura por tarea |
| [`docs/arquitectura.md`](docs/arquitectura.md) | Phaser, 2.5D, Y-Sort, físicas y capas |
| [`docs/controles.md`](docs/controles.md) | Input actual y cooperativo previsto |
| [`docs/combate.md`](docs/combate.md) | Daño, hitboxes, i-frames y tablas |
| [`docs/joseph.md`](docs/joseph.md) | Jugador: animaciones y ataques |
| [`docs/merdellon.md`](docs/merdellon.md) | Enemigo actual |
| [`docs/objetos.md`](docs/objetos.md) | Props y consumibles |
| [`docs/armas.md`](docs/armas.md) | Armas y proyectiles |
| [`docs/escenas.md`](docs/escenas.md) | Nivel actual y fases previstas |
| [`docs/hud.md`](docs/hud.md) | Interfaz |
| [`docs/audio.md`](docs/audio.md) | SFX procedurales |
| [`docs/assets.md`](docs/assets.md) | Hojas, normalización y retratos |
| [`docs/estructura-proyecto.md`](docs/estructura-proyecto.md) | Árbol real y dónde añadir código |
| [`docs/diseno-previsto.md`](docs/diseno-previsto.md) | Visión: arquetipos, fases y conducción |
| [`docs/roadmap.md`](docs/roadmap.md) | Limitaciones y próximos pasos |
| [`docs/recetas.md`](docs/recetas.md) | Recetas y checklists |

Para agentes: empieza por [`AGENTS.md`](AGENTS.md) y sigue con [`PROJECT_INSTRUCTIONS.md`](PROJECT_INSTRUCTIONS.md).

## Estructura rápida

```text
src/
├── main.ts                 # Configuración de Phaser
├── audio/SoundFX.ts
├── entities/
│   ├── player/Joseph.ts
│   ├── enemies/Merdellon.ts
│   └── objects/            # Props, pickups, armas, proyectiles, texturas
├── scenes/TestArenaScene.ts
├── types/combat.ts
└── ui/HUD.ts

public/assets/              # Assets que carga el juego
assets/                     # Hojas originales de referencia
docs/                       # Documentación temática
```

Detalle completo en [`docs/estructura-proyecto.md`](docs/estructura-proyecto.md).

## Licencia / uso

Prototipo personal sin licencia definida.
