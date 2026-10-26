# Escenas y fases

Resumen: la única escena jugable es `TestArenaScene`, un nivel arcade con scroll lateral, una zona de bloqueo y una oleada. El resto de escenas y la fase de conducción están diseñados pero **no implementados**. Código: `src/scenes/TestArenaScene.ts`.

## `TestArenaScene` (implementada)

### Mundo y cámara

- Mundo de **1400 × 270 px** (unas 2,9 veces el viewport de 480 × 270).
- Fondo `bg-malaga` (`public/assets/backgrounds/stage_malaga.png`, 720 × 270) repetido con un `TileSprite` de 1400 × 270 y `depth = -1000`.
- El desfase del tile coloca la costura en el borde del bloqueo.
- `physics.world.setBounds(0, 0, 1400, 270)` y `cameras.main.setBounds(0, 0, 1400, 270)`.
- La cámara sigue a Joseph horizontalmente con `startFollow(this.player, true, 0.08, 0.08)`.
- Franja transitable limitada a Y = 135–255 con un `customBoundsRectangle` en las cajas de pies.

### Zona de bloqueo y oleada

- Punto de bloqueo en `scrollX = 480`: la cámara se detiene, se crean dos barreras invisibles con físicas Arcade en los bordes visibles y comienza la oleada.
- 4 Merdellones: 2 entran desde fuera de pantalla por la izquierda y 2 por la derecha.
- Entran caminando y reciben sus colliders con las barreras tras el breve walk-in.
- Alturas Y repartidas entre 140 y 255 en carriles mezclados para evitar solapamientos.
- `activeEnemiesCount` controla los enemigos vivos. Al destruirse el último:
  1. Se eliminan las barreras.
  2. Se reanuda el seguimiento de la cámara.
  3. Aparece el aviso `GO! ➔`.
- El aviso está oculto por defecto y parpadea durante 3 s en la esquina superior derecha con un tween de fade in/fade out.
- Cada enemigo recibe su propio overlap con la katana y su collider con las barreras.

### Contenido

- Joseph en `(240, 200)`.
- Nueve props rompibles (ver [`objetos.md`](objetos.md)).
- Nueve armas repartidas por la calle (ver [`armas.md`](armas.md)).
- HUD y ayuda de controles fijos (ver [`hud.md`](hud.md)).
- En `create()` se registran animaciones y se recortan las texturas de props y armas.

### Orden de profundidad

Fondo `-1000`; actores y props por la Y de sus pies; HUD/GO a `9999`. Ver [`arquitectura.md`](arquitectura.md).

## Fases a pie previstas

1. **Scroll horizontal por zonas:** cámara con límites `(0, 0, mapWidth, 270)`.
2. **Lock zones:** al alcanzar una X, la cámara se bloquea, se activan barreras invisibles y se instancian oleadas de merdellones o infectados G.R.I.P.E.
3. **Indicador `GO! ➔`:** al eliminar la última amenaza, suena el jingle arcade, parpadea el aviso y se desbloquea la cámara.
4. **Actos:** el primero previsto es la parroquia (`LevelChurchScene`), con transiciones entre zonas.

## Fase de conducción prevista

- Escena `HighwayScene`.
- Fondo en bucle con `TileSprite` para el asfalto y capas parallax para Miraflores / Valle-Inclán (`tilePositionX += speed`).
- El coupé Citroën se mueve verticalmente entre carriles (eje Y) y tiene un acelerón/embestida frontal que arrolla infectados y destruye barricadas ligeras.
- Spawner de obstáculos (coches calcinados, baches) y coches discoteca enemigos.
- **No hay nada de esto implementado.**

## Flujo de escenas previsto

`BootScene` (precarga) → `CharacterSelectScene` → `LevelChurchScene` → `HighwayScene` → … con `TestArenaScene` como zona de pruebas. Hoy solo se registra `TestArenaScene` en `src/main.ts`.

## Relacionados

- [`arquitectura.md`](arquitectura.md) — configuración y 2.5D.
- [`merdellon.md`](merdellon.md) — enemigo de la oleada.
- [`diseno-previsto.md`](diseno-previsto.md) — visión completa.
