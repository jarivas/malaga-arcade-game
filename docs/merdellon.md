# Merdellón (enemigo)

Resumen: enemigo pandillero de la oleada actual. Persigue a Joseph, recibe daño y muere; **todavía no ataca**. Código: `src/entities/enemies/Merdellon.ts`; la oleada se genera en `src/scenes/TestArenaScene.ts`.

## Stats

- Vida: **75** (3 tajos de katana de 25).
- Velocidad de persecución: **40 px/s** cuando está a más de 30 px.
- Caja de pies: `body.setSize(24, 14)` y `body.setOffset(36, 80)` sobre frames de 96 × 96.
- Escala 1:1, origen en la base, `setDepth(this.y)`.
- Etiqueta flotante de vida sobre el sprite, con `depth = y + 1`.

## Animaciones

Hoja `public/assets/sprites/enemy.png`: 96 × 96 por frame, 5 columnas × 5 filas, 21 frames.

| Animación | Frames | FPS | Repetición | Uso |
| :--- | :--- | ---: | :--- | :--- |
| `enemy-idle` | 0–4 | 7 | Sí | Quieto |
| `enemy-walk` | 5–10 | 10 | Sí | Persecución |
| `enemy-attack` | 11–15 | 12 | No | Definida, **sin usar** |
| `enemy-hurt` | 16–20 | 10 | No | Daño y muerte |

## Comportamiento actual

- Persigue a Joseph usando la **Y del suelo** (`getGroundY()`), no la altura visual del salto.
- Se orienta con `setFlipX(this.x > joseph.x)`.
- Reproduce `enemy-walk` al perseguir y `enemy-idle` al detenerse.
- No hay máquina de estados formal: la IA se resuelve en `update()` con comprobaciones de distancia y aturdimiento.
- No ataca, no bloquea y no esquiva.

## Reacciones al daño

| Fuente | Daño | Reacción |
| :--- | ---: | :--- |
| Katana | 25 | `enemy-hurt`, knockback horizontal 200 px/s, flash 80 ms |
| Especial | 50 | Knockback radial 240 px/s, flash, caída con la última pose de `enemy-hurt`, recuperación a los 800 ms |
| Tajo aéreo | 35 | Knockback radial 170 px/s, recuperación a los 700 ms |
| Proyectil | 35 | Knockback 190 px/s, derribo |
| Bate | 40 | Knockback 300 px/s, derribo automático |
| Golpe a prop | 1 | El prop parpadea; cooldown de 600 ms por enemigo |

- El aturdimiento y el knockback bloquean la persecución mientras duran (`isHurt`, `knockbackUntil`).
- Al llegar a 0 de vida cae con `enemy-hurt`, se desvanece y se destruye; el evento `DESTROY` resta 1 a `activeEnemiesCount` de la escena.

## Oleada

- 4 instancias dinámicas.
- 2 aparecen fuera de pantalla por la izquierda y 2 por la derecha; entran caminando.
- Las alturas Y se reparten entre 140 y 255 en carriles mezclados para evitar solapamientos.
- Cada instancia recibe su propio overlap con la katana y su collider con las barreras del bloqueo.
- Los colliders con las barreras se añaden tras el breve walk-in.

## Previsto

- Máquina de estados `IDLE / CHASE / ATTACK / HURT / DEAD`.
- Ataque cuerpo a cuerpo que dañe a Joseph (la animación `enemy-attack` ya existe).
- Variantes de enemigo y enjambres.

## Relacionados

- [`combate.md`](combate.md) — reglas de daño.
- [`escenas.md`](escenas.md) — oleada y zona de bloqueo.
- [`roadmap.md`](roadmap.md) — pendientes de IA.
