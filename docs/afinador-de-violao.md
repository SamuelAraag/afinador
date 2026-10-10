# Como funciona um afinador de violão

Um afinador mede a frequência com que a corda vibra e compara com a frequência que a nota deveria ter. Programaticamente são quatro etapas:

```
microfone -> buffer PCM -> período da onda -> frequência (Hz) -> nota + desvio em cents
```

## 1. Conceitos

**Frequência fundamental.** Uma corda não vibra em uma frequência só. Ela gera a fundamental (f) mais os harmônicos (2f, 3f, 4f...). A nota que ouvimos é a fundamental, mas um harmônico pode ter mais energia que ela. Por isso "pegar o maior pico do espectro" não funciona bem.

**Escala temperada.** Cada semitom multiplica a frequência por 2^(1/12). A referência é o Lá 440 Hz (nota MIDI 69).

**Cents.** Um semitom tem 100 cents. É a unidade do ponteiro do afinador. Dentro de ±5 cents costuma ser considerado afinado.

Afinação padrão:

| Corda | Nota | MIDI | Frequência |
|---|---|---|---|
| 6ª | Mi (E2) | 40 | 82,41 Hz |
| 5ª | Lá (A2) | 45 | 110,00 Hz |
| 4ª | Ré (D3) | 50 | 146,83 Hz |
| 3ª | Sol (G3) | 55 | 196,00 Hz |
| 2ª | Si (B3) | 59 | 246,94 Hz |
| 1ª | Mi (E4) | 64 | 329,63 Hz |

## 2. Captura

O microfone entrega um buffer de amostras PCM (`Float32Array`, valores entre -1 e 1) a uma taxa fixa, normalmente 44100 ou 48000 Hz. As contas abaixo usam 44100.

O buffer precisa conter pelo menos 2 períodos da nota mais grave. O Mi grave (82,41 Hz) tem período de 44100 / 82,41 ≈ 535 amostras, então 2048 amostras cobrem ~3,8 períodos. É o mínimo razoável. 4096 dá mais precisão, ao custo de ~93 ms de latência por leitura.

## 3. Detecção do período (autocorrelação)

A ideia: deslocar o sinal sobre ele mesmo e medir a semelhança. Um sinal periódico volta a se parecer consigo quando o deslocamento (lag) é igual ao período.

```
r(lag) = soma de buf[i] * buf[i + lag]
```

O lag com maior `r` é o período em amostras, e `frequência = sampleRate / lag`.

Só é preciso testar os lags que correspondem à faixa do violão:

- limite agudo 400 Hz: lag mínimo = 44100 / 400 = 110
- limite grave 70 Hz: lag máximo = 44100 / 70 = 630

### Interpolação parabólica

Lag inteiro é grosseiro nas notas agudas. No Mi agudo, os lags 133 e 134 dão 331,6 Hz e 329,1 Hz, um salto de ~13 cents entre dois valores vizinhos. A solução é ajustar uma parábola pelos três pontos em volta do pico e usar o vértice dela como lag fracionário:

```
offset = 0.5 * (y0 - y2) / (y0 - 2*y1 + y2)
lagReal = lag + offset
```

## 4. Frequência para nota

Como cada semitom é uma multiplicação por 2^(1/12), a conversão é um logaritmo de base 2:

```
midi  = 69 + 12 * log2(freq / 440)
nota  = arredondar(midi)
cents = (midi - nota) * 100      // negativo = grave, positivo = agudo
```

## 5. Implementação em JavaScript

Web pura, sem dependência: o navegador entrega o microfone pela Web Audio API.

