import { CORDAS, rms, detectPitch, centsEntre, cordaMaisProxima, mediana } from "./servicos/pitch.js";
import * as microfone from "./servicos/microfone.js";
import * as servicoAjustes from "./servicos/ajustes.js";

const TAMANHO_BUFFER = 4096;
const INTERVALO_MS = 50;
const DIAGNOSTICO = new URLSearchParams(location.search).has("diag");
const LEITURAS = 5;
const SILENCIO_MS = 600; // sem leitura válida por esse tempo, a tela volta a "Toque uma corda"
const MUDO = 1e-5; // abaixo disso o microfone não está enviando nada, nem ruído
const MUDO_MS = 2000;
// Faixa da barra de volume, em escala logarítmica (três décadas).
const NIVEL_MIN = 0.0002;
const NIVEL_MAX = 0.2;

const el = {
  notaNome: document.querySelector("#nota-nome"),
  notaLetra: document.querySelector("#nota-letra"),
  instrucao: document.querySelector("#instrucao"),
  ponteiro: document.querySelector("#ponteiro"),
  cents: document.querySelector("#cents"),
  aviso: document.querySelector("#aviso"),
  mic: document.querySelector("#mic"),
  microfoneBloco: document.querySelector("#microfone-bloco"),
  microfone: document.querySelector("#microfone"),
  modo: document.querySelector("#modo"),
  cordas: document.querySelector("#cordas"),
  hz: document.querySelector("#hz"),
  diag: document.querySelector("#diag"),
  zona: document.querySelector(".zona"),
  sensibilidade: document.querySelector("#sensibilidade"),
  margem: document.querySelector("#margem"),
  rigor: document.querySelector("#rigor"),
  sensibilidadeValor: document.querySelector("#sensibilidade-valor"),
  margemValor: document.querySelector("#margem-valor"),
  rigorValor: document.querySelector("#rigor-valor"),
  nivelBarra: document.querySelector("#nivel-barra"),
  nivelMinimo: document.querySelector("#nivel-minimo"),
  nivelTexto: document.querySelector("#nivel-texto"),
  restaurar: document.querySelector("#restaurar"),
  anuncio: document.querySelector("#anuncio"),
};

let audio = null; // { mic, timer } enquanto estiver ouvindo
let travada = null; // corda escolhida à mão, ou null no modo automático
let leituras = [];
let ultimaLeitura = 0;
let afinada = false;
let ultimoAnuncio = "";
let ultimoSom = 0;
let avisouMudo = false;
let ultimaCorda = null; // última corda detectada; fica na tela enquanto não soa outra
let ajustes = servicoAjustes.carregar();
let nivelAcima = null; // último estado mostrado em nivel-texto

const MODO_AUTO = "Automático: a corda tocada é detectada sozinha. Toque numa corda da lista para travar nela.";

const ERROS = {
  NotAllowedError:
    "O microfone está bloqueado. Libere o acesso no cadeado ao lado do endereço do site e tente de novo.",
  NotFoundError: "Nenhum microfone foi encontrado. Conecte um e tente de novo.",
  NotReadableError: "Outro programa está usando o microfone. Feche-o e tente de novo.",
};

function numero(valor, casas = 0) {
  return valor.toFixed(casas).replace(".", ",");
}

function montarCordas() {
  for (const corda of CORDAS) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "corda";
    botao.dataset.numero = corda.numero;
    botao.setAttribute("aria-pressed", "false");
    botao.style.setProperty("--espessura", `${1 + (corda.numero - 1) * 0.6}px`);

    const partes = [
      ["corda-numero", `${corda.numero}ª`],
      ["corda-nome", corda.nome],
      ["corda-letra", corda.letra],
      ["corda-fio", ""],
      ["corda-marca", ""],
    ];
    for (const [classe, texto] of partes) {
      const span = document.createElement("span");
      span.className = classe;
      span.textContent = texto;
      botao.append(span);
    }
    botao.addEventListener("click", () => alternarTrava(corda));

    const item = document.createElement("li");
    item.append(botao);
    el.cordas.append(item);
  }
}

function marcarCordas(detectada) {
  for (const botao of el.cordas.querySelectorAll(".corda")) {
    const n = Number(botao.dataset.numero);
    const eTravada = travada?.numero === n;
    const eDetectada = detectada?.numero === n;
    botao.setAttribute("aria-pressed", String(eTravada));
    if (eDetectada) botao.setAttribute("aria-current", "true");
    else botao.removeAttribute("aria-current");
    botao.querySelector(".corda-marca").textContent = eTravada ? "● travada" : eDetectada ? "● tocando" : "";
  }
}

function alternarTrava(corda) {
  travada = travada?.numero === corda.numero ? null : corda;
  el.modo.textContent = travada
    ? `Travado na ${travada.numero}ª corda (${travada.nome}). Toque nela de novo para voltar ao automático.`
    : MODO_AUTO;
  leituras = [];
  afinada = false;
  if (audio) mostrarSilencio();
  else marcarCordas(null);
}

