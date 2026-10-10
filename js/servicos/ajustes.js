// Ajustes que o usuário pode regular. Não mexe na tela.

const CHAVE = "afinador.ajustes";

// Volume mínimo (RMS) para cada nível de sensibilidade, do menos ao mais
// sensível. Quanto mais sensível, mais baixo o som que o afinador aceita.
const VOLUMES = [0.02, 0.01, 0.005, 0.003, 0.002, 0.001, 0.0005];

export const LIMITES = {
  sensibilidade: { min: 1, max: VOLUMES.length, passo: 1 },
  margem: { min: 1, max: 15, passo: 1 }, // cents para considerar afinada
  rigor: { min: 60, max: 95, passo: 5 }, // clareza mínima da nota, em %
};

export const PADRAO = Object.freeze({ sensibilidade: 5, margem: 5, rigor: 80 });

// Devolve ajustes válidos a partir de qualquer coisa: valor ausente, fora
// da faixa ou que não seja número volta ao padrão ou ao limite mais próximo.
export function normalizar(bruto) {
  const ajustes = {};
  for (const [nome, { min, max, passo }] of Object.entries(LIMITES)) {
    const valor = Number(bruto?.[nome]);
    ajustes[nome] = Number.isFinite(valor)
      ? Math.min(max, Math.max(min, Math.round(valor / passo) * passo))
      : PADRAO[nome];
  }
  return ajustes;
}

export function carregar() {
  try {
    return normalizar(JSON.parse(localStorage.getItem(CHAVE)));
  } catch {
    return { ...PADRAO };
  }
}

export function salvar(ajustes) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(normalizar(ajustes)));
  } catch {
    // Sem armazenamento, os ajustes valem só para esta visita.
  }
}

// Volume (RMS) abaixo do qual o som é ignorado.
export function volumeMinimo(ajustes) {
  return VOLUMES[ajustes.sensibilidade - 1];
}

// Clareza mínima da nota, de 0 a 1, para o detectPitch.
export function clarezaMinima(ajustes) {
  return ajustes.rigor / 100;
}

// Depois de afinada, o desvio precisa passar deste valor para sair do
// estado. A folga evita que "Afinada" pisque quando a leitura oscila.
export function margemDeSaida(ajustes) {
  return ajustes.margem + Math.max(2, Math.round(ajustes.margem * 0.6));
}
