# Armas y proyectiles

Resumen: nueve armas repartidas por la calle. Tubería y bate son cuerpo a cuerpo con usos; botella y cuchillo se lanzan como proyectiles. Código: `WeaponItem.ts`, `WeaponProjectile.ts` y `WeaponTextures.ts` en `src/entities/objects/`.

## Hojas de sprites

- `public/assets/sprites/pickable_weapons.png` (1024 × 1024): armas tiradas, iconos de HUD, esquirlas y fotogramas de rotación de botella y cuchillo. Se recorta en `create()` con `WeaponTextures.ts` y `TextureUtils.ts` (croma magenta y croma azul para las tarjetas de iconos).
- `public/assets/sprites/joseph_weapons.png` (384 × 480, 4 × 5 de 96 × 96): animaciones de Joseph para recoger, atacar y lanzar. Ver [`joseph.md`](joseph.md).

Los sprites del suelo usan **el objeto más a la izquierda de cada fila** de la hoja: fila 0 cuchillo, fila 1 botella, fila 2 bate y fila 3 tubería. No se reutilizan las poses de rotación o de combate.

| Clave | Origen | Tamaño | Uso |
| :--- | :--- | :--- | :--- |
| `weapon-pipe` | tubería, fila 3 izquierda, `(30, 926)` 172 × 56 | 44 × 14 | Tubería en el suelo |
| `weapon-bottle` | botella, fila 1 izquierda, `(30, 314)` 92 × 182 | 12 × 24 | Botella en el suelo |
| `weapon-bat` | bate, fila 2 izquierda, `(28, 654)` 426 × 63 | 44 × 7 | Bate en el suelo |
| `weapon-knife` | cuchillo, fila 0 izquierda, `(19, 150)` 230 × 35 | 44 × 7 | Cuchillo en el suelo |
| `icon-pipe` | tarjeta azul, `(494, 776)` 166 × 161 | 16 × 16 | Icono de HUD |
| `icon-bottle` | tarjeta azul, `(831, 213)` 143 × 143 | 16 × 16 | Icono de HUD |
| `icon-bat` | tarjeta azul, `(473, 589)` 167 × 161 | 16 × 16 | Icono de HUD |
| `icon-knife` | tarjeta azul, `(831, 30)` 143 × 144 | 16 × 16 | Icono de HUD |
| `fx-glass-shard` | esquirla, `(309, 443)` 37 × 38 | 8 × 8 | Impacto de botella |
| `fx-metal-spark` | procedural 7 × 3 | 7 × 3 | Chispas del cuchillo |
| `projectile-bottle` | 4 botellas, `(259, 238)`, `(382, 243)`, `(527, 236)`, `(655, 244)` | 4 × 16 × 16 | Proyectil |
| `projectile-knife` | 4 cuchillos, `(285, 26)`, `(357, 22)`, `(512, 30)`, `(686, 30)` | 4 × 20 × 20 | Proyectil |

## Posiciones y stats

| Posición | Arma |
| :--- | :--- |
| `(150, 214)` | Tubería |
| `(352, 166)` | Botella |
| `(430, 238)` | Bate |
| `(520, 150)` | Cuchillo |
| `(640, 210)` | Cuchillo |
| `(760, 238)` | Botella |
| `(1080, 168)` | Tubería |
| `(1200, 238)` | Bate |
| `(1340, 164)` | Cuchillo |

| Arma | Tipo | Usos | Daño |
| :--- | :--- | ---: | ---: |
| Tubería | Cuerpo a cuerpo a dos manos | 5 | 30 |
| Bate | Cuerpo a cuerpo a dos manos | 5 | 40 |
| Botella | Arrojadiza | 1 | 35 |
| Cuchillo | Arrojadiza | 1 | 35 |

## Recogida y HUD

- Son pickups de solapamiento: no bloquean el movimiento.
- Al recogerlos, el objeto desaparece en el frame 1 de `joseph-pickup`, Joseph reproduce la animación y el HUD muestra el icono con los usos restantes junto a `1P JOSEPH` (por ejemplo `[tubería] x5`).
- Mientras lleva un arma y está quieto usa la pose de idle correspondiente.
- Las armas del suelo **no caducan**: permanecen hasta recogerse, romperse o lanzarse.

## Uso cuerpo a cuerpo

- **Tubería:** ataque normal (`J`/`A`), `joseph-attack-pipe` (frames 4–7, 15 fps). La hitbox solo está activa en el frame 6. El primer impacto de cada ataque gasta un uso; al llegar a 0 se rompe, desaparece el icono y vuelve la katana.
- **Bate:** `joseph-attack-bat` (frames 8–11, 15 fps), hitbox frontal de **75 px** activa solo en el frame 10, **40 HP** y derribo automático. 5 usos; al romperse emite `fx-debris-wood` y `playBreak()`.
- El especial y el tajo aéreo también gastan un uso de tubería o bate.

## Uso arrojadizo

- Botella y cuchillo se lanzan con el ataque normal.
- Joseph reproduce `joseph-throw-bottle` (12–15, 18 fps) o `joseph-throw-knife` (16–19, 18 fps); en el frame 14 (botella) o 18 (cuchillo) consume el objeto, borra el icono y crea el proyectil.
- El proyectil sale de la mano en línea recta horizontal (`vy = 0`) con `vx = ±500` para la botella y `vx = ±600` para el cuchillo.
- La rotación usa **dos frames alternados** de la hoja de proyectiles: botella a **12 fps** (poses 0 y 1) y cuchillo a **15 fps** (poses 1 y 2). El cuchillo evita la pose 0, que es un perfil de 3 px y se ve como un palo en vuelo. Las texturas de runtime conservan cuatro poses.
- Se destruye al impactar, a los 2,5 s o al salir del escenario.
- Impacto: **35 HP** y derribo con retroceso horizontal corto. Botella → esquirlas `fx-glass-shard`; cuchillo → chispas `fx-metal-spark`. Se destruye en el primer impacto.
- Si Joseph recibe daño mientras lleva un arma sin lanzar, la suelta con los usos restantes y vuelve a la katana. El arma soltada no puede recogerse hasta que Joseph se aleje al menos **28 px**.

## Limitaciones conocidas

- En la hoja original de 1024 × 1024, las celdas 5/6 y 13/14 de una rejilla 4 × 4 contienen varios recortes u objetos, no un único proyectil. Por eso no se usan como frames literales: se mantiene el pipeline normalizado y se animan dos poses equivalentes de cada hoja de rotación.
- Las regiones de `WeaponTextures.ts`, el recorte azul de los iconos y los fotogramas de rotación dependen de esta hoja concreta. Si se sustituye, hay que revisar las coordenadas.
- `joseph_weapons.png` conserva la botella dibujada en el aire en los frames 13–14 y el cuchillo en 17–18. El proyectil real se crea en el primer frame en que el objeto ya ha salido (13/17), así que durante un par de frames pueden verse el objeto pintado y el proyectil superpuestos.
- Las poses de idle por arma son estáticas (un solo frame): la hoja no incluye respiración por arma.

## Relacionados

- [`joseph.md`](joseph.md) — animaciones y ataques base.
- [`combate.md`](combate.md) — daño y knockback.
- [`assets.md`](assets.md) — pipeline de recorte.
