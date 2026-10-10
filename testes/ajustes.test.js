import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LIMITES,
  PADRAO,
  normalizar,
  volumeMinimo,
  clarezaMinima,
  margemDeSaida,
} from "../js/servicos/ajustes.js";

test("o padrão reproduz os valores anteriores aos ajustes", () => {
  assert.equal(volumeMinimo(PADRAO), 0.002);
  assert.equal(clarezaMinima(PADRAO), 0.8);
  assert.equal(PADRAO.margem, 5);
  assert.equal(margemDeSaida(PADRAO), 8);
});

test("mais sensibilidade aceita som mais baixo", () => {
  let anterior = Infinity;
  for (let s = LIMITES.sensibilidade.min; s <= LIMITES.sensibilidade.max; s++) {
    const volume = volumeMinimo({ ...PADRAO, sensibilidade: s });
    assert.ok(volume < anterior, `nível ${s}`);
    anterior = volume;
  }
});

test("a margem de saída é sempre maior que a de entrada", () => {
  for (let m = LIMITES.margem.min; m <= LIMITES.margem.max; m++) {
    assert.ok(margemDeSaida({ ...PADRAO, margem: m }) >= m + 2, `margem ${m}`);
  }
});

test("normalizar corrige valor ausente, inválido e fora da faixa", () => {
  assert.deepEqual(normalizar(null), { ...PADRAO });
  assert.deepEqual(normalizar({ sensibilidade: "x", margem: undefined }), { ...PADRAO });
  assert.deepEqual(normalizar({ sensibilidade: 99, margem: -3, rigor: 200 }), {
    sensibilidade: LIMITES.sensibilidade.max,
    margem: LIMITES.margem.min,
    rigor: LIMITES.rigor.max,
  });
  assert.equal(normalizar({ rigor: 72 }).rigor, 70);
  assert.deepEqual(normalizar({ sensibilidade: 2, margem: 10, rigor: 65 }), {
    sensibilidade: 2,
    margem: 10,
    rigor: 65,
  });
});
