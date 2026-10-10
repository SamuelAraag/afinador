import { test } from "node:test";
import assert from "node:assert/strict";
import { CORDAS, rms, detectPitch, centsEntre, cordaMaisProxima, mediana } from "../js/servicos/pitch.js";

// Gerador determinístico, para o teste não variar entre execuções.
function aleatorio(semente) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function sinal(freq, n, sampleRate, { amps = [1, 0.6, 0.4, 0.3, 0.2, 0.1], ruido = 0.02, dc = 0, rand }) {
  const buf = new Float32Array(n);
  const fases = amps.map(() => rand() * 2 * Math.PI);
  for (let i = 0; i < n; i++) {
    let v = 0;
    amps.forEach((a, k) => {
      v += a * Math.sin((2 * Math.PI * freq * (k + 1) * i) / sampleRate + fases[k]);
    });
    buf[i] = v / 3 + ruido * (rand() - 0.5) + dc;
  }
  return buf;
}

test("detecta as 6 cordas, afinadas e desafinadas, com erro abaixo de 2 cents", () => {
  const rand = aleatorio(1);
  let pior = 0;
  for (const sampleRate of [44100, 48000]) {
    for (const corda of CORDAS) {
      for (const desvio of [-30, -9, 0, 7, 30]) {
        for (let rodada = 0; rodada < 10; rodada++) {
          const freq = corda.freq * 2 ** (desvio / 1200);
          const lida = detectPitch(sinal(freq, 4096, sampleRate, { rand }), sampleRate);
          assert.ok(lida > 0, `sem leitura na ${corda.numero}ª corda`);
          const erro = Math.abs(centsEntre(lida, freq));
          pior = Math.max(pior, erro);
          assert.ok(erro < 2, `${corda.numero}ª corda ${desvio} cents: erro de ${erro.toFixed(2)}`);
          assert.equal(cordaMaisProxima(lida).numero, corda.numero);
        }
      }
    }
  }
  console.log(`pior erro: ${pior.toFixed(2)} cents`);
});

test("fundamental fraca não vira erro de oitava", () => {
  const rand = aleatorio(2);
  const buf = sinal(82.41, 4096, 44100, { amps: [0.2, 1, 0.8, 0.5, 0.3, 0.2], rand });
  assert.ok(Math.abs(centsEntre(detectPitch(buf, 44100), 82.41)) < 2);
});

test("offset DC não desloca a leitura", () => {
  const rand = aleatorio(3);
  const buf = sinal(82.41, 4096, 44100, { dc: 0.3, rand });
  assert.ok(Math.abs(centsEntre(detectPitch(buf, 44100), 82.41)) < 2);
});

test("fora da faixa, silêncio e ruído devolvem 0", () => {
  const rand = aleatorio(4);
  assert.equal(detectPitch(sinal(500, 4096, 44100, { amps: [1], rand }), 44100), 0);
  assert.equal(detectPitch(sinal(50, 4096, 44100, { amps: [1], rand }), 44100), 0);
  assert.equal(detectPitch(new Float32Array(4096), 44100), 0);
  const ruido = Float32Array.from({ length: 4096 }, () => rand() - 0.5);
  assert.equal(detectPitch(ruido, 44100), 0);
});

test("rms", () => {
  assert.equal(rms(new Float32Array(8)), 0);
  assert.ok(Math.abs(rms(Float32Array.from([1, -1, 1, -1])) - 1) < 1e-9);
});

test("corda mais próxima e cents", () => {
  assert.equal(cordaMaisProxima(80).numero, 6);
  assert.equal(cordaMaisProxima(112).numero, 5);
  assert.equal(cordaMaisProxima(330).numero, 1);
  assert.ok(Math.abs(centsEntre(440, 220) - 1200) < 1e-9);
  assert.ok(centsEntre(81, 82.41) < 0);
});

test("mediana ignora leitura isolada", () => {
  assert.equal(mediana([110, 110.2, 220, 109.9, 110.1]), 110.1);
  assert.equal(mediana([1, 3]), 2);
});
