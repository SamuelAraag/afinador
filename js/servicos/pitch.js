// Detecção de afinação, sem DOM. Algoritmo: McLeod Pitch Method (MPM).
// A teoria está em docs/afinador-de-violao.md.

const LA4 = 440;

function freqDoMidi(midi) {
  return LA4 * 2 ** ((midi - 69) / 12);
}

// Afinação padrão, da 6ª (mais grave) para a 1ª.
export const CORDAS = [
  { numero: 6, nome: "Mi", letra: "E", midi: 40 },
  { numero: 5, nome: "Lá", letra: "A", midi: 45 },
  { numero: 4, nome: "Ré", letra: "D", midi: 50 },
  { numero: 3, nome: "Sol", letra: "G", midi: 55 },
  { numero: 2, nome: "Si", letra: "B", midi: 59 },
  { numero: 1, nome: "Mi", letra: "E", midi: 64 },
].map((c) => ({ ...c, freq: freqDoMidi(c.midi) }));

// Volume médio do buffer. Usado para ignorar silêncio e ruído.
export function rms(buf) {
  let soma = 0;
  for (let i = 0; i < buf.length; i++) soma += buf[i] * buf[i];
  return Math.sqrt(soma / buf.length);
}

// Retorna a frequência fundamental em Hz, ou 0 se não houver nota confiável
// dentro da faixa.
export function detectPitch(buf, sampleRate, opcoes = {}) {
  const { minFreq = 65, maxFreq = 400, clarezaMinima = 0.8, corte = 0.9 } = opcoes;
  const n = buf.length;
  const maxLag = Math.min(Math.ceil(sampleRate / minFreq) + 1, n - 2);
  if (maxLag < 3) return 0;

  // Remove o offset DC, que desloca o pico da autocorrelação.
  let media = 0;
  for (let i = 0; i < n; i++) media += buf[i];
  media /= n;
  const x = new Float32Array(n);
  let energia = 0;
  for (let i = 0; i < n; i++) {
    x[i] = buf[i] - media;
    energia += x[i] * x[i];
  }
  if (energia === 0) return 0;

  // NSDF: autocorrelação normalizada pela energia das duas janelas, o que
  // elimina o viés para lags menores. Fica entre -1 e 1.
  const nsdf = new Float32Array(maxLag + 1);
  let m = 2 * energia;
  nsdf[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    m -= x[lag - 1] * x[lag - 1] + x[n - lag] * x[n - lag];
    let acf = 0;
    for (let i = 0; i < n - lag; i++) acf += x[i] * x[i + lag];
    nsdf[lag] = m > 0 ? (2 * acf) / m : 0;
  }

  // Um pico por região positiva, a partir do primeiro cruzamento por zero.
  // Só vale pico de verdade, maior que os dois vizinhos.
  const picos = [];
  let lag = 1;
  while (lag < maxLag && nsdf[lag] > 0) lag++;
  let melhor = -1;
  for (; lag < maxLag; lag++) {
    if (nsdf[lag] <= 0) {
      if (melhor > 0) picos.push(melhor);
      melhor = -1;
      continue;
    }
    const ePico = nsdf[lag] >= nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1];
    if (ePico && (melhor < 0 || nsdf[lag] > nsdf[melhor])) melhor = lag;
  }
  if (melhor > 0) picos.push(melhor);
  if (picos.length === 0) return 0;

  let maior = 0;
  for (const p of picos) maior = Math.max(maior, nsdf[p]);
  if (maior < clarezaMinima) return 0;

  // O primeiro pico alto o bastante é o período. Pegar o máximo global
  // arriscaria cair em 2T ou 3T (erro de oitava).
  const escolhido = picos.find((p) => nsdf[p] >= corte * maior);

  // Interpolação parabólica em volta do pico.
  const y0 = nsdf[escolhido - 1];
  const y1 = nsdf[escolhido];
  const y2 = nsdf[escolhido + 1];
  const d = y0 - 2 * y1 + y2;
  let offset = d !== 0 ? (0.5 * (y0 - y2)) / d : 0;
  offset = Math.max(-0.5, Math.min(0.5, offset));

  const freq = sampleRate / (escolhido + offset);
  return freq >= minFreq && freq <= maxFreq ? freq : 0;
}

// Desvio em cents de `freq` em relação a `alvo`. Negativo = grave.
export function centsEntre(freq, alvo) {
  return 1200 * Math.log2(freq / alvo);
}

// Corda da afinação padrão mais próxima da frequência.
export function cordaMaisProxima(freq) {
  let melhor = CORDAS[0];
  for (const corda of CORDAS) {
    if (Math.abs(centsEntre(freq, corda.freq)) < Math.abs(centsEntre(freq, melhor.freq))) {
      melhor = corda;
    }
  }
  return melhor;
}

export function mediana(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}
