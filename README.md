# G.R.I.P.E. — El Fin del Mundo Comienza en Málaga

Prototipo de **beat 'em up arcade 2.5D** con scroll lateral y profundidad en el eje Y, al estilo de *Cadillacs and Dinosaurs*, *Final Fight* y *Streets of Rage*. La acción transcurre en una Málaga post-apocalíptica y combina fases a pie con una fase de conducción a alta velocidad.

## Descripción

- **Género:** arcade brawler lateral 2.5D.
- **Cámara y perspectiva:** scroll horizontal con profundidad vertical; los personajes se ordenan por la posición de sus pies mediante Y-Sort.
- **Modo de juego previsto:** cooperativo local para 2 jugadores.
- **Resolución base:** 480 × 270 px, escalado entero y pixel art.
- **Fases especiales:** conducción del coupé Citroën por la autovía, esquivando obstáculos y embistiendo infectados.

## Stack técnico

- **Phaser 4.2.1** como motor de juego.
- **TypeScript** con tipado estático estricto.
- **Vite** como servidor de desarrollo y empaquetador.
- Físicas **Arcade** sin gravedad (`gravity: 0`) para el movimiento en el plano del suelo.
- Escalado `FIT` + `CENTER_BOTH` y `pixelArt: true`.
- Canvas montado a pantalla completa dentro de `#app`, sin márgenes del `body`, para que la imagen quede centrada en la ventana (con letterboxing oscuro si el aspecto no es 16:9).

## Controles actuales

| Acción | Teclado | Gamepad |
| :--- | :--- | :--- |
| Mover | `W`, `A`, `S`, `D` | Stick izquierdo / D-pad |
| Ataque con katana | `J` | Botón A (índice 0) |
| Saltar | `Espacio` o `K` | Botón B |
| Ataque aéreo | `J` en el aire | Botón A en el aire |
| Ataque especial | `U` o `J`+`K` | Botón Y o `A`+`B` |

> La `A` del teclado forma parte de `WASD` y mueve a la izquierda. La `A` del mando es el botón de ataque; no tiene relación con la tecla `A`.
>
> `K` sola salta; `J`+`K` ejecuta el especial. En el mando, `B` salta y `A`+`B` ejecuta el especial.

## Estado actual

La escena jugable actual es **TestArenaScene**, un nivel arcade con scroll lateral, una zona de bloqueo y una oleada de enemigos.

### Escena
- Mundo de 1400 × 270 px (unas 2.9 veces el viewport de 480 × 270).
- Fondo `bg-malaga` (`public/assets/backgrounds/stage_malaga.png`, 720 × 270) repetido horizontalmente con un `TileSprite` de 1400 × 270 y `setDepth(-1000)`. El desfase del tile coloca la costura en el borde del bloqueo.
- `physics.world.setBounds(0, 0, 1400, 270)` y `cameras.main.setBounds(0, 0, 1400, 270)`.
- La cámara sigue a Joseph horizontalmente con `startFollow(this.player, true, 0.08, 0.08)`.
- Punto de bloqueo en `scrollX = 480`: la cámara se detiene, se crean dos barreras invisibles con físicas Arcade en los bordes visibles y comienza la oleada.
- Oleada de 4 Merdellones: 2 aparecen fuera de la pantalla por la izquierda y 2 por la derecha; entran caminando y reciben sus colliders con las barreras tras el breve walk-in. Las alturas Y se reparten entre 140 y 255 mediante carriles mezclados para evitar solapamientos.
- `activeEnemiesCount` controla los enemigos vivos de la oleada. Al destruirse el último, se eliminan las barreras, se reanuda el seguimiento de la cámara y aparece el aviso "GO! ➔".
- El aviso está oculto por defecto y parpadea durante 3 s en la esquina superior derecha mediante un tween de fade in/fade out.
- Franja transitable limitada a Y = 135–255 mediante un `customBoundsRectangle` en las cajas de pies de Joseph y de cada enemigo (`setCollideWorldBounds(true)`).
- Joseph y Merdellón se mantienen a escala 1:1 (`setScale(1)`).
- Joseph aparece centrado en el encuadre inicial, en `(240, 200)`, mirando a la derecha.
- Y-Sort estricto: fondo a `-1000`, actores y props por la Y de sus pies (actualizada después del paso de físicas) y HUD/GO a `9999`. Los props rompibles usan `setDepth(feetY)` y una sombra propia.