```js
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Volume médio do buffer. Usado para ignorar silêncio e ruído.
function rms(buf) {
  let sum = 0;
  for (const s of buf) sum += s * s;
  return Math.sqrt(sum / buf.length);
}

// Retorna a frequência fundamental em Hz, ou 0 se não encontrar.
function detectPitch(buf, sampleRate) {
  const minLag = Math.floor(sampleRate / 400); // limite agudo
  const maxLag = Math.floor(sampleRate / 70);  // limite grave
  const corr = new Float64Array(maxLag + 2);

  // Um lag a mais de cada lado, para a interpolação.
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let sum = 0;
    for (let i = 0; i < buf.length - lag; i++) sum += buf[i] * buf[i + lag];
    corr[lag] = sum;
  }

  let best = -1;
  let bestVal = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (corr[lag] > bestVal) { bestVal = corr[lag]; best = lag; }
  }
  if (best < 0) return 0;

  // Interpolação parabólica em volta do pico.
  const y0 = corr[best - 1], y1 = corr[best], y2 = corr[best + 1];
  const d = y0 - 2 * y1 + y2;
  const offset = d !== 0 ? 0.5 * (y0 - y2) / d : 0;

  return sampleRate / (best + offset);
}

function toNote(freq) {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const nearest = Math.round(midi);
  const cents = (midi - nearest) * 100;
  const note = NAMES[nearest % 12] + (Math.floor(nearest / 12) - 1);
  return { note, cents };
}
```

Captura e uso. O navegador só libera o microfone em HTTPS ou `localhost`, e o `AudioContext` precisa ser criado depois de um clique do usuário:

```js
async function start() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048; // tamanho do buffer
  ctx.createMediaStreamSource(stream).connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);

  function tick() {
    requestAnimationFrame(tick);
    analyser.getFloatTimeDomainData(buffer);

    if (rms(buffer) < 0.01) return; // silêncio, não atualiza o ponteiro

    const freq = detectPitch(buffer, ctx.sampleRate);
    if (freq === 0) return;

    const { note, cents } = toNote(freq);
    // note = "E2", cents = -12.4  ->  corda frouxa, apertar a tarraxa
  }
  tick();
}

document.querySelector("#ativar").addEventListener("click", start);
```

Use sempre `ctx.sampleRate` em vez de fixar 44100: muitos dispositivos entregam 48000 Hz. Os filtros de voz do navegador (cancelamento de eco, supressão de ruído, ganho automático) ficam desligados porque distorcem o som da corda.

Para estabilizar o ponteiro, guarde as últimas 5 leituras e exiba a mediana.

## 6. Precisão medida

Testei essa lógica em uma versão Python equivalente, com sinais sintéticos das 6 cordas (fundamental + 5 harmônicos + ruído), afinadas e desafinadas em -9 e +7 cents. As funções `rms`, `detectPitch` e `toNote` acima foram executadas em Node com sinais do mesmo tipo. A captura pelo microfone não foi testada em navegador.

| Buffer | Erro máximo |
|---|---|
| 2048 amostras | ~6 cents (no Mi grave) |
| 4096 amostras | ~2 cents |

O erro se concentra nas cordas graves e é sempre para o agudo. O motivo: quanto maior o lag, menos amostras entram na soma (`buf.length - lag`), então a autocorrelação favorece levemente lags menores. Com buffer maior o efeito diminui.

## 7. Limitações e próximos passos

**Erro de oitava.** Os lags 2T, 3T também correlacionam bem. No teste, dividir a soma por `buf.length - lag` para corrigir o viés acima eliminou o erro nas graves, mas fez o algoritmo errar por uma oitava inteira em algumas notas, porque o pico em 2T passou a empatar com o pico em T. Ou seja, normalizar exige mudar a regra de escolha: em vez do máximo global, pegar o primeiro pico acima de um limiar. É isso que os algoritmos YIN e McLeod (MPM) fazem, e é o que afinadores reais usam. O `js/servicos/pitch.js` deste repositório já implementa o MPM; o código da seção 5 fica como versão didática.

**Custo.** A autocorrelação ingênua é O(N × lags), cerca de 1 milhão de multiplicações por buffer. Roda em tempo real sem problema, mas dá para calcular via FFT em O(N log N).

**Por que não FFT pura.** A resolução de uma FFT é `sampleRate / N`. Com N = 4096 dá ~10,7 Hz por bin, e a distância entre Mi2 (82,41) e Fá2 (87,31) é só 4,9 Hz. No domínio do tempo esse limite não existe.

**Sinal real.** Uma corda de verdade tem ataque ruidoso e harmônicos levemente desafinados (inarmonicidade). Vale descartar os primeiros ~50 ms depois da palhetada.
