# G.R.I.P.E. - El Fin del Mundo Comienza en Málaga
## Guía de Desarrollo e Instrucciones de Proyecto para OpenCode (Phaser 3 + TypeScript + Vite)

---

### 1. Resumen Técnico y Arquitectura
* **Motor:** Phaser 3 (`phaser`).
* **Lenguaje:** **TypeScript** estricto (`noImplicitAny: true`, interfaces y tipos definidos).
* **Entorno de compilación:** Vite (`vite`, `@types/node`).
* **Género:** 2.5D Arcade Beat 'em Up / Brawler lateral (estilo *Cadillacs and Dinosaurs*, *Final Fight*, *Streets of Rage*).
* **Fases especiales:** Conducción en autovía a alta velocidad con el coupé Citroën (scroll infinito con `TileSprite` y físicas arcade).
* **Resolución base:** 480x270 px (aspect ratio 16:9 retro arcade).
  * Modo de escalado: `Phaser.Scale.FIT`, centrado automático `Phaser.Scale.CENTER_BOTH`.
  * Filtro de píxeles: `pixelArt: true` (sin suavizado antialiasing, píxeles nítidos).
* **Modo de juego:** Cooperativo local (2 jugadores simultáneos con mandos independientes mediante HTML5 Gamepad API y teclado).

---

### 2. Estructura de Tipos e Interfaces en TypeScript
Todo código generado por OpenCode debe seguir una estructura fuertemente tipada:

```typescript
// src/types/combat.ts
export type Team = 'player' | 'enemy' | 'neutral';

export interface DamageData {
  amount: number;
  knockback: Phaser.Math.Vector2;
  team: Team;
  source: Phaser.GameObjects.GameObject;
}

export interface CharacterStats {
  maxHealth: number;
  currentHealth: number;
  moveSpeed: number;
  attackPower: number;
}

export type PlayerId = 1 | 2;
```

---

### 3. Profundidad 2.5D y Físicas Arcade (Arcade Physics)
En un Beat 'em up, el movimiento ocurre en el plano X/Y simula profundidad de suelo:

1. **Y-Sort (Orden de Profundidad):**
   * En el método `update()` de cada actor (o en la escena principal), se sincroniza el depth con la posición vertical:
     ```typescript
     this.setDepth(this.y);
     ```
2. **Caja de Colisión en la Base de los Pies:**
   * La caja física (`body`) debe situarse en la base inferior del sprite (los pies), no cubriendo todo el cuerpo, para permitir caminar arriba y abajo de objetos y otros personajes de forma natural:
     ```typescript
     // Ejemplo en el constructor del Actor
     const body = this.body as Phaser.Physics.Arcade.Body;
     body.setSize(24, 12);
     body.setOffset(4, 36); // Ajustado al pie de un sprite de 32x48
     ```
3. **Plano de Profundidad de Combate:**
   * Un golpe solo conecta si la diferencia en el eje Y entre atacante y víctima es menor a un umbral (por ejemplo, `Math.abs(attacker.y - target.y) <= 16`), simulando que están en el mismo carril de suelo.

---

### 4. Soporte Coop Local (Mando Gamepad API y Teclado)

Configurar un gestor de entradas tipado (`InputManager.ts`):

| Acción | Mando P1 (Pad Index 0) | Mando P2 (Pad Index 1) | Teclado P1 | Teclado P2 |
| :--- | :--- | :--- | :--- | :--- |
| `up` | D-Pad Arriba / Stick Izq | D-Pad Arriba / Stick Izq | W | Tecla Flecha Arriba |
| `down` | D-Pad Abajo / Stick Izq | D-Pad Abajo / Stick Izq | S | Tecla Flecha Abajo |
| `left` | D-Pad Izquierda / Stick | D-Pad Izquierda / Stick | A | Tecla Flecha Izquierda |
| `right` | D-Pad Derecha / Stick | D-Pad Derecha / Stick | D | Tecla Flecha Derecha |
| `attack` | Botón A / Cruz (0) | Botón A / Cruz (0) | J | Numpad 1 |
| `jump` | Botón B / Círculo (1) | Botón B / Círculo (1) | K | Numpad 2 |
| `special` | Botón Y / Triángulo (3) | Botón Y / Triángulo (3) | U | Numpad 3 |

```typescript
// src/core/InputManager.ts
export class InputManager {
  static getPlayerVector(scene: Phaser.Scene, playerId: PlayerId): Phaser.Math.Vector2 {
    const pad = scene.input.gamepad?.gamepads[playerId - 1];
    // Lectura de stick/d-pad o fallback a teclas según playerId...
  }
}
```

---

### 5. Mecánicas de Personajes y Combate

#### A. Arquetipos de Jugador
* **Joseph (Melee puro):**
  * Arma permanente: **Katana Vien**.
  * Combo de 3 cortes rápidos con hitbox frontal y empuje lateral.
  * Mayor velocidad de desplazamiento en el suelo.
