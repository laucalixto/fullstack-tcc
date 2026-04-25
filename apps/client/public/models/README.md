# Modelos 3D (glTF/GLB)

Diretório servido estaticamente pelo Vite. URLs absolutas via `/models/arquivo.glb`.

Veja **`_docs_refs/MODELING.md`** para convenções de escala, eixos,
naming de meshes e fluxo de exportação do Blender.

## Como adicionar um modelo

1. Modele em Blender respeitando 1 unit = 1 metro (padrão do Blender já é metro).
2. Exporte como `.glb` (ou `.gltf` + folder). Sem alterações de escala.
3. Salve aqui: `apps/client/public/models/<nome>.glb`.
4. Ative no tema: `apps/client/src/three/theme/boardTheme.ts` (ex.: `tile.url = '/models/tile.glb'`).
5. Reinicie o dev server; o `AssetManager` carrega e cacheia o modelo na entrada do jogo.

Se o `AssetManager` emitir warning sobre escala fora da faixa esperada, reexporte do Blender
sem fator de correção (modelo deve ter o tamanho natural em metros).
