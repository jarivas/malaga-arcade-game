# Roadmap y limitaciones

Resumen: el prototipo ya tiene un nivel jugable con Joseph, una oleada, props, consumibles, armas y HUD. Falta el bucle de riesgo (que los enemigos ataquen), el cooperativo, más contenido y la fase de conducción.

## Implementado

- `TestArenaScene` con scroll, bloqueo de cámara y oleada de 4 Merdellones.
- Joseph: movimiento, katana, especial, salto, tajo aéreo y daño recibido.
- Merdellón: persecución, daño, knockback, derribo y muerte.
- 9 props rompibles y consumibles (campero, refresco, dinero).
- 9 armas recogibles y proyectiles.
- HUD de jugador y enemigo, aviso GO y ayuda de controles.
- SFX procedurales.
- Normalización de hojas y recorte en runtime.

## Limitaciones actuales

### Combate y jugabilidad

- **El enemigo no ataca**: `enemy-attack` está definida pero sin usar, y Joseph no recibe golpes en partida. La pérdida del arma por daño solo se prueba llamando a `takeDamage()`.
- No hay game over, pérdida de vidas ni pausa; el contador `x2` es decorativo.
- Solo hay una zona de bloqueo y una oleada; no hay oleadas múltiples ni transiciones de nivel.
- No hay fase de conducción.
- Falta equilibrar daño, vida, cooldowns y número de enemigos.
- El ataque de Joseph es único; el combo de 3 cortes del diseño no está implementado.
- No hay más tipos de enemigos ni de armas.

### Cooperativo

- No implementado. No existe `InputManager`, ni P2, ni reparto de cámara/HUD.
- El HUD está pensado para un solo jugador.

### Objetos y economía

- Los props no reaparecen y el consumible depende de una tirada del 80 %: puede no haber curación tras la oleada.
- Solo los nueve props colocados son destructibles; no hay sistema genérico por datos de nivel.
- Las vidas y la puntuación no persisten.

### Arte y assets

- Los recortes de `props_pickups.png` y `pickable_weapons.png` están ajustados a mano a esas hojas concretas. Si se sustituyen, hay que revisar `REGIONS` / `WeaponTextures.ts`.
- `joseph_weapons.png` conserva objetos dibujados en el aire (botella frames 13–14, cuchillo 17–18); el proyectil real se crea en 13/17 y puede haber un par de frames de superposición.
- Las poses de idle por arma son estáticas: la hoja no trae respiración por arma.
- Los contenedores, bolsas y farolas del fondo están horneados: no tienen colisión ni profundidad individual.

### Técnicas

- `tsconfig.json` no activa `strict`; el objetivo es TypeScript estricto.
- No hay tests ni comprobación automática de jugabilidad; `npm run build` solo valida tipos y empaquetado.
- `src/counter.ts` y `src/assets/*` son restos de la plantilla de Vite.

## Próximos pasos sugeridos

1. **Cerrar el bucle de combate:** ataque de Merdellón, daño a Joseph, i-frames tras golpe, game over y reinicio.
2. **Extraer componentes:** `HealthComponent`, `Hitbox`/`Hurtbox` y una base `EnemyBase` con estados, sin romper lo actual.
3. **Cooperativo:** `InputManager`, segundo Joseph, HUD de P2 y cámara que encuadre a ambos.
4. **Contenido:** más oleadas, transición entre zonas y un segundo tipo de enemigo.
5. **Fase de conducción:** `HighwayScene` con `TileSprite`, carriles y spawner.
6. **Pulido:** música, equilibrio, más armas y tipos de enemigo.

## Relacionados

- [`diseno-previsto.md`](diseno-previsto.md) — visión completa.
- [`estructura-proyecto.md`](estructura-proyecto.md) — discrepancias técnicas.
- [`recetas.md`](recetas.md) — cómo abordar las tareas habituales.
