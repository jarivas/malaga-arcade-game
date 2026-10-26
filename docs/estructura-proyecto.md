# Estructura del proyecto

Resumen: proyecto Vite pequeño, sin `vite.config.ts`. Todo el código de juego vive en `src/`; los assets cargables en `public/assets/`. Las carpetas previstas (`core/`, `combat/`, más escenas) todavía no existen.

## Árbol real

```text
malaga-arcade-game/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── README.md
├── PROJECT_INSTRUCTIONS.md
├── docs/                          # Esta documentación
├── assets/                        # Hojas originales de referencia
│   ├── backgrounds/stage_malaga.png
│   └── sprites/*.png
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── assets/
│       ├── backgrounds/stage_malaga.png
│       ├── sprites/*.png
│       └── ui/portrait_*.png
└── src/
    ├── main.ts                    # Configuración de Phaser y escena inicial
    ├── style.css                  # Canvas a pantalla completa
    ├── audio/SoundFX.ts
    ├── entities/
    │   ├── player/Joseph.ts
    │   ├── enemies/Merdellon.ts
    │   └── objects/
    │       ├── BreakableObject.ts
    │       ├── PickupItem.ts
    │       ├── WeaponItem.ts
    │       ├── WeaponProjectile.ts
    │       ├── TextureUtils.ts
    │       ├── PropTextures.ts
    │       └── WeaponTextures.ts
    ├── scenes/TestArenaScene.ts
    ├── types/combat.ts
    └── ui/HUD.ts
```

Restos de la plantilla de Vite sin uso: `src/counter.ts`, `src/assets/hero.png`, `src/assets/typescript.svg` y `src/assets/vite.svg`. No los importa nadie; se pueden borrar sin afectar al juego.

## Árbol previsto (no implementado)

El diseño original contempla esta organización. No crear carpetas vacías por adelantado; añadirlas cuando haya código real.

```text
src/
├── core/
│   ├── GameManager.ts       # Puntuación, vidas, persistencia
│   ├── InputManager.ts      # Mapeo P1/P2 (mando y teclado)
│   └── SoundManager.ts      # SFX y música
├── entities/
│   ├── Actor.ts             # Base de física y profundidad
│   ├── player/Player.ts     # Controlador común P1/P2
│   ├── player/Joseph.ts
│   └── enemies/
│       ├── EnemyBase.ts
│       ├── Merdellon.ts
│       └── GripeZombie.ts
├── combat/
│   ├── HealthComponent.ts
│   ├── Projectile.ts
│   └── WeaponPickup.ts
├── scenes/
│   ├── BootScene.ts
│   ├── CharacterSelectScene.ts
│   ├── LevelChurchScene.ts
│   ├── HighwayScene.ts
│   └── TestArenaScene.ts
└── ui/
    ├── HUD.ts
    └── ArcadeGoSign.ts
```

## Dónde añadir código

| Tarea | Ubicación recomendada |
| :--- | :--- |
| Nuevo enemigo | `src/entities/enemies/` (ver [`recetas.md`](recetas.md)) |
| Nueva arma o proyectil | `src/entities/objects/` |
| Nueva escena | `src/scenes/` y registrarla en `src/main.ts` |
| Nuevo tipo o interfaz | `src/types/` |
| Componente reutilizable | `src/combat/` o `src/core/` (crear carpeta) |
| Elemento de HUD | `src/ui/HUD.ts` |
| Sonido | `src/audio/SoundFX.ts` |
| Asset cargable | `public/assets/...` |
| Asset original de referencia | `assets/...` |

## Discrepancias conocidas

- `tsconfig.json` **no activa `strict`** ni `noImplicitAny`, aunque la convención del proyecto pide TypeScript estricto. Si se activa, hay que corregir los errores resultantes.
- No existe `vite.config.ts`; la configuración por defecto de Vite es suficiente.
- El `package.json` usa **Phaser `^4.2.1`**; cualquier documento que hable de Phaser 3 está desactualizado.
- `index.html` tiene `lang="en"` y título `gripe`; el juego está en español.
- Las vidas del HUD son fijas (`x2`) y no hay game over.

## Comandos

```bash
npm install      # Instalar dependencias
npm run dev      # Servidor de desarrollo (http://localhost:5173)
npm run build    # tsc + build de producción
npm run preview  # Servir la build
```

## Relacionados

- [`arquitectura.md`](arquitectura.md) — cómo encaja todo.
- [`recetas.md`](recetas.md) — patrones para añadir código.
- [`assets.md`](assets.md) — organización de assets.
