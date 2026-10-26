# HUD y UI

Resumen: HUD fijo con `setScrollFactor(0)` y `depth = 9999`, implementado en `src/ui/HUD.ts` y montado por `TestArenaScene`. Incluye panel de jugador, panel del enemigo golpeado, aviso `GO! ➔` y ayuda de controles.

## Panel de Jugador 1

Posición `(16, 12)`:

- Retrato de Joseph de **32 × 32 px** con marco dorado biselado, textura `portrait-joseph`.
- El bloque de texto y la barra empieza en `x = 54`, a la derecha del retrato.
- `1P JOSEPH` justo encima de la barra.
- Barra de vida de **100 × 8 px** centrada verticalmente con el retrato: marco negro, pista roja oscura y relleno amarillo biselado, proporcional a `currentHealth / maxHealth`.
- `SCORE 000000` (100 por enemigo derrotado y los puntos de cada consumible).
- Contador de vidas `x2` con icono de corazón pixel art.
- Al recibir un golpe fuerte (≥ 20 de daño), el retrato parpadea en rojo 100 ms.
- Si Joseph lleva un arma, se muestra su icono y los usos restantes junto a `1P JOSEPH` (por ejemplo `[tubería] x5`).

## Panel del enemigo activo

Esquina superior derecha:

- Oculto por defecto; aparece con fade in de 120 ms al golpear.
- Icono de aviso y nombre `INFECTADO` a la izquierda, con barra roja/naranja debajo.
- Retrato del enemigo de 32 × 32 en `(440, 12)`, volteado para mirar a la izquierda.
- El retrato parpadea en blanco 90 ms con cada impacto.
- La barra refleja la vida del enemigo golpeado.
- Se oculta con fade out tras 3 s sin daño o cuando ese enemigo muere.

## Otros elementos

- Aviso `GO! ➔`: oculto por defecto; parpadea 3 s en la esquina superior derecha al limpiar la oleada.
- Ayuda de controles: fija en la esquina inferior izquierda para no tapar el panel superior.

## Limitaciones

- No hay minimapa, pantalla de game over ni pausa.
- El contador de vidas es fijo (`x2`) porque todavía no hay pérdida de vidas.
- El panel de enemigo solo muestra al último enemigo golpeado, no una lista.

## Relacionados

- [`escenas.md`](escenas.md) — cuándo aparece el aviso GO y cómo se dispara.
- [`joseph.md`](joseph.md) — evento de vida que alimenta la barra.
- [`merdellon.md`](merdellon.md) — vida del enemigo.
