# Recetas para tareas habituales

Resumen: patrones y prompts para añadir contenido sin romper las convenciones. Antes de empezar, lee [`arquitectura.md`](arquitectura.md) y el documento del tema; al terminar, ejecuta `npm run build` y actualiza la documentación.

## Reglas comunes

- TypeScript, sin `any`. Tipar props, estados y callbacks.
- Phaser 4.2.1 y físicas Arcade con gravedad 0.
- Cuerpo en los pies (`setSize` / `setOffset`), origen en la base y `setDepth(y)`.
- Respetar la franja Y = 135–255 y el umbral de profundidad de combate (16 px).
- Daño mediante `DamageData` (`damage`, `knockbackForce`, `direction`, `sourceTeam`) o mediante los métodos existentes del enemigo.
- No introducir assets externos si se puede mantener el estilo procedural/pixel art.
- Comprobar que el HUD y el fondo no cambian de profundidad por accidente.

## Nuevo enemigo

> Crea `src/entities/enemies/GripeZombie.ts` a partir de `Merdellon.ts`. Usa frames de 96 × 96, cuerpo de pies 24 × 14 con offset (36, 80), origen en la base y `setDepth(y)`. Implementa estados `IDLE / CHASE / ATTACK / HURT / DEAD`, persecución con `getGroundY()`, ataque con hitbox en el mismo carril, reacción a `takeDamage`, knockback y muerte. Regístralo en la oleada de `TestArenaScene`.

Checklist:

- Definir animaciones con índices contiguos y fps coherentes.
- Reutilizar el patrón de etiqueta de vida y flash blanco.
- Añadir su overlap con la katana y con los proyectiles.
- Actualizar [`merdellon.md`](merdellon.md) o crear su documento, y [`roadmap.md`](roadmap.md).

## Nueva arma o proyectil

> Crea `RifleBullet.ts` en `src/entities/objects/` como `Phaser.Physics.Arcade.Sprite`. Debe recibir dirección, velocidad fija, rango de vida y comprobar impacto contra enemigos dentro del umbral Y para aplicar `DamageData`. Añade textura y animación en `WeaponTextures.ts` si procede.

Checklist:

- `vx`/`vy` coherentes con el carril; sin gravedad.
- Destrucción por impacto, tiempo y salida del mundo.
- Efecto visual de impacto y sonido.
- Si es recogible, añadir definición en `WeaponItem.ts`, icono de HUD y posición.
- Actualizar [`armas.md`](armas.md).

## Nuevo prop rompible o consumible

> Añade un `BreakableObject` en `TestArenaScene` con posición, textura y vida. Mantén el cuerpo estático en la base, el cooldown de 600 ms por enemigo y la tirada de consumible. Si usas una hoja nueva, actualiza `REGIONS` en `PropTextures.ts`.

Checklist:

- Sombra y `setDepth(y)`.
- Feedback de golpe y rotura.
- Comprobar que se puede pasar por delante y por detrás.
- Actualizar [`objetos.md`](objetos.md).

## Nueva escena

> Crea `src/scenes/MiEscena.ts` extendiendo `Phaser.Scene`. Configura mundo, cámara, fondo con `TileSprite`, límites y HUD. Regístrala en el array `scene` de `src/main.ts` y define cómo se entra y se sale.

Checklist:

- `physics.world.setBounds` y `cameras.main.setBounds` coherentes.
- Y-Sort y capas de profundidad.
- HUD con `setScrollFactor(0)` y `depth = 9999`.
- Actualizar [`escenas.md`](escenas.md).

## Cooperativo / segunda entrada

> Extrae la lectura de entrada de `Joseph` a `src/core/InputManager.ts` con `getPlayerVector(scene, playerId)` y acciones `attack`, `jump`, `special`. Mantén el mapeo actual de P1 y añade el de P2. Haz que la escena instancie dos jugadores y un HUD por jugador.

Checklist:

- No romper el control de P1.
- Evitar teclas reservadas del navegador.
- Cámara que encuadre a ambos jugadores.
- Actualizar [`controles.md`](controles.md) y [`roadmap.md`](roadmap.md).

## Cierre de una tarea

1. `npm run build` sin errores de tipos.
2. Probar `npm run dev` y el flujo afectado.
3. Revisar profundidad, colisiones y límites.
4. Actualizar el documento temático y, si cambia el alcance, [`roadmap.md`](roadmap.md).