### Joseph
- Sprite animado con hoja normalizada de 96 × 96 px por frame (5 columnas × 5 filas, 23 frames).
- Animaciones con los índices exactos de la hoja:
  - `joseph-idle` — frames 0–4, 8 fps, repetida.
  - `joseph-run` — frames 5–11, 12 fps, repetida. Se omite el frame 12 porque es casi idéntico al 11 y alargaba la pose de rodilla recogida.
  - `joseph-attack` — frames 13–17, 15 fps, una vez.
  - `joseph-hurt` — frames 18–22, 10 fps, una vez.
- Hoja de salto separada `joseph-jump` (5 columnas × 2 filas, 96 × 96 por frame):
  - `joseph-jump-up` — frame 1, subida.
  - `joseph-jump-apex` — frame 2, cenit con katana en guardia.
  - `joseph-jump-down` — frame 3, caída.
  - `joseph-jump-land` — frame 4, 80 ms, flexión de aterrizaje.
  - `joseph-jump-slash` — frames 5–7, 15 fps, tajo aéreo.
- Movimiento en 8 direcciones a 140 px/s, con normalización diagonal.
- Volteo horizontal según la dirección de movimiento.
- Caja de colisión de 24 × 14 px en los pies (`setOffset(36, 80)`), con origen en la base del sprite para un Y-Sort correcto.
- Ataque con katana:
  - 25 de daño.
  - Hitbox activa durante los frames 1–3 de la animación, sincronizada con `animationupdate`.
  - Lunge de 30 px hacia delante.
  - Cooldown de 350 ms.
- Soporte de gamepad mediante `Phaser.Input.Gamepad`.
- 100 de vida máxima. `takeDamage()` descuenta el daño y llama a `onHealthChanged(newHealth, maxHealth)`, que la escena conecta con la barra del HUD.
- Estado de daño con animación `joseph-hurt` y knockback (el sistema está preparado, aunque actualmente ningún enemigo ataca al jugador).
- **Ataque especial “Giro Devastador”**:
  - Entrada: `U` o `J`+`K` en teclado; botón `Y` o `A`+`B` en mando.
  - Duración de 400 ms con `isSpecialAttacking` e `isInvulnerable`; el movimiento se detiene.
  - Hitbox circular de radio 55 px centrada en los pies, activa 250 ms.
  - 50 de daño, flash blanco, knockback radial y derribo temporal de los enemigos alcanzados.
  - Efecto visual de anillo 360° blanco/azul que se expande de radio 10 a 50 y se desvanece en 250 ms, junto con un giro rápido del sprite.
  - Si alcanza al menos a un enemigo, cuesta 8 HP (nunca baja de 1 HP); si no alcanza a nadie, no hay coste.
  - Cooldown de 1000 ms entre especiales.
- **Salto 2.5D y ataque aéreo**:
  - Coordenada `z` falsa con `gravityZ = -600`, `jumpForce = 280`, `isJumping`, `vz` y `isJumpAttacking`.
  - La sombra elíptica permanece en la Y real del suelo y se encoge ligeramente con la altura.
  - Control aéreo al 60 % de la velocidad de suelo.
  - `Espacio`/`K` en teclado y botón `B` en mando.
  - La pose se selecciona por `vz`: `> 50` usa `joseph-jump-up`; entre `-50` y `50` usa `joseph-jump-apex`; `< -50` usa `joseph-jump-down`. `updateAnimationState` no interfiere mientras `isJumping` está activo.
  - Ataque aéreo con `J`/`A`: reproduce `joseph-jump-slash`, 35 de daño, flash blanco y knockdown garantizado.
  - Hitbox aérea de 92 × 64 px anclada al suelo, activa durante el tajo aéreo.
  - Con `z > 20` Joseph esquiva los ataques terrestres bajos.
  - Al aterrizar: si está quieto reproduce `joseph-jump-land` durante 80 ms y vuelve a idle; si se mueve, enlaza directamente con `joseph-run`.

