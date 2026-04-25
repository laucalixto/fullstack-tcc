# Texturas — Atlas de tile e dado

Diretório servido estaticamente pelo Vite. URLs absolutas via `/textures/<arquivo>`.

## Arquivos de exemplo

| Arquivo | Layout | Uso |
|---|---|---|
| `tile-atlas.svg` | 8 × 5 (40 células) | Atlas de ícones por tile (índice → célula) |
| `dice-atlas.svg` | 6 × 1 (6 células) | Atlas de faces do dado (valor 1–6 → célula 0–5) |

Ambos são placeholders editáveis em qualquer ferramenta vetorial (Inkscape,
Figma, Illustrator). Substitua pela arte definitiva mantendo o mesmo grid.

## Formatos aceitos

O `AssetManager` aceita **SVG, PNG, JPG, JPEG**. SVG é renderizado via
fetch + Canvas (CanvasTexture); rasters vão pelo `THREE.TextureLoader`.

- **SVG** — bom para iteração rápida (você edita o SVG, recarrega a página).
  Aliasing pode aparecer dependendo do tamanho do canvas. Prefira para
  testes/protótipos.
- **PNG / JPG** — produção. Cache do navegador, performance previsível,
  pixel-perfect. Para converter SVG → PNG: Inkscape (`File → Export PNG`),
  GIMP (importar SVG e exportar) ou online (svg-to-png).

## Convenções

Veja `_docs_refs/MODELING.md` seções 9 (atlas de tile) e 11 (atlas de dado).

### Resumo do tile-atlas

- 8 colunas × 5 linhas = 40 células de 256×256 px.
- Linha 0 = topo da imagem (UV invertido pelo código).
- Mapeamento: tile índice `i` → célula `(i % 8, floor(i / 8))`.
- Pode ter transparência (PNG com alpha; SVG nativo).

### Resumo do dice-atlas

- 6 colunas × 1 linha = 6 células.
- Célula `i` representa a face de valor `i + 1` (célula 0 = face 1).
- Mapeamento código → atlas em `DicePhysics.ts:DICE_MATERIAL_TO_CELL`:
  - face +Y (valor 1) → célula 0
  - face +Z (valor 2) → célula 1
  - face +X (valor 3) → célula 2
  - face -X (valor 4) → célula 3
  - face -Z (valor 5) → célula 4
  - face -Y (valor 6) → célula 5

## Ativando

Em `apps/client/src/three/theme/boardTheme.ts`, no `DEFAULT_THEME` (ou tema custom):

```ts
tile: {
  ...,
  atlas: { url: '/textures/tile-atlas.svg', columns: 8, rows: 5 },
},
dice: {
  ...,
  atlas: { url: '/textures/dice-atlas.svg', columns: 6, rows: 1 },
},
```

Reinicie o dev server. Os toppers de tile e os materiais de face do dado vão
aplicar a textura automaticamente.