function anunciar(texto) {
  if (texto === ultimoAnuncio) return;
  ultimoAnuncio = texto;
  el.anuncio.textContent = texto;
}

function mostrarParado() {
  document.body.dataset.leitura = "parado";
  el.notaNome.textContent = "A";
  el.notaLetra.textContent = "";
  el.instrucao.textContent = "Ative o microfone e toque uma corda.";
  el.cents.textContent = " ";
  el.hz.textContent = "";
  el.ponteiro.style.transform = "translateX(0)";
  marcarCordas(null);
}

function mostrarSilencio() {
  document.body.dataset.leitura = "silencio";
  // Sem som, mantém a corda que estava sendo afinada em vez de voltar ao "A".
  const corda = travada ?? ultimaCorda;
  el.notaNome.textContent = corda ? corda.nome : "A";
  el.notaLetra.textContent = corda ? corda.letra : "";
  el.instrucao.textContent = travada ? `Toque a ${travada.numero}ª corda.` : "Toque uma corda.";
  el.cents.textContent = " ";
  el.hz.textContent = "";
  el.ponteiro.style.transform = "translateX(0)";
  marcarCordas(null);
  anunciar("");
}

function mostrarLeitura(freq) {
  const corda = travada ?? cordaMaisProxima(freq);
  ultimaCorda = corda;
  const cents = centsEntre(freq, corda.freq);
  const desvio = Math.abs(cents);

  afinada = desvio <= (afinada ? servicoAjustes.margemDeSaida(ajustes) : ajustes.margem);
  const estado = afinada ? "afinada" : cents < 0 ? "grave" : "aguda";

  document.body.dataset.leitura = estado;
  el.notaNome.textContent = corda.nome;
  el.notaLetra.textContent = corda.letra;
  el.instrucao.textContent = { afinada: "✓ Afinada", grave: "↑ Aperte", aguda: "↓ Afrouxe" }[estado];

  const lado = cents < 0 ? "abaixo" : "acima";
  el.cents.textContent =
    Math.round(desvio) === 0
      ? "No ponto"
      : desvio > 50
        ? `Mais de 50 cents ${lado}`
        : `${numero(desvio)} cents ${lado}`;
  el.hz.textContent = `${numero(freq, 1)} Hz`;

  // O ponteiro ocupa a largura do trilho, então 1% de deslocamento = 1 cent.
  const posicao = Math.max(-48, Math.min(48, cents));
  el.ponteiro.style.transform = `translateX(${posicao.toFixed(1)}%)`;

  marcarCordas(corda);
  anunciar(
    `${corda.numero}ª corda, ${corda.nome}: ${{ afinada: "afinada", grave: "aperte", aguda: "afrouxe" }[estado]}.`,
  );
}

// Microfone virtual ou mudo entrega zero absoluto. Um microfone de verdade
// sempre tem algum ruído, então dá para distinguir de "ninguém tocou ainda".
function conferirMudo(volume, agora) {
  if (volume > MUDO) {
    ultimoSom = agora;
    if (avisouMudo) {
      avisouMudo = false;
      mostrarAviso("");
    }
  } else if (!avisouMudo && agora - ultimoSom > MUDO_MS) {
    avisouMudo = true;
    mostrarAviso(
      `O microfone "${audio.mic.rotulo}" não está enviando som. Escolha outro em Microfone, logo abaixo do botão.`,
    );
  }
}

// Posição de um volume na barra, de 0 a 1.
function posicaoNoNivel(volume) {
  const p = Math.log10(volume / NIVEL_MIN) / Math.log10(NIVEL_MAX / NIVEL_MIN);
  return Math.max(0, Math.min(1, p));
}

function mostrarNivel(volume) {
  const acima = volume === null ? null : volume >= servicoAjustes.volumeMinimo(ajustes);
  el.nivelBarra.style.transform = `scaleX(${volume === null ? 0 : posicaoNoNivel(volume).toFixed(3)})`;
  el.nivelBarra.dataset.acima = String(acima === true);
  if (acima === nivelAcima && el.nivelTexto.textContent) return;
  nivelAcima = acima;
  el.nivelTexto.textContent =
    acima === null
      ? "Ative o microfone para ver o volume que chega. O traço marca o mínimo."
      : acima
        ? "Som acima do mínimo: o afinador está analisando."
        : "Som abaixo do mínimo: o afinador ignora.";
}