### Merdellón (enemigo de la oleada)
- La oleada genera 4 instancias dinámicas de Merdellón; cada una recibe su propio overlap con la katana y su collider con las barreras.
- Al destruirse un enemigo, el evento `DESTROY` resta 1 a `activeEnemiesCount`.
- Sprite animado con hoja normalizada de 96 × 96 px por frame (5 columnas × 5 filas, 21 frames).
- Animaciones con los índices exactos de la hoja:
  - `enemy-idle` — frames 0–4, 7 fps, repetida.
  - `enemy-walk` — frames 5–10, 10 fps, repetida.
  - `enemy-attack` — frames 11–15, 12 fps, una vez (definida y disponible).
  - `enemy-hurt` — frames 16–20, 10 fps, una vez.
- 75 de vida: recibe 25 por tajo.
- Persecución básica hacia Joseph a 40 px/s cuando está a más de 30 px, usando la Y del suelo (`getGroundY`) en lugar de la altura visual del salto.
- Reproduce `enemy-walk` al perseguir y `enemy-idle` al detenerse.
- Se orienta siempre hacia Joseph con `setFlipX(this.x > joseph.x)`.
- Al recibir daño: reproduce `enemy-hurt`, recibe knockback horizontal de 200 px/s y un destello blanco de 80 ms.
- El ataque especial de Joseph lo derriba: knockback radial de 240 px/s, destello blanco, caída con la última pose de `enemy-hurt` y recuperación a los 800 ms.
- El ataque aéreo lo derriba con un knockback radial más ligero de 170 px/s y recuperación a los 700 ms.
- Al llegar a 0 de vida cae abatido con la animación `enemy-hurt`, se desvanece y se destruye.
- Etiqueta flotante de vida sobre el enemigo.

### Audio procedural
Implementado en `src/audio/SoundFX.ts` con la Web Audio API y el `AudioContext` de Phaser, sin archivos externos:
- `playSlash()`: sierra 800 → 150 Hz en 0,1 s con silbido senoidal.
- `playHit()`: ruido blanco filtrado + square a 120 Hz durante 0,08 s.
- `playSpecial()`: barrido 200 → 1200 → 300 Hz con filtro y caída de 0,3 s.
- `playEnemyDeath()`: tono grave distorsionado 250 → 60 Hz en 0,25 s.
- `playGo()`: jingle sinusoidal 587 Hz (0,1 s) + 880 Hz (0,2 s).
- `playPlayerHurt()`: golpe apagado + quejido triangular a 180 Hz.
- `playBreak()`: doble ráfaga de ruido filtrado (900 Hz y 320 Hz) + golpe triangular grave de 150 → 45 Hz.
- `playPickup()`: arpegio ascendente 660 → 880 → 1320 Hz.
- El contexto se reanuda en el primer `pointerdown`, `keydown` o botón del mando; cada reproducción también intenta reanudarlo.
- Está conectado a `manager.destination` de Phaser, por lo que respeta el mute y volumen globales.
- `TestArenaScene` crea la instancia y la inyecta en Joseph; los impactos, muertes y el aviso GO también disparan sus sonidos.

### HUD
Implementado en `src/ui/HUD.ts` con `setScrollFactor(0)` y `setDepth(9999)`:
- Panel de Jugador 1 en `(16, 12)`:
  - Retrato de Joseph de 32 × 32 px con marco dorado biselado, cargado como `portrait-joseph`.
  - El bloque de texto y la barra comienza en `x = 54`, a la derecha del retrato.
  - `1P JOSEPH` justo encima de la barra.
  - Barra de vida de 100 × 8 px centrada verticalmente con el retrato, con marco negro, pista roja oscura y relleno amarillo biselado, proporcional a `currentHealth / maxHealth`.
  - `SCORE 000000` (100 por enemigo derrotado y los puntos de cada consumible) y contador de vidas `x2` con icono de corazón pixel art integrados en el bloque.
  - Al recibir un golpe fuerte (≥ 20 de daño), el retrato parpadea en rojo durante 100 ms.
- Panel de enemigo activo en la esquina superior derecha:
  - Oculto por defecto; aparece con un fade in de 120 ms al golpear.
  - Icono de aviso y nombre `INFECTADO` a la izquierda, con la barra roja/naranja justo debajo.
  - Retrato del enemigo de 32 × 32 px a la derecha, en `(440, 12)`, volteado para mirar hacia la izquierda.
  - El retrato parpadea en blanco durante 90 ms con cada impacto.
  - La barra refleja la vida del enemigo golpeado y el panel se oculta con fade out tras 3 s sin daño o cuando ese enemigo muere.
