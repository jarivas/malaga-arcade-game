# Arquitectura técnica

Resumen: **Phaser 4.2.1 + TypeScript + Vite**, resolución base **480 × 270**, físicas **Arcade sin gravedad**, pixel art y perspectiva 2.5D con Y-Sort. Solo hay una escena jugable, `TestArenaScene`.

## Configuración del juego

Definida en `src/main.ts`:

- `type: Phaser.AUTO`, padre `#app`, `width: 480`, `height: 270`.
- `scale.mode: Phaser.Scale.FIT` y `scale.autoCenter: Phaser.Scale.CENTER_BOTH`.
- `pixelArt: true`, `antialias: false`, `roundPixels: true`.
- Físicas `arcade` con `gravity: { x: 0, y: 0 }`; el movimiento ocurre en el plano del suelo.
- `input.gamepad: true`.
- Fondo de canvas `#1a1a24`.
- Solo se registra `TestArenaScene` en el array `scene`.

`src/style.css` monta el canvas a pantalla completa dentro de `#app`, sin márgenes del `body`, con letterboxing oscuro si la ventana no es 16:9.

## Modelo 2.5D

La posición `y` representa **profundidad de suelo**, no altura. Reglas:

1. **Y-Sort:** cada actor ajusta su profundidad a la `y` de sus pies después del paso de físicas.
   - Fondo: `depth = -1000`.
   - Actores, props y sombras: `depth ≈ y` (con pequeños sesgos para sombras y textos).
   - HUD, aviso GO y textos fijos: `depth = 9999`.
2. **Caja de colisión en los pies:** el cuerpo Arcade cubre solo la base del sprite.
   - Joseph y Merdellón: `body.setSize(24, 14)` y `body.setOffset(36, 80)` sobre frames de 96 × 96, con origen en la base.
   - Props: 26 × 10 px (cubo) y 24 × 10 px (caja).
   - Así se puede caminar por delante o por detrás de props y actores.
3. **Plano de combate:** un golpe solo conecta si `|attacker.y - target.y|` es menor que el umbral del ataque (referencia: 16 px).
4. **Salto falso:** Joseph usa una coordenada `z` propia (`vz`, `gravityZ`) para el salto; la `y` física sigue siendo la del suelo. La sombra se queda en la `y` real. Con `z > 20` esquiva ataques terrestres bajos.
5. **Carriles:** la franja transitable se limita a Y = 135–255 mediante un `customBoundsRectangle` en las cajas de pies (`setCollideWorldBounds(true)`).
6. **Escala:** Joseph y Merdellón se dibujan a escala 1:1 (`setScale(1)`), con frames de 96 × 96.

## Físicas y movimiento

- Velocidad de Joseph: 140 px/s, con normalización diagonal.
- Merdellón persigue a 40 px/s cuando está a más de 30 px.
- El cuerpo físico nunca representa la altura visual del salto: para apuntar o perseguir se usa `getGroundY()`, no `sprite.y` cuando hay `z`.
- Los props rompibles usan cuerpos **estáticos**; los pickups y armas usan solapamiento (no bloquean el paso).
- Proyectiles: botella a `vx = ±500` y cuchillo a `vx = ±600`, siempre con `vy = 0`; cuerpo Arcade y destrucción por impacto, tiempo o salida del mundo.

## Escenas y flujo

Hoy:

1. `TestArenaScene` arranca directamente. En su `create()` registra animaciones, recorta texturas (`PropTextures`, `WeaponTextures`), monta el fondo, el jugador, el HUD, los props y las armas.

Previsto (no implementado): `BootScene` (precarga), `CharacterSelectScene`, `LevelChurchScene` (Acto I: parroquia), `HighwayScene` (conducción), `TestArenaScene` (zona de pruebas). Ver [`escenas.md`](escenas.md).

## Entradas

- Hoy el teclado y el gamepad se consultan desde `src/entities/player/Joseph.ts`.
- No existe `InputManager`. El diseño previsto para dos jugadores está en [`controles.md`](controles.md).

## Estado y persistencia

- La puntuación, las vidas y la vida se gestionan en la escena y el HUD; no hay guardado ni persistencia.
- El HUD es un conjunto de objetos con `setScrollFactor(0)` y `depth = 9999` (ver [`hud.md`](hud.md)).

## Capas de profundidad

| Elemento | Depth |
| :--- | :--- |
| Fondo (`bg-malaga`) | `-1000` |
| Sombras | `y - 0.1` aprox. |
| Props, actores, armas, proyectiles | `y` (+ sesgo pequeño) |
| Textos flotantes y etiquetas de vida | `y + 0.7 … y + 1` |
| HUD, GO, ayuda de controles | `9999` |

## Relacionados

- [`combate.md`](combate.md) — daño, hitboxes y profundidad de combate.
- [`escenas.md`](escenas.md) — contenido y flujo de la escena actual.
- [`estructura-proyecto.md`](estructura-proyecto.md) — árbol de archivos.
