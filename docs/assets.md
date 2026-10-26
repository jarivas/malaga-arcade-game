# Assets y arte

Resumen: `assets/` guarda las hojas originales de referencia; `public/assets/` contiene lo que carga el juego. La mayoría de hojas se normalizaron a frames de 96 × 96 con pies alineados; props y armas se recortan en tiempo de ejecución.

## Carpetas

```text
assets/
├── backgrounds/stage_malaga.png      # Ilustración original 1376 × 768
└── sprites/
    ├── joseph_original.png           # Hoja original de Joseph
    ├── joseph_jump_spritesheet.png   # Hoja original de salto
    ├── joseph_weapons.png            # Hoja original de armas
    ├── props_pickups.png             # Hoja original de props/consumibles
    ├── pickable_weapons.png          # Hoja original de armas e iconos
    └── enemy.png                     # Hoja original del enemigo

public/assets/
├── backgrounds/stage_malaga.png      # Franja jugable 720 × 270
├── sprites/
│   ├── joseph.png                    # 96 × 96, 5 × 5, 23 frames
│   ├── joseph_jump.png               # 96 × 96, 5 × 2, 9 frames útiles
│   ├── joseph_weapons.png            # 96 × 96, 4 × 5, 20 frames
│   ├── props_pickups.png             # Hoja recortada en runtime
│   ├── pickable_weapons.png          # Hoja recortada en runtime
│   └── enemy.png                     # 96 × 96, 5 × 5, 21 frames
└── ui/
    ├── portrait_joseph.png           # 64 × 64 transparente
    └── portrait_enemy.png            # 64 × 64 transparente
```

## Fondo

El original `assets/backgrounds/stage_malaga.png` mide 1376 × 768 e incluye HUD superior y marca de agua. Para la escena se redujo a 720 px de ancho (escala 0,5233), se recortó la franja de calle `y = 111..381` de la versión escalada y se guardó como `public/assets/backgrounds/stage_malaga.png` (720 × 270).

- Los contenedores, bolsas y farolas quedan claramente por debajo del tamaño de los sprites de 96 × 96.
- Se eliminan los textos horneados.
- Sirve como tile horizontal para el nivel de 1400 px.
- El cielo y los pisos superiores quedan fuera del encuadre de calle.

## Retratos

- `portrait_joseph.png`: recorte de cabeza y hombros de la pose idle de `joseph_original.png`, fondo gris eliminado, 64 × 64 con transparencia. El HUD lo muestra a 32 × 32 con marco dorado.
- `portrait_enemy.png`: equivalente desde la pose idle de `enemy.png`, recorte de cara, fondo transparente y 64 × 64. En el HUD se muestra a 32 × 32, volteado y con marco rojo metálico.

## Hojas normalizadas

Las hojas originales no tenían rejilla uniforme: Joseph incluía fondo gris opaco, etiquetas de texto y anchos distintos por pose; el enemigo tenía cuatro filas de animación, título y marca de agua. Para poder usarlas en Phaser se generaron versiones normalizadas y transparentes:

- `joseph.png`: 96 × 96 por frame, 5 × 5, 23 frames.
- `joseph_jump.png`: 96 × 96, 5 × 2, 9 frames útiles (0–8). Se usan 1–7; 0 y 8 quedan sin usar.
- `joseph_weapons.png`: 96 × 96, 4 × 5, 20 frames útiles (0–19).
- `enemy.png`: 96 × 96, 5 × 5, 21 frames.

Proceso aplicado:

- Eliminación de fondo, halo gris del contorno y marca de agua.
- Cada pose se extrae como componente conectado independiente, evitando que restos de una pose vecina desplacen el pivote y provoquen saltos en animaciones como el idle.
- Pies alineados en cada celda para que origen y caja de colisión queden a la altura del suelo.
- Ajuste de escala y recortes para que el arco completo de la katana quepa en el frame de 96 × 96 sin cortarse.
- Animaciones empaquetadas de forma contigua para que los índices coincidan con los solicitados.

`joseph_weapons.png` se generó desde la hoja original 1024 × 1024 (retícula 4 × 5 de 256 × 204,8): croma magenta y halo eliminados, componentes sueltos descartados, pies alineados a `y = 94` y escala uniforme 0,22.

## Hojas originales y por qué no se cargan directamente

Las hojas de `assets/` son material de referencia. El juego carga las versiones de `public/assets/`; **no cambiar el preload a las dimensiones originales sin regenerar antes las hojas**.

| Hoja original | Tamaño | Rejilla | Problema si se carga tal cual |
| :--- | :--- | :--- | :--- |
| `assets/sprites/joseph_weapons.png` | 1024 × 1024 | 4 × 5 de 256 × 204,8 | `frameHeight: 204` deja 4 px sin usar y los frames no son cuadrados; `setScale(0.375)` produce 96 × 76,5. |
| `assets/sprites/pickable_weapons.png` | 1024 × 1024 | No es una rejilla limpia 4 × 4 | Los objetos cruzan los límites de 256 px; los frames 5/6 y 13/14 de una rejilla 4 × 4 contienen varios objetos por celda. |
| `assets/sprites/joseph_original.png` | 1200 × 896 | Anchos variables | Fondo opaco, etiquetas y poses de distinto tamaño. |
| `assets/sprites/joseph_jump_spritesheet.png` | 1024 × 1024 | 5 × 2 aproximada | Textos, marca de agua y fondo gris. |
| `assets/sprites/enemy.png` | 1024 × 1024 | 5 × 5 aproximada | Título, marca de agua y fondo. |

Por eso el proyecto usa:

- `public/assets/sprites/joseph_weapons.png`: **384 × 480**, 4 × 5 de **96 × 96** → preload con `frameWidth: 96`, `frameHeight: 96`.
- `public/assets/sprites/joseph.png` y `enemy.png`: **480 × 480**, 5 × 5 de **96 × 96**.
- `public/assets/sprites/joseph_jump.png`: **480 × 192**, 5 × 2 de **96 × 96**.
- `public/assets/sprites/pickable_weapons.png`: se carga como **imagen** (`this.load.image`) y se recorta en runtime con `WeaponTextures.ts`, porque no es una rejilla uniforme.

Si en el futuro se sustituyen por hojas 1024 perfectamente reticuladas, hay que hacerlo de forma conjunta: cambiar el preload, los índices de animación, las regiones de recorte y las escalas. Cambiar solo el preload provoca desalineaciones y frames con partes de varias poses.

## Hojas recortadas en runtime

- `props_pickups.png` (1024 × 1024) y `pickable_weapons.png` (1024 × 1024) se copiaron a `public/assets/sprites/` y se recortan en `create()`. Sus regiones exactas están en [`objetos.md`](objetos.md) y [`armas.md`](armas.md).
- `TextureUtils.ts` centraliza el croma y el reescalado.

## Checklist al sustituir un asset

1. Mantener el tamaño de frame y el número de columnas/filas, o actualizar los índices de animación.
2. Alinear los pies a la misma altura dentro de cada celda.
3. Dejar transparente el fondo; sin halo del color de croma.
4. Revisar las cajas de colisión (`setSize` / `setOffset`) si cambia el encuadre.
5. Si cambia una hoja recortada en runtime, revisar `REGIONS` en `PropTextures.ts` o `WeaponTextures.ts`.
6. Comprobar en el juego que la katana y los efectos no se cortan en los bordes del frame.

## Relacionados

- [`joseph.md`](joseph.md) — animaciones.
- [`merdellon.md`](merdellon.md) — animaciones.
- [`objetos.md`](objetos.md) y [`armas.md`](armas.md) — regiones de recorte.
