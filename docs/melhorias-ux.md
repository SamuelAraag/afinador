# Melhorias de UX pendentes

Resultado da revisão de UX feita em 10/10/2026 sobre a branch `ajustes` (commit `8ae2dbd`). Nenhum item impede o uso. Nada aqui foi corrigido ainda.

## Como foi medido

No Chrome de desktop, com a tela local e um oscilador simulando o microfone:

- contraste calculado a partir dos tokens de `css/afinador.css`;
- posição dos elementos comparada entre os estados parado, silêncio e leitura;
- foco conferido depois de cada interação;
- largura de 320 px em um quadro embutido, com o painel "Ajustes" aberto.

Não foi testado com leitor de tela nem em aparelho real.

## Problemas, do mais ao menos importante

### 1. Nota apagada demais no silêncio

- **O que acontece:** quando a corda para de soar, a última nota fica na tela na cor `--linha` sobre `--fundo`. O contraste é 1,52:1; o mínimo para texto grande é 3:1.
- **Por que importa:** antes só o "A" decorativo usava essa cor. Agora o texto é informação ("estou afinando o Mi") e fica quase ilegível, principalmente sob luz forte.
- **Onde:** `css/afinador.css`, regra `[data-leitura="silencio"] .nota-nome`.
- **Correção sugerida:** no silêncio com nota, usar `--texto-2` (6,57:1). Manter `--linha` só para o "A" do estado parado, que é decorativo.

### 2. Trocar o microfone pelo teclado rouba o foco

- **O que acontece:** ao mudar a opção no campo Microfone, o foco pula para o botão "Parar".
- **Por que importa:** quem percorre as opções com as setas perde o lugar a cada tecla.
- **Onde:** `js/afinador.js`. A troca chama `parar()` e `ativar()`, e `ativar()` termina com `el.mic.focus()`.
- **Correção sugerida:** só mover o foco para o botão quando a ativação veio de um clique nele.

### 3. A tela pula 11 px a cada nota

- **O que acontece:** a instrução tem `min-height: 2.8em`, e o tamanho da fonte muda entre "Toque uma corda." (1rem) e "Aperte", "Afrouxe" ou "Afinada" (1.25rem). A altura passa de 45 px para 56 px, e o medidor, o botão e as cordas sobem e descem.
- **Por que importa:** o salto acontece toda vez que a corda soa e para, que é o uso normal.
- **Onde:** `css/afinador.css`, regra `.instrucao`.
- **Correção sugerida:** altura mínima em `rem`, fixa para os dois tamanhos de fonte.

### 4. Aviso de microfone mudo não some ao parar

- **O que acontece:** se aparece "O microfone X não está enviando som" e o usuário clica em "Parar", o aviso continua na tela com o afinador desligado.
- **Onde:** `js/afinador.js`, função `parar()`.
- **Correção sugerida:** limpar o aviso ao parar. O aviso de microfone desconectado é mostrado depois do `parar()`, então continua funcionando.

### 5. No celular, a corda tocada com o dedo parece "tocando"

- **O que acontece:** o realce de `hover` das cordas usa o mesmo fundo da corda detectada. Em tela de toque o `hover` fica preso depois do toque, então a linha segue destacada sem estar soando nem travada.
- **Onde:** `css/afinador.css`, regra `.corda:hover`.
- **Correção sugerida:** aplicar o `hover` só em aparelhos com ponteiro, com `@media (hover: hover)`. Vale também para `.botao` e `.botao-leve`.

### 6. Zona de afinação e barra de volume quase invisíveis

- **O que acontece:** as duas usam `--linha` sobre `--superficie`, com contraste de 1,34:1. O mínimo para elemento gráfico é 3:1.
- **Por que importa:** a barra de volume abaixo do mínimo mal aparece, justamente quando o usuário está calibrando a sensibilidade. O texto ao lado compensa em parte.
- **Onde:** `css/afinador.css`, regras `.zona` e `.nivel-barra`.
- **Correção sugerida:** depende de decisão visual. Uma opção é usar `--texto-2` na barra de volume e contornar a zona central em vez de preenchê-la.

## Observações menores

- O campo Microfone fica entre o botão e as cordas, e empurra as cordas para baixo quando aparece. Com o painel "Ajustes", ele caberia melhor lá dentro. Mover exige atualizar o texto do aviso de microfone mudo, que hoje diz "logo abaixo do botão".
- Em 320 px, o fio de cada corda encolhe para 64 px porque a coluna do rótulo "tocando" reserva espaço mesmo vazia.
- As classes reutilizáveis (`.botao`, `.botao-leve`, `.campo`, `.ajuste`, `.aviso`, `.apoio`) não estão catalogadas em `.agents/`.

## O que está certo

- Contraste de todo o restante: entre 5,2:1 e 15:1.
- 320 px sem rolagem horizontal, com o painel de ajustes aberto.
- Alvos de toque de 44 px em botões, cordas, controles deslizantes e no título "Ajustes".
- Estado nunca comunicado só por cor.
- Sem animação com `prefers-reduced-motion`.
- Ordem do código igual à ordem visual.

## Situação

| # | Item | Situação |
|---|---|---|
| 1 | Contraste da nota no silêncio | pendente |
| 2 | Foco ao trocar o microfone | pendente |
| 3 | Salto de 11 px na instrução | pendente |
| 4 | Aviso que não some ao parar | pendente |
| 5 | Hover preso no toque | pendente |
| 6 | Zona e barra de volume pouco visíveis | pendente, depende de decisão visual |
