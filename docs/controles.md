# Controles e input

Resumen: hoy hay **un solo jugador** con teclado o mando. El cooperativo local para dos jugadores está diseñado pero **no implementado**.

## Controles actuales

| Acción | Teclado | Gamepad |
| :--- | :--- | :--- |
| Mover | `W`, `A`, `S`, `D` | Stick izquierdo / D-pad |
| Ataque con katana | `J` | Botón A (índice 0) |
| Saltar | `Espacio` o `K` | Botón B (índice 1) |
| Ataque aéreo | `J` en el aire | Botón A en el aire |
| Ataque especial | `U` o `J` + `K` | Botón Y (índice 3) o `A` + `B` |

Notas:

- La `A` del teclado forma parte de `WASD` y mueve a la izquierda; la `A` del mando es el botón de ataque. No tienen relación.
- `K` sola salta; `J` + `K` ejecuta el especial. En el mando, `B` salta y `A` + `B` ejecuta el especial.
- La implementación actual está en `src/entities/player/Joseph.ts`; el gamepad se consulta con `Phaser.Input.Gamepad`.
- No hay remapeo ni configuración de mandos.

## Cooperativo local previsto (no implementado)

Objetivo: dos jugadores simultáneos, cada uno con su mando o su bloque de teclas.

| Acción | Mando P1 (índice 0) | Mando P2 (índice 1) | Teclado P1 | Teclado P2 |
| :--- | :--- | :--- | :--- | :--- |
| `up` | D-pad arriba / stick izq. | D-pad arriba / stick izq. | `W` | Flecha arriba |
| `down` | D-pad abajo / stick izq. | D-pad abajo / stick izq. | `S` | Flecha abajo |
| `left` | D-pad izquierda / stick | D-pad izquierda / stick | `A` | Flecha izquierda |
| `right` | D-pad derecha / stick | D-pad derecha / stick | `D` | Flecha derecha |
| `attack` | Botón A / Cruz (0) | Botón A / Cruz (0) | `J` | Numpad 1 |
| `jump` | Botón B / Círculo (1) | Botón B / Círculo (1) | `K` | Numpad 2 |
| `special` | Botón Y / Triángulo (3) | Botón Y / Triángulo (3) | `U` | Numpad 3 |

Diseño previsto del gestor:

```typescript
// src/core/InputManager.ts (previsto, no existe)
export class InputManager {
  static getPlayerVector(scene: Phaser.Scene, playerId: PlayerId): Phaser.Math.Vector2 {
    const pad = scene.input.gamepad?.gamepads[playerId - 1];
    // Stick/D-pad si hay mando; si no, teclas del bloque correspondiente.
  }
}
```

Al implementarlo:

- Mantener compatibilidad con el mapeo actual de P1.
- Asignar el mando por índice de conexión, no por orden de pulsación.
- Aislar la lectura de entrada de la lógica de `Joseph` para que el mismo controlador sirva a P1 y P2.
- Añadir teclas de P2 sin robar las de P1 ni las de sistema del navegador (evitar `F5`, etc.).

## Relacionados

- [`joseph.md`](joseph.md) — cómo consume la entrada el jugador actual.
- [`diseno-previsto.md`](diseno-previsto.md) — cooperativo y arquetipos.
- [`roadmap.md`](roadmap.md) — estado de implementación.
