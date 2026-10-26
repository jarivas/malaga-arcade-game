# Diseño previsto

Resumen: visión del juego completo. Solo Joseph y `TestArenaScene` están implementados; el resto es diseño pendiente. Úsalo para orientar decisiones, no como descripción del estado actual.

## Concepto

- **Género:** arcade brawler lateral 2.5D con scroll horizontal y profundidad en Y, al estilo de *Cadillacs and Dinosaurs*, *Final Fight* y *Streets of Rage*.
- **Ambientación:** Málaga post-apocalíptica, con merdellones y infectados G.R.I.P.E.
- **Modo:** cooperativo local para 2 jugadores.
- **Resolución:** 480 × 270, escalado `FIT` y pixel art.
- **Fases:** a pie con zonas bloqueadas y una fase de conducción a alta velocidad.

## Arquetipos jugables

| Personaje | Estado | Diseño |
| :--- | :--- | :--- |
| Joseph | Implementado (sin combo) | Melee puro con katana permanente. Combo de 3 cortes rápidos con hitbox frontal y empuje lateral; mayor velocidad de desplazamiento. |
| Craz | Previsto | Ranged con fusil de asalto permanente. Munición infinita, disparo recto con cadencia balanceada y retroceso leve; patada defensiva con knockback. |
| Knight | Previsto | Ranged, mismo kit base que Craz. |
| Noa | Previsto | Ranged, mismo kit base que Craz. |

Diferencias finas entre Craz, Knight y Noa: pendientes de definir (stats, animaciones, especial).

## Armas

- **Permanentes:** katana de Joseph; fusil de asalto de los ranged.
- **Recogibles especiales (munición limitada):** revólver de Tax, escopetas, cócteles molotov y granadas obtenidas de barriles destruibles.
- **Implementadas hoy:** tubería, bate, botella y cuchillo (ver [`armas.md`](armas.md)).

## Estructura de fases

### A pie

1. Scroll horizontal por zonas con cámara limitada al mapa.
2. **Lock zones:** al llegar a una X, la cámara se bloquea, aparecen barreras invisibles y una oleada.
3. Al limpiar la zona: jingle arcade, aviso `GO! ➔` parpadeante y desbloqueo de cámara.
4. Acto I previsto: parroquia (`LevelChurchScene`).

### Conducción

- `HighwayScene`: coupé Citroën por la autovía.
- Asfalto con `TileSprite` en bucle y parallax de Miraflores / Valle-Inclán.
- Movimiento vertical entre carriles y embestida frontal para arrollar infectados y romper barricadas.
- Spawner de coches calcinados, baches y coches discoteca enemigos.

## Cooperativo

- Dos jugadores simultáneos con mandos independientes (HTML5 Gamepad API) y teclado.
- Mapeo y diseño del `InputManager` en [`controles.md`](controles.md).
- Requiere separar el controlador de `Joseph` para que P1 y P2 compartan lógica.

## Componentes de combate previstos

- `HealthComponent` con eventos `onDamaged`, `onHealed`, `onDied` e i-frames tras derribo.
- `Hitbox` como `Zone`/sensor que solo daña al bando contrario en el mismo plano.
- `Hurtbox` con flash blanco y knockback.
- `Actor` como base común de física, profundidad y estados.
- `EnemyBase` y una máquina de estados `IDLE / CHASE / ATTACK / HURT / DEAD`.

## Relacionados

- [`roadmap.md`](roadmap.md) — qué falta y en qué orden.
- [`escenas.md`](escenas.md) — detalle de la escena actual y las fases.
- [`combate.md`](combate.md) — reglas vigentes.
