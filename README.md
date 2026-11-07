# Alvorada — RPG de mundo aberto (pixel art)

Jogo 2D em HTML5 Canvas, sem dependências nem imagens externas (todo o pixel art é gerado por código).

## Controles
- **Computador:** `W A S D` ou setas para andar, `Shift` para correr.
- **Celular:** arraste o dedo no lado esquerdo da tela (joystick), botão **CORRER** no canto direito.
O modo é detectado automaticamente e troca se você usar o outro tipo de entrada.

## Publicar no GitHub Pages
1. Crie um repositório e envie todos estes arquivos para a raiz (`index.html` na raiz).
2. Settings → Pages → *Deploy from a branch* → `main` / `(root)` → Save.
3. Acesse `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Para testar local: `python3 -m http.server` e abra `http://localhost:8000`.

## Estrutura
- `js/textures.js` — tiles, árvores, casas, fonte… (pixel art procedural)
- `js/player.js` — personagem masculino e movimento/colisão
- `js/map.js` — sistema de mapas (`World.register`) e o Mapa 1 "Campos de Alvorada"
- `js/input.js` — teclado WASD + joystick virtual
- `js/main.js` — câmera, renderização, portais e troca de mapa

## Próximos mapas
Registre um novo mapa com `World.register('floresta', () => ...)` e aponte um portal para ele:
`{ x, y, w, h, label, to: { map: 'floresta', x: 40, y: 55 } }`. A troca com fade já está pronta.