- El aviso `GO! ➔` y la ayuda de controles también son elementos fijos de pantalla; la ayuda se movió a la esquina inferior izquierda para dejar libre el panel superior.

### Objetos rompibles y consumibles

La calle incluye nueve contenedores interactivos colocados fuera de la zona de bloqueo, para que el jugador pueda recuperarse antes y después de la oleada:

| Objeto | Posición | Vida |
| :--- | :--- | :--- |
| Caja de madera | `(96, 210)` | 2 |
| Cubo verde con ruedas | `(196, 162)` | 2 |
| Caja de madera | `(300, 228)` | 2 |
| Cubo verde con ruedas | `(420, 174)` | 2 |
| Caja de madera | `(1012, 214)` | 2 |
| Cubo verde con ruedas | `(1096, 164)` | 2 |
| Caja de madera | `(1184, 230)` | 2 |
| Cubo verde con ruedas | `(1250, 172)` | 2 |
| Caja de madera | `(1330, 224)` | 2 |

- Los props son sprites independientes con cuerpo Arcade **estático** limitado a su base (26 × 10 px el cubo, 24 × 10 px la caja), sombra elíptica y `setDepth(y)`. Joseph y los enemigos que caminan colisionan con ellos, pero pueden pasar por delante o por detrás gracias al Y-Sort.
- Cada impacto resta exactamente **1 punto de vida**, independientemente del ataque: tajo normal, especial o tajo aéreo. Un enemigo derribado por el especial o por el ataque aéreo que impacte contra el prop también le resta 1. Se aplica un cooldown de 600 ms por enemigo para que un cuerpo volando no rompa el prop en varios frames.
- Al recibir un golpe que no lo destruye, el prop parpadea en blanco 90 ms y se balancea ligeramente.
- Al llegar a 0 de vida reproduce un estallido sordo (`playBreak()`), genera 10–11 escombros con arco parabólico, giro y desvanecimiento, levanta polvo y se destruye. El cuerpo estático desaparece con él. El cubo usa la textura de chatarra `fx-debris-metal` y la caja la de astillas `fx-debris-wood`, ambas recortadas de la hoja de props.
- Con un 80 % de probabilidad suelta un consumible. El tipo se sortea por peso: **campero 30 %**, **refresco 45 %**, **dinero 25 %**.

#### Consumibles

| Consumible | Efecto | Puntos | Aspecto |
| :--- | :--- | :--- | :--- |
| Campero | +30 HP | +500 | Campero malagueño tostado |
| Refresco | +15 HP | +200 | Lata roja |
| Dinero | — | +1000 | Bolsa verde de dinero |

- El consumible sale despedido en un arco parabólico de 430 ms y aterriza en el asfalto. Su cuerpo físico permanece desactivado durante el vuelo para que no se pueda recoger en el aire.
- Al aterrizar, el cuerpo se activa y el sprite parpadea suavemente entre alfa 1 y 0,38 (yoyo de 420 ms, repetido).
- Se recoge por solapamiento con Joseph: los puntos se suman al marcador y aparece un texto flotante `+N` en amarillo. La curación actualiza la barra del HUD y muestra `+N HP` en verde con la cantidad **realmente restaurada**.
- A plena salud el consumible de curación no muestra texto de vida, pero sigue otorgando sus puntos.
- Los textos flotantes suben y se desvanecen en 900 ms.

#### Arte de props y consumibles

El arte ya no se pinta por código. `public/assets/sprites/props_pickups.png` es una hoja de 1024 × 1024 generada con IA sobre fondo magenta `#FF00FF`. `PropTextures.ts` la recorta en `create()` y crea texturas canvas con alfa:

| Clave | Región de origen | Tamaño final |
| :--- | :--- | :--- |
| `prop-bin` | cubo verde, `(34, 26)` 236 × 317 | 24 × 32 |
| `prop-crate` | caja de madera, `(311, 30)` 269 × 313 | 22 × 26 |
| `item-campero` | campero tostado, `(27, 774)` 273 × 208 | 18 × 14 |
| `item-soda` | lata roja, `(334, 774)` 106 × 208 | 8 × 15 |
| `item-money` | bolsa de dinero, `(599, 771)` 215 × 218 | 16 × 16 |
| `fx-debris-wood` | trozo de astillas, `(719, 604)` 64 × 64 | 8 × 8 |
| `fx-debris-metal` | trozo de chatarra, `(815, 583)` 64 × 64 | 8 × 8 |