function mostrarAjustes() {
  for (const nome of ["sensibilidade", "margem", "rigor"]) {
    const { min, max, passo } = servicoAjustes.LIMITES[nome];
    Object.assign(el[nome], { min, max, step: passo });
    el[nome].value = ajustes[nome];
  }
  el.sensibilidadeValor.textContent = `${ajustes.sensibilidade} de ${servicoAjustes.LIMITES.sensibilidade.max}`;
  el.margemValor.textContent = `±${ajustes.margem} cents`;
  el.rigorValor.textContent = `${ajustes.rigor}%`;
  // A zona central do medidor acompanha a margem: 1% do trilho = 1 cent.
  el.zona.style.inset = `0 ${50 - ajustes.margem}%`;
  el.nivelMinimo.style.left = `${(posicaoNoNivel(servicoAjustes.volumeMinimo(ajustes)) * 100).toFixed(1)}%`;
  const noPadrao = Object.keys(servicoAjustes.PADRAO).every((n) => ajustes[n] === servicoAjustes.PADRAO[n]);
  el.restaurar.disabled = noPadrao;
}

function aplicarAjustes(novos) {
  ajustes = servicoAjustes.normalizar(novos);
  servicoAjustes.salvar(ajustes);
  afinada = false;
  mostrarAjustes();
}

function ler() {
  const buffer = audio.mic.ler();
  const agora = performance.now();
  const volume = rms(buffer);
  conferirMudo(volume, agora);
  mostrarNivel(volume);
  const freq =
    volume >= servicoAjustes.volumeMinimo(ajustes)
      ? detectPitch(buffer, audio.mic.sampleRate, { clarezaMinima: servicoAjustes.clarezaMinima(ajustes) })
      : 0;
  if (DIAGNOSTICO) {
    el.diag.textContent =
      `áudio ${audio.mic.estado()} · ${audio.mic.sampleRate} Hz · ` +
      `volume ${numero(volume, 4)} · leitura ${numero(freq, 1)} Hz`;
  }

  if (freq === 0) {
    if (leituras.length && agora - ultimaLeitura > SILENCIO_MS) {
      leituras = [];
      afinada = false;
      mostrarSilencio();
    }
    return;
  }

  ultimaLeitura = agora;
  leituras.push(freq);
  if (leituras.length > LEITURAS) leituras.shift();
  mostrarLeitura(mediana(leituras));
}

function mostrarAviso(texto) {
  el.aviso.textContent = texto;
  el.aviso.hidden = !texto;
}

function botao(texto, { ativo = false, desabilitado = false } = {}) {
  el.mic.textContent = texto;
  el.mic.dataset.ativo = String(ativo);
  el.mic.disabled = desabilitado;
}

async function listarMicrofones(idAtual) {
  const entradas = await microfone.listar();
  el.microfone.replaceChildren();
  for (const entrada of entradas) {
    const opcao = document.createElement("option");
    opcao.value = entrada.id;
    opcao.textContent = entrada.nome;
    el.microfone.append(opcao);
  }
  el.microfone.value = idAtual;
  el.microfoneBloco.hidden = entradas.length < 2;
}

async function ativar() {
  mostrarAviso("");
  botao("Aguardando permissão...", { desabilitado: true });

  let mic;
  try {
    mic = await microfone.abrir(TAMANHO_BUFFER);
  } catch (erro) {
    mostrarAviso(ERROS[erro.name] ?? "Não foi possível acessar o microfone. Tente de novo.");
    botao("Tentar novamente");
    el.mic.focus();
    return;
  }

  audio = { mic, timer: 0 };
  ultimoSom = performance.now();
  avisouMudo = false;
  audio.timer = setInterval(ler, INTERVALO_MS);
  listarMicrofones(mic.id).catch(() => {});

  mic.aoDesconectar(() => {
    parar();
    mostrarAviso("O microfone foi desconectado. Conecte de novo e ative o microfone.");
  });

  leituras = [];
  afinada = false;
  botao("Parar", { ativo: true });
  mostrarSilencio();
  el.mic.focus();
}

function parar() {
  if (!audio) return;
  clearInterval(audio.timer);
  audio.mic.fechar();
  audio = null;
  leituras = [];
  afinada = false;
  ultimaCorda = null;
  botao("Ativar microfone");
  mostrarParado();
  mostrarNivel(null);
  anunciar("");
}

montarCordas();
mostrarParado();
mostrarAjustes();
mostrarNivel(null);
for (const nome of ["sensibilidade", "margem", "rigor"]) {
  el[nome].addEventListener("input", () => aplicarAjustes({ ...ajustes, [nome]: el[nome].value }));
}
el.restaurar.addEventListener("click", () => aplicarAjustes(servicoAjustes.PADRAO));
el.diag.hidden = !DIAGNOSTICO;

if (!microfone.suportado()) {
  mostrarAviso(
    window.isSecureContext
      ? "Este navegador não dá acesso ao microfone. Abra em uma versão recente do Chrome, Firefox, Edge ou Safari."
      : "O microfone só funciona em endereço seguro. Abra o afinador por https ou por localhost.",
  );
  el.mic.hidden = true;
} else {
  el.mic.addEventListener("click", () => (audio ? parar() : ativar()));
  el.microfone.addEventListener("change", () => {
    microfone.salvar(el.microfone.value);
    if (!audio) return;
    parar();
    ativar();
  });
}
