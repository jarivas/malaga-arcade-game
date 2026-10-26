# Objetos rompibles y consumibles

Resumen: nueve props destructibles repartidos por la calle sueltan consumibles al romperse. Código: `src/entities/objects/BreakableObject.ts`, `PickupItem.ts`, `PropTextures.ts` y `TextureUtils.ts`. Arte: `public/assets/sprites/props_pickups.png`.

## Props rompibles

| Objeto | Posición | Vida |
| :--- | :--- | ---: |
| Caja de madera | `(96, 210)` | 2 |
| Cubo verde con ruedas | `(196, 162)` | 2 |
| Caja de madera | `(300, 228)` | 2 |
| Cubo verde con ruedas | `(420, 174)` | 2 |
| Caja de madera | `(1012, 214)` | 2 |
| Cubo verde con ruedas | `(1096, 164)` | 2 |
| Caja de madera | `(1184, 230)` | 2 |
| Cubo verde con ruedas | `(1250, 172)` | 2 |
| Caja de madera | `(1330, 224)` | 2 |

- Sprites independientes con cuerpo Arcade **estático** limitado a su base: 26 × 10 px el cubo y 24 × 10 px la caja.
- Sombra elíptica y `setDepth(y)`; Joseph y los enemigos colisionan con ellos, pero pueden pasar por delante o por detrás gracias al Y-Sort.
- Cada impacto resta **1 punto de vida**, independientemente del ataque (tajo, especial o tajo aéreo).
- Un enemigo derribado que impacte contra un prop también le resta 1. Hay un cooldown de **600 ms por enemigo** para que un cuerpo volando no lo rompa en varios frames.
- Si el golpe no lo destruye, parpadea en blanco 90 ms y se balancea ligeramente.
- Al llegar a 0: `playBreak()`, 10–11 escombros con arco parabólico, giro y desvanecimiento, polvo y destrucción. El cuerpo estático desaparece.
- El cubo usa `fx-debris-metal`; la caja, `fx-debris-wood`.
- Con un **80 %** de probabilidad suelta un consumible.

## Consumibles

| Consumible | Efecto | Puntos | Aspecto |
| :--- | :--- | ---: | :--- |
| Campero | +30 HP | +500 | Campero malagueño tostado |
| Refresco | +15 HP | +200 | Lata roja |
| Dinero | — | +1000 | Bolsa verde de dinero |

Probabilidades del tipo: **campero 30 %**, **refresco 45 %**, **dinero 25 %**.

- El consumible sale despedido en un arco parabólico de **430 ms** y aterriza en el asfalto. Su cuerpo físico permanece desactivado durante el vuelo.
- Al aterrizar se activa y el sprite parpadea entre alfa 1 y 0,38 (yoyo de 420 ms, repetido).
- Se recoge por solapamiento con Joseph: suma puntos y muestra `+N` en amarillo; la curación actualiza el HUD y muestra `+N HP` en verde con la cantidad **realmente restaurada**.
- A plena salud, el consumible de curación no muestra texto de vida pero sigue dando puntos.
- Los textos flotantes suben y se desvanecen en 900 ms.
- No reaparecen: si la tirada del 80 % falla, no hay curación garantizada.

## Arte de props y consumibles

`props_pickups.png` es una hoja de 1024 × 1024 generada con IA sobre fondo magenta `#FF00FF`. `PropTextures.ts` la recorta en `create()` y crea texturas canvas con alfa.

| Clave | Región de origen | Tamaño final |
| :--- | :--- | :--- |
| `prop-bin` | cubo verde, `(34, 26)` 236 × 317 | 24 × 32 |
| `prop-crate` | caja de madera, `(311, 30)` 269 × 313 | 22 × 26 |
| `item-campero` | campero tostado, `(27, 774)` 273 × 208 | 18 × 14 |
| `item-soda` | lata roja, `(334, 774)` 106 × 208 | 8 × 15 |
| `item-money` | bolsa de dinero, `(599, 771)` 215 × 218 | 16 × 16 |
| `fx-debris-wood` | astillas, `(719, 604)` 64 × 64 | 8 × 8 |
| `fx-debris-metal` | chatarra, `(815, 583)` 64 × 64 | 8 × 8 |

- El croma se elimina **antes** de reescalar: se hacen transparentes los píxeles con rojo y azul altos y verde bajo, y se corrige el halo semitransparente para evitar un borde rosa.
- El reescalado usa reducciones sucesivas a la mitad con suavizado y un ajuste final. Un `NEAREST` directo desde la ilustración de alta resolución producía ruido y píxeles sueltos.
- Cada textura conserva la proporción del recorte original; las cajas de colisión de los props siguen siendo 26 × 10 (cubo) y 24 × 10 (caja).
- Los escombros son imágenes de 8 × 8 con escala, giro, volteo y trayectoria aleatorios, no rectángulos dibujados.

> Los recortes están ajustados a mano a esta hoja concreta. Si se sustituye la imagen, hay que revisar `REGIONS` en `PropTextures.ts`.

## Relacionados

- [`armas.md`](armas.md) — el otro sistema de pickups.
- [`assets.md`](assets.md) — pipeline general de hojas.
- [`hud.md`](hud.md) — puntuación y vida.
