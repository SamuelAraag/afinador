# Plano de implementação do MVP

## Objetivo

Afinar as 6 cordas do violão na afinação padrão, pelo navegador, sem instalar nada.

## Quem usa

Alguém com o violão no colo e o celular ou notebook na frente. Olha de relance e está com as mãos ocupadas. Por isso a tela não pede nenhum toque depois de ativar o microfone.

## A tela

Tela única, sem menu, sem rotas e sem modal.

1. **Nota detectada** em destaque (ex.: "Mi" com "E" ao lado) e a instrução em texto: "Aperte", "Afrouxe" ou "Afinada".
2. **Medidor de desvio** de -50 a +50 cents, com a zona de ±5 marcada no centro e o valor em texto.
3. **Botão "Ativar microfone"**, a ação principal. Depois de ativo vira "Parar".
4. **As 6 cordas**: 6ª Mi, 5ª Lá, 4ª Ré, 3ª Sol, 2ª Si, 1ª Mi. O modo automático é o padrão e destaca a corda mais próxima do som. Tocar numa corda trava o alvo nela; tocar de novo volta ao automático.
5. **Rodapé discreto**: frequência em Hz e "Lá = 440 Hz".

## Estados

| Estado | O que mostra |
|---|---|
| Inicial | explicação de uma linha e botão "Ativar microfone" |
| Pedindo permissão | botão desabilitado com "Aguardando permissão..." |
| Ouvindo, sem som | "Toque uma corda", medidor apagado |
| Detectando | nota, medidor e instrução |
| Afinada | "Afinada" com ícone, com folga para não piscar |
| Permissão negada | o que houve, como liberar no navegador e "Tentar novamente" |
| Sem microfone ou sem suporte | mensagem clara, sem botão que não funciona |
| Som fora da faixa | tratado como "Toque uma corda", nunca nota errada |
| Microfone mudo | aviso com o nome do microfone e o seletor para trocar |

## Regras

- "Afinada" é dentro de ±5 cents. Para sair do estado, o desvio precisa passar de 8 cents.
- O estado nunca é comunicado só por cor: sempre texto, ícone e posição do ponteiro.
- O ponteiro anima só com `transform`. Com `prefers-reduced-motion` não há animação.
- Leitor de tela anuncia só quando muda a corda ou o estado, não a cada leitura.
- Tudo por teclado, foco visível, alvos de toque de 44 px no mínimo.
- De 320 px até desktop, sempre uma coluna centralizada.
- Cores, nome e ícone seguem `.agents/preferencias.md`.

## Detecção

- Algoritmo McLeod (MPM) em `js/servicos/pitch.js`. A teoria e a versão didática por autocorrelação simples estão em `afinador-de-violao.md`.
- Buffer de 4096 amostras, uma leitura a cada 50 ms, mediana das últimas 5.
- Faixa de 65 a 400 Hz. Fora disso, sem leitura.
- Leitura com clareza abaixo de 0,8 é descartada.

## Passos

| # | Passo | Entrega |
|---|---|---|
| 1 | Repositório e documentação | `README.md`, este plano, preferências, teoria |
| 2 | Detecção | `js/servicos/pitch.js` e `testes/pitch.test.js` |
| 3 | Tela | `index.html`, `css/afinador.css`, `img/icone.svg` |
| 4 | Microfone e estados | `js/afinador.js` e `js/servicos/microfone.js` |
| 5 | Conferência | testes, navegador em 320, 768 e 1280 px, teclado |

## Fora do MVP

Afinações alternativas, calibração do Lá, tocar a nota de referência, histórico, configurações, outros instrumentos, instalação como app.
