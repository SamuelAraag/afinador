# A-finador

Afinador de violão que roda no navegador. O "A" é de afinador e também da nota Lá, a referência de 440 Hz.

Web pura: HTML, CSS e JavaScript, sem framework, sem build e sem dependência.

## Como usar

O navegador só libera o microfone em HTTPS ou em `localhost`, então abrir o `index.html` direto do disco não funciona.

```
npm start
```

Depois abra `http://localhost:8080`, clique em "Ativar microfone" e toque uma corda.

## Testes

```
npm test
```

Exige Node 20 ou mais novo. Os testes cobrem a detecção com sinais sintéticos das 6 cordas.

## Estrutura

| Arquivo | O que é |
|---|---|
| `index.html` | a tela |
| `afinador.css` | estilos e tokens de cor |
| `afinador.js` | microfone e estados da tela |
| `pitch.js` | detecção da nota, sem DOM |
| `pitch.test.js` | testes da detecção |
| `icone.svg` | ícone do app |
| `docs/afinador-de-violao.md` | como funciona um afinador |
| `docs/plano-de-implementacao.md` | plano do MVP |
| `.agents/preferencias.md` | decisões de nome, cor e stack |
