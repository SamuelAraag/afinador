// Acesso ao microfone pela Web Audio API. Sem DOM.

const CHAVE = "afinador.microfone";

// Os filtros de voz do navegador distorcem o som da corda.
const FILTROS = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };

export function suportado() {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.AudioContext);
}

export function salvo() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function salvar(id) {
  try {
    localStorage.setItem(CHAVE, id);
  } catch {
    // Sem armazenamento, a escolha vale só para esta visita.
  }
}

// Os nomes dos microfones só ficam disponíveis depois da permissão.
export async function listar() {
  const todos = await navigator.mediaDevices.enumerateDevices();
  return todos
    .filter((d) => d.kind === "audioinput" && d.deviceId !== "communications")
    .map((d, i) => ({ id: d.deviceId, nome: d.label || `Microfone ${i + 1}` }));
}

async function pedirStream() {
  // Sem um microfone escolhido, pede o padrão do sistema. O padrão do
  // navegador pode ser um dispositivo virtual (de app de reunião) que só
  // entrega silêncio.
  const padrao = { ...FILTROS, deviceId: { ideal: "default" } };
  const escolhido = salvo();
  if (!escolhido) return navigator.mediaDevices.getUserMedia({ audio: padrao });
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { ...FILTROS, deviceId: { exact: escolhido } },
    });
  } catch (erro) {
    // O microfone salvo não existe mais (foi desconectado): volta ao padrão.
    if (erro.name !== "OverconstrainedError") throw erro;
    return navigator.mediaDevices.getUserMedia({ audio: padrao });
  }
}

// Abre o microfone. Rejeita com o erro do navegador (NotAllowedError,
// NotFoundError...) se não conseguir.
export async function abrir(tamanhoBuffer) {
  const stream = await pedirStream();
  const ctx = new AudioContext();
  await ctx.resume();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = tamanhoBuffer;
  ctx.createMediaStreamSource(stream).connect(analyser);

  const faixa = stream.getAudioTracks()[0];
  const buffer = new Float32Array(tamanhoBuffer);
  let fechado = false;

  return {
    id: faixa.getSettings().deviceId,
    rotulo: faixa.label,
    sampleRate: ctx.sampleRate,

    // Devolve sempre o mesmo buffer, com as amostras mais recentes.
    ler() {
      analyser.getFloatTimeDomainData(buffer);
      return buffer;
    },

    // Chamado se o microfone for desconectado ou a permissão revogada no
    // meio do uso. Não dispara em fechar().
    aoDesconectar(fn) {
      faixa.addEventListener("ended", () => {
        if (!fechado) fn();
      });
    },

    fechar() {
      fechado = true;
      for (const f of stream.getTracks()) f.stop();
      ctx.close();
    },
  };
}
