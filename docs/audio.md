# Audio

Resumen: efectos de sonido **procedurales** con la Web Audio API y el `AudioContext` de Phaser, sin archivos externos. Código: `src/audio/SoundFX.ts`.

## Efectos

| Método | Diseño |
| :--- | :--- |
| `playSlash()` | Sierra 800 → 150 Hz en 0,1 s con silbido senoidal |
| `playHit()` | Ruido blanco filtrado + square a 120 Hz durante 0,08 s |
| `playSpecial()` | Barrido 200 → 1200 → 300 Hz con filtro y caída de 0,3 s |
| `playEnemyDeath()` | Tono grave distorsionado 250 → 60 Hz en 0,25 s |
| `playGo()` | Jingle sinusoidal 587 Hz (0,1 s) + 880 Hz (0,2 s) |
| `playPlayerHurt()` | Golpe apagado + quejido triangular a 180 Hz |
| `playBreak()` | Doble ráfaga de ruido filtrado (900 y 320 Hz) + golpe triangular grave 150 → 45 Hz |
| `playPickup()` | Arpegio ascendente 660 → 880 → 1320 Hz |

## Integración

- El contexto se reanuda en el primer `pointerdown`, `keydown` o botón del mando; cada reproducción también intenta reanudarlo.
- Está conectado a `manager.destination` de Phaser, por lo que respeta el mute y el volumen globales.
- `TestArenaScene` crea la instancia y la inyecta en Joseph; los impactos, muertes, roturas y el aviso GO también disparan sus sonidos.
- `playBreak()` se usa al romper props y el bate; `playPickup()` al recoger consumibles y armas.

## Pendiente

- No hay música. La idea es chiptune/clásica, pero requeriría archivos o síntesis adicional.
- No hay mezclador ni control de volumen propio en el HUD.

## Relacionados

- [`objetos.md`](objetos.md) — roturas y recogidas.
- [`escenas.md`](escenas.md) — aviso GO.
