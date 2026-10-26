# Combate

Resumen: combate 2.5D por solapamiento de hitboxes en el mismo carril de profundidad, con daño, knockback, i-frames y derribos. **No existe una clase genérica de hitbox/hurtbox**: cada ataque y enemigo registra sus propios overlaps.

## Tipos actuales (`src/types/combat.ts`)

```typescript
export type Team = 'player' | 'enemy';

export interface DamageData {
  damage: number;
  knockbackForce: number;
  direction: Phaser.Math.Vector2;
  sourceTeam: Team;
}

export interface CharacterStats {
  maxHealth: number;
  currentHealth: number;
  moveSpeed: number;
  attackDamage: number;
  attackCooldown: number;
  invincibilityTime: number;
}
```

> La documentación antigua hablaba de `amount`, `knockback`, `team` y `source`, y de un equipo `neutral`. Los nombres reales son los de arriba. `CharacterStats` está definido pero los actores siguen usando constantes locales.

## Reglas de combate

1. **Mismo carril:** un golpe solo conecta si `Math.abs(attacker.y - target.y) <= umbral`. Referencia: **16 px**; la hitbox aérea y la especial tienen sus propios anchos/radios.
2. **Hitbox por ataque:** zonas o rectángulos efímeros activados durante frames concretos de la animación. Se implementan con `Phaser.GameObjects.Zone` + cuerpo Arcade, o con comprobaciones de distancia. La tubería solo conecta en el frame 6 y el bate en el frame 10.
3. **Hurtbox:** el cuerpo del receptor. En la práctica es el cuerpo Arcade de los pies más la comprobación de profundidad.
4. **Daño:** se aplica una sola vez por impacto y se marca al objetivo para evitar dobles golpes en el mismo frame.
5. **Knockback:** vector horizontal/radial con duración; durante el aturdimiento el enemigo no decide ni persigue.
6. **Flash:** `setTint(0xffffff)` breve (80–90 ms) al recibir daño.
7. **I-frames:** Joseph es invulnerable durante el especial (400 ms) y mientras `z > 20` (esquiva ataques terrestres bajos). No hay i-frames generales tras recibir daño.
8. **Derribo:** el especial, el ataque aéreo, el bate y los proyectiles derriban al Merdellón con tiempos de recuperación distintos.

## Tabla de daño

| Ataque | Daño | Efecto |
| :--- | ---: | :--- |
| Katana (normal) | 25 | Knockback horizontal corto |
| Ataque especial | 50 | Knockback radial + derribo (800 ms de recuperación) |
| Tajo aéreo | 35 | Derribo garantizado (700 ms) |
| Tubería | 30 | Cuerpo a cuerpo, 5 usos |
| Bate | 40 | Derribo automático, 5 usos |
| Botella | 35 | Proyectil, 1 uso, esquirlas verdes |
| Cuchillo | 35 | Proyectil, 1 uso, chispas metálicas |
| Golpe a prop | 1 | Cualquier ataque; 600 ms de cooldown por enemigo |

## Vida y costes

| Entidad | Vida |
| :--- | ---: |
| Joseph | 100 |
| Merdellón | 75 |
| Props (cubo/caja) | 2 |

- El especial cuesta 8 HP **solo si alcanza al menos a un enemigo** y nunca deja a Joseph por debajo de 1 HP.
- Cooldown de katana: 350 ms. Cooldown del especial: 1000 ms.
- Un enemigo derribado que impacta contra un prop también le resta 1 punto de vida.

## Componentes previstos (no implementados)

El diseño original contempla clases reutilizables. Hoy la lógica vive en `Joseph.ts`, `Merdellon.ts` y `TestArenaScene.ts`:

- `HealthComponent` con eventos `onDamaged`, `onHealed`, `onDied` e i-frames.
- `Hitbox` como `Zone` o sensor Arcade que emite daño solo al bando contrario y en el mismo plano.
- `Hurtbox` como receptor con flash y knockback.

Si se extraen, mantener las reglas de profundidad y no romper los overlaps actuales de la escena.

## Relacionados

- [`joseph.md`](joseph.md) — ataques, animaciones y timing exacto.
- [`merdellon.md`](merdellon.md) — reacciones y muerte del enemigo.
- [`arquitectura.md`](arquitectura.md) — modelo 2.5D y Y-Sort.