- El croma se elimina antes de reescalar: se hacen transparentes los píxeles con rojo y azul altos y verde bajo, y se corrige el halo semitransparente para que no quede un borde rosa.
- El reescalado usa reducciones sucesivas a la mitad con suavizado y un ajuste final al tamaño de juego. Un `NEAREST` directo desde la ilustración de alta resolución producía ruido y píxeles sueltos.
- Cada textura conserva la proporción del recorte original; las cajas de colisión de los props siguen siendo 26 × 10 px (cubo) y 24 × 10 px (caja).
- Los escombros son imágenes de 8 × 8 con escala, giro, volteo y trayectoria aleatorios, no rectángulos dibujados.

#### Armas recogibles

La hoja `public/assets/sprites/pickable_weapons.png` (1024 × 1024) contiene las armas tiradas, sus iconos de HUD y las esquirlas de cristal. `WeaponTextures.ts` la recorta en `create()` usando el mismo pipeline que los props (`TextureUtils.ts`), con dos claves de croma: magenta para el fondo general y azul para las tarjetas de los iconos.

| Clave | Región de origen | Tamaño final | Uso |
| :--- | :--- | :--- | :--- |
| `weapon-pipe` | tubería, `(33, 927)` 167 × 53 | 26 × 8 | Arma en el suelo |
| `weapon-bottle` | botella verde, `(258, 238)` 98 × 123 | 11 × 14 | Arma en el suelo |
| `weapon-bat` | bate de madera, `(29, 655)` 424 × 61 | 32 × 5 | Arma en el suelo |
| `icon-pipe` | tarjeta azul, `(842, 42)` 120 × 120 | 16 × 16 | Icono del HUD |
| `icon-bat` | tarjeta azul, `(485, 600)` 143 × 139 | 16 × 16 | Icono del HUD |
| `icon-bottle` | tarjeta azul, `(506, 787)` 143 × 138 | 16 × 16 | Icono del HUD |
| `fx-glass-shard` | esquirla, `(309, 443)` 37 × 38 | 8 × 8 | Partículas de la botella |

Hay ocho armas repartidas por la calle:

| Posición | Arma |
| :--- | :--- |
| `(150, 214)` | Tubería |
| `(352, 166)` | Botella |
| `(430, 238)` | Bate |
| `(520, 150)` | Bate |
| `(760, 238)` | Botella |
| `(1080, 168)` | Tubería |
| `(1200, 238)` | Bate |
| `(1340, 164)` | Botella |

| Arma | Usos | Daño por tajo |
| :--- | :---: | :---: |
| Tubería | 5 | 30 |
| Botella | 3 | 45 |
| Bate | 4 | 40 |

- Son pickups de solapamiento: no bloquean el movimiento de Joseph ni de los enemigos.
- Al recogerlos, el objeto desaparece del suelo y Joseph equipa el arma. El HUD muestra su icono y los usos restantes junto a `1P JOSEPH` (por ejemplo, `[tubería] x5`).
- Se usan con el **ataque normal**: `J` en teclado o el botón `A` del mando. No hay una tecla extra; el arma sustituye el daño del tajo y cada impacto gasta un uso. Al equiparla aparece un aviso `J / A PARA ATACAR` y el tajo deja un arco de color según el arma.
- El tajo normal usa el daño del arma. El primer impacto de cada ataque gasta un uso; el especial y el tajo aéreo también gastan uno por ataque aunque mantienen su daño base.
- Cuando los usos llegan a 0, el arma se rompe: se borra el icono del HUD y Joseph vuelve a la katana. Si era una botella, estalla en esquirlas `fx-glass-shard`; cada impacto de botella también suelta unas pocas.
- Si Joseph recibe daño mientras lleva un arma, la suelta en el suelo con los usos que le quedaban y vuelve a la katana. El arma soltada no puede recogerse hasta que Joseph se aleja al menos 28 px, para que no vuelva a equiparla al instante.
- Las armas del suelo **no caducan**: mientras conserven usos, permanecen ahí hasta que se recogen. La única forma de que desaparezcan es recogerlas o romperlas.

### Tipos de combate
En `src/types/combat.ts`:
- `Team` (`'player' | 'enemy'`).
- `DamageData`.
- `CharacterStats`.