* **Craz / Knight / Noa (Ranged):**
  * Arma permanente: **Fusil de Asalto**.
  * Munición infinita, disparo en línea recta con cadencia balanceada y retroceso leve.
  * Ataque cuerpo a cuerpo defensivo: patada de rechazo (*knockback*) para despejar el carril.
* **Armas Recogibles Especiales (Munición Limitada):**
  * Revólver de Tax, escopetas, cócteles molotov y granadas recogibles de barriles destruibles.

#### B. Componentes de Combate
* **`HealthComponent.ts`:** Gestión de vida, eventos `onDamaged`, `onHealed`, `onDied`, y estado de invulnerabilidad temporal (*i-frames* tras derribo).
* **`Hitbox.ts` (`Phaser.GameObjects.Zone` o sensor Arcade):** Emite daño solo a hurtboxes del bando contrario en el mismo plano de profundidad.
* **`Hurtbox.ts`:** Receptor de colisión con flash blanco visual (`setTint(0xffffff)`) y aplicación de vector de knockback.

---

### 6. Diseño de Fases Brawler y Conducción

#### Fases a Pie (Scroll Horizontal por Zonas)
1. **Límites de Cámara:** `this.cameras.main.setBounds(0, 0, mapWidth, 270)`.
2. **Lock Zones (Arenas Bloqueadas):**
   * Al alcanzar una posición X, la cámara se bloquea y se activan barreras invisibles.
   * Se instancian las oleadas de merdellones o infectados G.R.I.P.E.
3. **Indicador "GO! ➔":**
   * Al eliminar la última amenaza de la zona, suena el jingle arcade, parpadea el sprite/texto de "GO! ➔" y se desbloquea la cámara.

#### Fase de Conducción (Coupé Citroën en Autovía)
* Escena `HighwayScene.ts`.
* Fondo en bucle continuo usando `TileSprite` para el asfalto y capas parallax para los edificios de Miraflores / Valle-Inclán (`tilePositionX += speed`).
* El coupé se mueve verticalmente entre los carriles de la calzada (eje Y) y tiene un acelerón/embestida frontal que arrolla infectados y destruye barricadas ligeras.
* Spawner de obstáculos (coches calcinados, baches) y coches discoteca enemigos.

---

### 7. Estructura de Directorios del Proyecto

```text
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── assets/
│       ├── sprites/          # Personajes, enemigos, coupé, armas
│       ├── tilesets/         # Fondos de Málaga, asfalto, parroquia
│       └── audio/            # Efectos de sonido y pistas chiptune/clásica
└── src/
    ├── main.ts               # Punto de entrada y configuración de Phaser.Game
    ├── types/
    │   └── combat.ts         # Interfaces de daño, estadísticas y equipos
    ├── core/
    │   ├── GameManager.ts    # Puntuación, vidas, persistencia
    │   ├── InputManager.ts   # Mapeo de mando P1/P2 y teclado
    │   └── SoundManager.ts   # Reproducción de SFX y música
    ├── entities/
    │   ├── Actor.ts          # Clase base de física y profundidad
    │   ├── player/
    │   │   ├── Player.ts     # Controlador común P1/P2
    │   │   └── Joseph.ts     # Especialista en Katana
    │   └── enemies/
    │       ├── EnemyBase.ts
    │       ├── Merdellon.ts  # Enemigo pandillero común
    │       └── GripeZombie.ts# Infectado caníbal enjambre
    ├── combat/
    │   ├── HealthComponent.ts
    │   ├── Projectile.ts     # Balas de fusil y revólver
    │   └── WeaponPickup.ts   # Armas y objetos arrojadizos
    ├── scenes/
    │   ├── BootScene.ts      # Precarga de assets
    │   ├── CharacterSelectScene.ts
    │   ├── LevelChurchScene.ts # Acto I: Parroquia
    │   ├── HighwayScene.ts   # Fase del coupé en autovía
    │   └── TestArenaScene.ts # Zona de pruebas de combate
    └── ui/
        ├── HUD.ts            # Barras de vida retro, retratos, selector
        └── ArcadeGoSign.ts   # Señal parpadeante GO! ➔
```

---

### 8. Recetas de Prompts para OpenCode (TypeScript)

* **Generar nuevo enemigo:**
  > "Crea la clase `GripeZombie.ts` en `src/entities/enemies/` que extienda de `EnemyBase`. En TypeScript, define su máquina de estados (IDLE, CHASE, ATTACK, HURT, DEAD), movimiento con `Phaser.Physics.Arcade.Body`, hitbox de mordisco y detección de jugadores cercanos comprobando la profundidad en el eje Y."

* **Generar arma o proyectil:**
  > "Crea la clase `RifleBullet.ts` en `src/combat/` que extienda de `Phaser.Physics.Arcade.Sprite`. Debe recibir un vector de dirección, velocidad fija, rango de vida útil, y verificar colisiones con enemigos dentro del mismo umbral Y para aplicar `DamageData`."
