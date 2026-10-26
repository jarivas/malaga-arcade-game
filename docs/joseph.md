# Joseph (jugador)

Resumen: único personaje jugable. Katana permanente, movimiento en 8 direcciones, ataque normal, especial 360°, salto 2.5D con tajo aéreo y armas recogibles. Código: `src/entities/player/Joseph.ts`; se instancia y conecta en `src/scenes/TestArenaScene.ts`.

## Stats y movimiento

- Vida máxima: **100**.
- Velocidad: **140 px/s**, normalizada en diagonal.
- Movimiento en 8 direcciones; volteo horizontal según la dirección.
- Control aéreo al **60 %** de la velocidad de suelo.
- Caja de pies: `body.setSize(24, 14)` y `body.setOffset(36, 80)` sobre frames de 96 × 96.
- Origen en la base del sprite; `setDepth(this.y)` tras el paso de físicas.
- Franja transitable: Y = 135–255 (`customBoundsRectangle` + `setCollideWorldBounds(true)`).
- Aparece en `(240, 200)` mirando a la derecha.

## Animaciones

Hoja principal `public/assets/sprites/joseph.png`: 96 × 96 por frame, 5 columnas × 5 filas, 23 frames.

| Animación | Frames | FPS | Repetición |
| :--- | :--- | ---: | :--- |
| `joseph-idle` | 0–4 | 8 | Sí |
| `joseph-run` | 5–11 | 12 | Sí |
| `joseph-attack` | 13–17 | 15 | No |
| `joseph-hurt` | 18–22 | 10 | No |

El frame 12 se omite de `joseph-run` porque es casi idéntico al 11 y alargaba la pose de rodilla recogida.

Hoja de salto `public/assets/sprites/joseph_jump.png`: 96 × 96, 5 × 2.

| Animación | Frame(s) | Uso |
| :--- | :--- | :--- |
| `joseph-jump-up` | 1 | Subida (`vz > 50`) |
| `joseph-jump-apex` | 2 | Cenit (`-50 ≤ vz ≤ 50`) |
| `joseph-jump-down` | 3 | Caída (`vz < -50`) |
| `joseph-jump-land` | 4 | Aterrizaje, 80 ms |
| `joseph-jump-slash` | 5–7, 15 fps | Tajo aéreo |

`updateAnimationState` no interfiere mientras `isJumping` está activo.

Hoja de armas `public/assets/sprites/joseph_weapons.png`: 96 × 96, 4 × 5.

| Animación / pose | Frames | FPS | Evento |
| :--- | :--- | ---: | :--- |
| `joseph-pickup` | 0–3 | 12 | El arma se equipa y desaparece del suelo en el frame 1 |
| `joseph-attack-pipe` | 4–7 | 15 | Hitbox activa solo en el frame 6 |
| `joseph-attack-bat` | 8–11 | 15 | Hitbox activa solo en el frame 10; derribo |
| `joseph-idle-pipe` | 7 | — | Pose de reposo |
| `joseph-idle-bat` | 8 | — | Pose de reposo (inicio del swing, no el follow-through) |
| `joseph-idle-bottle` | 12 | — | Pose de reposo |
| `joseph-idle-knife` | 16 | — | Pose de reposo |
| `joseph-throw-bottle` | 12–15 | 18 | El proyectil se crea en el frame 14 |
| `joseph-throw-knife` | 16–19 | 18 | El proyectil se crea en el frame 18 |

Mientras lleva un arma y está quieto se usa la pose de idle de esa arma; al lanzarla o perderla vuelve a `joseph-idle`.

## Ataque normal con katana

- Entrada: `J` o botón `A`.
- Daño: **25**.
- Hitbox frontal activa durante los frames 1–3 de `joseph-attack`, sincronizada con `animationupdate`.
- Lunge de **30 px** hacia delante.
- Cooldown: **350 ms**.
- Si lleva tubería o bate, este ataque usa el arma y gasta un uso (ver [`armas.md`](armas.md)). La tubería solo conecta en su frame 6 y el bate en el frame 10.

## Ataque especial «Giro Devastador»

- Entrada: `U` o `J` + `K`; en mando, `Y` o `A` + `B`.
- Duración: **400 ms** con `isSpecialAttacking` e `isInvulnerable`; el movimiento se detiene.
- Hitbox circular de radio **55 px** centrada en los pies, activa **250 ms**.
- Daño: **50**, flash blanco, knockback radial y derribo temporal.
- Efecto visual: anillo 360° blanco/azul que se expande de radio 10 a 50 y se desvanece en 250 ms, junto con un giro rápido del sprite.
- Coste: **8 HP solo si alcanza al menos a un enemigo**; nunca deja a Joseph por debajo de 1 HP. Si no alcanza a nadie, no cuesta vida.
- Cooldown: **1000 ms**.

## Salto 2.5D y ataque aéreo

- Coordenada `z` falsa: `gravityZ = -600`, `jumpForce = 280`, estado `isJumping`, velocidad `vz` y `isJumpAttacking`.
- La sombra elíptica permanece en la `y` real del suelo y se encoge ligeramente con la altura.
- Entrada: `Espacio` o `K`; en mando, botón `B`.
- La pose se elige por `vz`: `> 50` subida, entre `-50` y `50` cenit, `< -50` caída.
- Ataque aéreo: `J` o botón `A`; reproduce `joseph-jump-slash`, **35 de daño**, flash blanco y derribo garantizado.
- Hitbox aérea de **92 × 64 px** anclada al suelo, activa durante el tajo.
- Con `z > 20` esquiva ataques terrestres bajos.
- Al aterrizar: quieto → `joseph-jump-land` 80 ms → idle; en movimiento → enlaza con `joseph-run`.

## Daño recibido

- `takeDamage(DamageData)` resta vida y llama a `onHealthChanged(newHealth, maxHealth)`, que la escena conecta con la barra del HUD.
- Reproduce `joseph-hurt`, aplica knockback durante 150 ms y un flash.
- Es invulnerable durante el especial y con `z > 20`.
- Si está recogiendo un arma y recibe daño antes del frame 1, la recogida se cancela y el arma sigue en el suelo.
- Si lleva un arma sin lanzar, la suelta en el suelo con los usos restantes y vuelve a la katana.
- **Hoy ningún enemigo ataca**, así que este flujo solo se puede probar llamando a `takeDamage()` directamente.

## Relacionados

- [`combate.md`](combate.md) — reglas de daño y profundidad.
- [`armas.md`](armas.md) — armas recogibles, usos y proyectiles.
- [`controles.md`](controles.md) — mapeo de teclado y mando.
