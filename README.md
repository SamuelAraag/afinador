# A-finador

Afinador de violão que roda no navegador. O "A" é de afinador e também da nota Lá, a referência de 440 Hz.

Web pura: HTML, CSS e JavaScript, sem framework, sem build e sem dependência.

## Como usar

O navegador só libera o microfone em HTTPS ou em `localhost`, então abrir o `index.html` direto do disco não funciona.

```
npm start
```

Depois abra `http://localhost:8137`, clique em "Ativar microfone" e toque uma corda.

## Testes

```
npm test
```

Exige Node 20 ou mais novo. Os testes cobrem a detecção com sinais sintéticos das 6 cordas.

## Estrutura

Na raiz fica só o `index.html`, além do `README.md` e do `package.json`, que o GitHub e o npm procuram ali.

| Caminho | O que é |
|---|---|
| `index.html` | a tela |
| `css/afinador.css` | estilos e tokens de cor |
| `js/afinador.js` | estados da tela |
| `js/servicos/pitch.js` | detecção da nota, sem DOM |
| `js/servicos/microfone.js` | acesso ao microfone, sem DOM |
| `img/icone.svg` | ícone do app |
| `testes/pitch.test.js` | testes da detecção |
| `docs/afinador-de-violao.md` | como funciona um afinador |
| `docs/plano-de-implementacao.md` | plano do MVP |
| `.agents/preferencias.md` | decisões de nome, cor e stack |
