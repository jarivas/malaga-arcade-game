# Instrucciones de proyecto para agentes

Este es el punto de entrada para trabajar en **G.R.I.P.E.** (Phaser 4.2.1 + TypeScript + Vite). La documentación está dividida por temas en [`docs/`](docs/README.md): carga solo lo que necesites.

**Regla de oro:** el código es la fuente de verdad. Si un documento y el código discrepan, gana el código; corrige el documento en la misma tarea.

## 1. Reglas no negociables

- **Motor:** Phaser **4.2.1** (`package.json`). No usar APIs de Phaser 3 que hayan cambiado.
- **Resolución:** 480 × 270, `Phaser.Scale.FIT`, `CENTER_BOTH`, `pixelArt: true`, `antialias: false`, `roundPixels: true`.
- **Físicas:** Arcade con `gravity: { x: 0, y: 0 }`. La `y` es profundidad de suelo, no altura.
- **Y-Sort:** actores y props usan `setDepth(y)` con la Y de los pies, después del paso de físicas. Fondo `-1000`; HUD/GO `9999`.
- **Caja de pies:** en frames de 96 × 96, `body.setSize(24, 14)` y `body.setOffset(36, 80)`, origen en la base.
- **Profundidad de combate:** un golpe solo conecta si `|attacker.y - target.y| <= 16` (o el umbral propio del ataque).
- **Salto:** Joseph usa `z`, `vz` y `gravityZ`; la `y` física sigue en el suelo. Para apuntar o perseguir usa `getGroundY()`, no la `y` visual.
- **Carriles:** la franja transitable es Y = 135–255; no salirse sin actualizar límites y cámara.
- **Tipos:** TypeScript sin `any`. Los tipos de combate viven en `src/types/combat.ts` (`Team`, `DamageData`, `CharacterStats`).
- **Assets:** los cargables van en `public/assets/`; las hojas originales en `assets/`. No añadir dependencias ni assets externos sin necesidad.
- **Spritesheets:** verifica el tamaño real del archivo antes de tocar `frameWidth`/`frameHeight`. Las hojas cargadas de Joseph y el enemigo usan frames de **96 × 96**; `pickable_weapons.png` se recorta en runtime porque no es una rejilla uniforme. No cargues las hojas originales de 1024 sin regenerar el pipeline (ver [`docs/assets.md`](docs/assets.md)).
- **Idioma:** documentación y textos de juego en español; identificadores y comentarios de código en inglés.

## 2. Estado: implementado vs previsto

Implementado hoy:

- `TestArenaScene`, Joseph, Merdellón, props, consumibles, armas, HUD y SFX.
- Un solo jugador. Un solo nivel. Sin ataques enemigos.

Previsto y **no implementado**: cooperativo, P2, `InputManager`, ataques enemigos, game over, más oleadas, `BootScene`/`CharacterSelectScene`/`LevelChurchScene`/`HighwayScene`, componentes genéricos de combate, música. No los describas como existentes ni crees carpetas vacías por adelantado.

## 3. Orden de lectura

| Si la tarea trata de... | Lee |
| :--- | :--- |
| Arquitectura, cámara, profundidad | [`docs/arquitectura.md`](docs/arquitectura.md) |
| Controles o cooperativo | [`docs/controles.md`](docs/controles.md) |
| Daño, hitboxes, stats | [`docs/combate.md`](docs/combate.md) |
| Joseph | [`docs/joseph.md`](docs/joseph.md) |
| Enemigos | [`docs/merdellon.md`](docs/merdellon.md) |
| Props y consumibles | [`docs/objetos.md`](docs/objetos.md) |
| Armas y proyectiles | [`docs/armas.md`](docs/armas.md) |
| Escenas y fases | [`docs/escenas.md`](docs/escenas.md) |
| HUD | [`docs/hud.md`](docs/hud.md) |
| Sonido | [`docs/audio.md`](docs/audio.md) |
| Assets | [`docs/assets.md`](docs/assets.md) |
| Estructura y comandos | [`docs/estructura-proyecto.md`](docs/estructura-proyecto.md) |
| Visión de producto | [`docs/diseno-previsto.md`](docs/diseno-previsto.md) |
| Qué falta | [`docs/roadmap.md`](docs/roadmap.md) |
| Patrones de implementación | [`docs/recetas.md`](docs/recetas.md) |

## 4. Convenciones de código

- Clases de entidad: extienden `Phaser.Physics.Arcade.Sprite`, configuran cuerpo/origen/depth en el constructor y exponen `takeDamage()` cuando corresponda.
- Usa constantes con nombre para daños, cooldowns, velocidades y profundidades. No números mágicos dispersos.
- Reutiliza `TextureUtils.ts` para croma/reescalado y `PropTextures.ts` / `WeaponTextures.ts` para recortes.
- Los efectos visuales y textos flotantes se destruyen solos; evita objetos huérfanos en cada ataque.
- No cambies la API pública de `Joseph`, `Merdellon`, `HUD` ni de los pickups sin actualizar la escena y la documentación.
- Mantén el estilo existente: nombres claros, métodos pequeños, sin dependencias nuevas si se puede resolver con Phaser.

## 5. Verificación

Antes de dar una tarea por terminada:

1. `npm run build` debe pasar sin errores de TypeScript.
2. Si hay cambios jugables, probar `npm run dev` y el flujo afectado.
3. Revisar visualmente profundidad, colisiones, límites del mundo y HUD.
4. Comprobar que no se han roto los controles de P1.

## 6. Documentación

- Actualiza el documento temático afectado. Si cambia el alcance, actualiza también [`docs/roadmap.md`](docs/roadmap.md).
- Si añades un sistema nuevo, crea un documento pequeño y enlázalo en [`docs/README.md`](docs/README.md).
- No dupliques tablas o detalles: deja el dato en un documento y enlaza desde el resto.
- Marca siempre lo implementado frente a lo previsto.

## 7. Recetas rápidas

Para crear un enemigo, arma, prop, escena o el cooperativo, sigue [`docs/recetas.md`](docs/recetas.md). Incluye prompts base y checklists de cierre.