## Estructura del proyecto

```text
gripe/ (raíz del proyecto)
├── assets/
│   ├── backgrounds/
│   │   └── stage_malaga.png      # Ilustración original (1376 × 768)
│   └── sprites/
│       ├── joseph_original.png   # Hoja original de referencia de Joseph
│       ├── joseph_jump_spritesheet.png # Hoja original de salto
│       ├── props_pickups.png     # Hoja original de props y consumibles
│       ├── pickable_weapons.png  # Hoja original de armas e iconos
│       └── enemy.png             # Hoja original de referencia del enemigo
├── public/
│   └── assets/
│       ├── backgrounds/
│       │   └── stage_malaga.png  # Franja callejera jugable (720 × 270)
│       ├── sprites/
│       │   ├── joseph.png        # Hoja normalizada de Joseph (96 × 96)
│       │   ├── joseph_jump.png   # Hoja de salto normalizada (96 × 96, 5 × 2)
│       │   ├── props_pickups.png # Hoja de props, consumibles y escombros
│       │   ├── pickable_weapons.png # Hoja de armas, iconos y esquirlas
│       │   └── enemy.png         # Hoja normalizada del enemigo (96 × 96)
│       └── ui/
│           ├── portrait_joseph.png # Retrato 64 × 64 con fondo transparente
│           └── portrait_enemy.png  # Retrato del enemigo 64 × 64 transparente
├── src/
│   ├── audio/
│   │   └── SoundFX.ts
│   ├── entities/
│   │   ├── player/
│   │   │   └── Joseph.ts
│   │   ├── enemies/
│   │   │   └── Merdellon.ts
│   │   └── objects/
│   │       ├── BreakableObject.ts  # Cubos/cajas destructibles y escombros
│   │       ├── PickupItem.ts       # Consumibles, arco de aparición y parpadeo
│   │       ├── WeaponItem.ts       # Armas tiradas, usos y parpadeo
│   │       ├── TextureUtils.ts     # Croma y reescalado de hojas de sprites
│   │       ├── PropTextures.ts     # Recorte de props, consumibles y escombros
│   │       └── WeaponTextures.ts   # Recorte de armas, iconos y esquirlas
│   ├── scenes/
│   │   └── TestArenaScene.ts
│   ├── types/
│   │   └── combat.ts
│   ├── ui/
│   │   └── HUD.ts
│   ├── main.ts
│   └── style.css
├── index.html
├── package.json
├── tsconfig.json
└── PROJECT_INSTRUCTIONS.md
```

## Puesta en marcha

```bash
npm install
npm run dev
```

Abrir la URL que indique Vite (por defecto `http://localhost:5173`).

### Otros comandos

```bash
npm run build    # Comprueba tipos y genera la build de producción
npm run preview  # Sirve la build generada
```

## Notas sobre los assets

El fondo original `assets/backgrounds/stage_malaga.png` mide 1376 × 768 e incluye un HUD superior y una marca de agua en la esquina inferior derecha. Para la escena se redujo a 720 px de ancho (escala 0.5233) y se recortó la franja callejera `y = 111..381` de la versión escalada, guardándola como `public/assets/backgrounds/stage_malaga.png` (720 × 270). El reescalado deja los contenedores, bolsas y farolas claramente por debajo del tamaño de los sprites de 96 × 96, elimina los textos horneados y sirve como tile horizontal para el nivel de 1400 px. El cielo y los pisos superiores de los edificios quedan fuera del encuadre de calle.

El retrato `public/assets/ui/portrait_joseph.png` se generó a partir de la pose idle de `assets/sprites/joseph_original.png`: recorte de cabeza y hombros, eliminación del fondo gris y salida a 64 × 64 con transparencia. El HUD lo muestra a 32 × 32 dentro de un marco dorado.

El retrato `public/assets/ui/portrait_enemy.png` se generó de forma equivalente desde la pose idle de `assets/sprites/enemy.png`, con recorte de la cara, fondo transparente y 64 × 64. En el HUD se muestra a 32 × 32, volteado horizontalmente para mirar hacia la izquierda y con un marco rojo metálico.

