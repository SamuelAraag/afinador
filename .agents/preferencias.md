# Preferências do projeto

Decisões do Samuel para o A-finador. Valem acima de qualquer regra genérica de UX.

## Nome e logo

- O nome é um trocadilho: **A-finador**. O "A" é a inicial de "afinador" e também a nota Lá (A), a referência de 440 Hz a partir da qual tudo se afina.
- O ícone é o visor de um afinador de clipe, minimalista: o corpo arredondado, o arco do medidor com o ponteiro no centro e a letra **A** grande no lugar onde esses afinadores mostram a nota (normalmente um E).
- Onde o nome aparecer por extenso, escrever "A-finador", com o hífen.

## Cores

- Cores que remetam ao violão: tampo de abeto, madeira, roseta, cordas.
- O mais claro possível. O objetivo é se distinguir do Cifra Club, que é escuro.
- Só tema claro. Não criar tema escuro.
- Toda cor sai dos tokens no topo de `afinador.css`. Não escrever hex novo fora de lá.

| Token | Uso |
|---|---|
| `--fundo` | fundo da página, tom de abeto |
| `--superficie` | áreas de apoio, madeira clara |
| `--linha` | divisores e trilho do medidor |
| `--texto` | texto principal, tom de ébano |
| `--texto-2` | texto secundário |
| `--madeira` | acento e ação principal, tom de cedro |
| `--afinada` | estado afinado |
| `--fora` | estado desafinado e erros |

## Stack

- Web pura: HTML, CSS e JavaScript, sem framework, sem build e sem dependência.
- Microfone pela Web Audio API.

## Texto

- Português do Brasil, direto.
- Nunca usar travessão.
- Números com vírgula decimal.
- As cordas aparecem com número, nome e letra: "6ª Mi E".