La hoja de salto `assets/sprites/joseph_jump_spritesheet.png` mide 1024 × 1024, tiene fondo gris, los textos “Jump Cycle”/“Aerial Attacks” y una marca de agua. Se normalizó a `public/assets/sprites/joseph_jump.png` (480 × 192, 5 columnas × 2 filas de 96 × 96): se aislaron las 9 poses por componentes conectados, se eliminó el fondo y los textos, se alinearon los pies a `y = 94` y se escaló a 0.16 para mantener el tamaño de Joseph. Se usan los frames 0–8; las animaciones usan 1–7 y los frames 0 y 8 quedan sin usar.

La hoja `assets/sprites/props_pickups.png` (1024 × 1024) contiene los props, los tres consumibles y las ilustraciones de escombros sobre fondo magenta. Se copió a `public/assets/sprites/props_pickups.png` y se recorta en tiempo de ejecución; no requiere normalización previa. El croma, los tamaños y las regiones exactas están documentados en “Arte de props y consumibles”.

La hoja `assets/sprites/pickable_weapons.png` (1024 × 1024) contiene las armas tiradas, sus iconos de HUD sobre tarjetas azules y las esquirlas de cristal. Se copió a `public/assets/sprites/pickable_weapons.png` y se recorta en tiempo de ejecución con `WeaponTextures.ts`; las regiones y el doble croma están documentados en “Armas recogibles”.

Las hojas originales no tenían una rejilla uniforme: `assets/sprites/joseph_original.png` incluía fondo gris opaco, etiquetas de texto y distintos anchos por pose, y `assets/sprites/enemy.png` tenía cuatro filas de animación, título y una marca de agua. Para poder usarlas en Phaser se generaron versiones normalizadas y transparentes:

- `public/assets/sprites/joseph.png`: 96 × 96 px por frame, 5 columnas × 5 filas, 23 frames.
- `public/assets/sprites/joseph_jump.png`: 96 × 96 px por frame, 5 columnas × 2 filas, 9 frames útiles (0–8).
- `public/assets/sprites/enemy.png`: 96 × 96 px por frame, 5 columnas × 5 filas, 21 frames.
- Todas las animaciones están empaquetadas de forma contigua para que los índices de frame coincidan con los solicitados.
- Eliminación del fondo, del halo gris del contorno y de la marca de agua.
- Cada pose se extrae como componente conectado independiente, evitando que restos de una pose vecina desplacen el pivote y provoquen saltos en animaciones como el idle.
- Pies alineados en cada celda para que el origen y la caja de colisión queden a la altura del suelo.
- Ajuste de escala y recortes para que el arco completo de la katana quepa dentro del frame de 96 × 96 sin cortarse.

## Limitaciones y próximos pasos

- El HUD es funcional, pero no incluye minimapa ni pantalla de game over. El contador de vidas es fijo (`x2`) porque todavía no hay pérdida de vidas.
- Los contenedores, bolsas y farolas del fondo están horneados en la imagen: no tienen colisión ni profundidad individual. Los nueve props rompibles son sprites aparte, pero el resto del mobiliario urbano sigue siendo decorativo.
- Los recortes de `props_pickups.png` están ajustados a mano a las regiones de esa hoja concreta. Si se sustituye la imagen por otra generación, hay que revisar las coordenadas de `REGIONS` en `PropTextures.ts`.
- Lo mismo ocurre con `pickable_weapons.png`: las regiones de `WeaponTextures.ts` y el recorte azul de los iconos dependen de esta hoja concreta.
- Los tres tipos de arma comparten las animaciones de katana de Joseph; no hay animaciones propias de tubería, botella o bate.
- El enemigo no ataca todavía, así que la pérdida del arma por daño solo se puede probar llamando a `takeDamage()` directamente.
- Los props no reaparecen y los consumibles dependen de una tirada aleatoria (80 %). Si no cae ninguno, el jugador no tiene curación garantizada tras la oleada.
- Solo los nueve props colocados son destructibles; no hay un sistema genérico de objetos rompibles colocado por datos de nivel.
- El enemigo no ataca todavía; su animación `enemy-attack` está definida pero no se usa.
- El jugador todavía no recibe ataques enemigos.
- El cooperativo local para dos jugadores no está implementado.
- Solo hay una zona de bloqueo y una oleada; no hay oleadas múltiples ni transiciones de nivel.
- No hay fase de conducción.
- La música sigue pendiente; los efectos de sonido son procedurales y no requieren archivos externos.
- Falta pulir el equilibrio del combate y añadir más tipos de enemigos y armas.
