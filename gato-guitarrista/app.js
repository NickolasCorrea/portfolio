// Gato Guitarrista: o som do violão é sintetizado no navegador (Web Audio API)
// com o algoritmo de Karplus-Strong, sem nenhum arquivo de áudio.
'use strict';

// Afinação padrão, da corda mais grave (6ª, Mi) para a mais aguda (1ª, Mi).
const CORDAS_SOLTAS = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

// Casa pressionada em cada corda (null = corda abafada, não toca).
// `pos` é onde a pata fica no braço do violão (coordenada local do desenho).
const ACORDES = [
  { nome: 'Em', casas: [0, 2, 2, 0, 0, 0], pos: -118 },
  { nome: 'G', casas: [3, 2, 0, 0, 0, 3], pos: -138 },
  { nome: 'D', casas: [null, null, 0, 2, 3, 2], pos: -128 },
  { nome: 'C', casas: [null, 3, 2, 0, 1, 0], pos: -140 },
  { nome: 'Am', casas: [null, 0, 2, 2, 1, 0], pos: -122 },
  { nome: 'E', casas: [0, 2, 2, 1, 0, 0], pos: -112 },
];

// Show automático: progressão G–D–Em–C, um acorde por compasso,
// com a batida clássica (B = baixo, C = cima, '-' = pausa) em colcheias.
const PROGRESSAO = [1, 2, 0, 3];
const BATIDA = ['B', '-', 'B', 'C', '-', 'C', 'B', 'C'];

// ---------- Áudio ----------

let ctx = null;
let mestre = null;
let seco = null;
let molhado = null;
const cacheNotas = new Map();
const tocandoPorCorda = new Array(6).fill(null);

function iniciarAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  const compressor = ctx.createDynamicsCompressor();
  compressor.connect(ctx.destination);

  mestre = ctx.createGain();
  mestre.gain.value = 0.7;

  // Caminho limpo e caminho distorcido (modo rock); o botão troca o volume de cada um.
  seco = ctx.createGain();
  molhado = ctx.createGain();
  molhado.gain.value = 0;

  const distorcao = ctx.createWaveShaper();
  distorcao.curve = curvaDistorcao(40);
  distorcao.oversample = '4x';
  const tom = ctx.createBiquadFilter();
  tom.type = 'lowpass';
  tom.frequency.value = 3200;

  mestre.connect(seco).connect(compressor);
  mestre.connect(distorcao).connect(tom).connect(molhado).connect(compressor);
}

function curvaDistorcao(intensidade) {
  const n = 2048;
  const curva = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curva[i] = ((1 + intensidade) * x) / (1 + intensidade * Math.abs(x));
  }
  return curva;
}

// Karplus-Strong: um ruído curto realimentado com média de amostras vizinhas
// soa como uma corda dedilhada que vai perdendo o brilho.
function gerarNota(freq) {
  const chave = Math.round(freq * 100);
  if (cacheNotas.has(chave)) return cacheNotas.get(chave);

  const taxa = ctx.sampleRate;
  const duracao = 3;
  const buffer = ctx.createBuffer(1, Math.floor(taxa * duracao), taxa);
  const d = buffer.getChannelData(0);
  const periodo = Math.max(2, Math.round(taxa / freq));
  const perda = 0.996;

  let anterior = 0;
  for (let i = 0; i < periodo; i++) {
    // ruído levemente filtrado, para um ataque menos áspero
    anterior = 0.6 * (Math.random() * 2 - 1) + 0.4 * anterior;
    d[i] = anterior;
  }
  for (let i = periodo; i < d.length; i++) {
    d[i] = perda * 0.5 * (d[i - periodo] + d[i - periodo + 1]);
  }

  cacheNotas.set(chave, buffer);
  return buffer;
}

function tocarCorda(corda, casa, quando, volume) {
  const anterior = tocandoPorCorda[corda];
  if (anterior) {
    // abafa o som anterior da mesma corda, como a mão de verdade faria
    anterior.ganho.gain.setTargetAtTime(0, quando, 0.015);
    anterior.fonte.stop(quando + 0.1);
  }

  const freq = CORDAS_SOLTAS[corda] * Math.pow(2, casa / 12);
  const fonte = ctx.createBufferSource();
  fonte.buffer = gerarNota(freq);
  const ganho = ctx.createGain();
  ganho.gain.value = volume;
  fonte.connect(ganho).connect(mestre);
  fonte.start(quando);

  const atual = { fonte, ganho };
  tocandoPorCorda[corda] = atual;
  fonte.onended = () => {
    if (tocandoPorCorda[corda] === atual) tocandoPorCorda[corda] = null;
  };
}

// Toca o acorde passando pelas cordas: para baixo vai do grave ao agudo, para cima volta.
function palhetar(indiceAcorde, direcao = 'B', quando = null) {
  iniciarAudio();
  if (ctx.state === 'suspended') ctx.resume();

  const acorde = ACORDES[indiceAcorde];
  const inicio = quando ?? ctx.currentTime;
  let ordem = [0, 1, 2, 3, 4, 5];
  if (direcao === 'C') ordem = ordem.reverse().slice(0, 4); // subida pega só as agudas

  const intervalo = direcao === 'C' ? 0.012 : 0.018;
  let passo = 0;
  for (const corda of ordem) {
    const casa = acorde.casas[corda];
    if (casa === null) continue;
    const volume = (direcao === 'C' ? 0.22 : 0.3) * (0.85 + Math.random() * 0.3);
    tocarCorda(corda, casa, inicio + passo * intervalo, volume);
    passo++;
  }

  const atraso = Math.max(0, (inicio - ctx.currentTime) * 1000);
  setTimeout(() => animarPalhetada(direcao), atraso);
}

// ---------- Visual ----------

const svgGato = document.getElementById('gato');
const bracoRitmo = document.getElementById('braco-ritmo');
const bracoAcorde = document.getElementById('braco-acorde');
const pataAcorde = document.getElementById('pata-acorde');
const cordasSvg = document.getElementById('cordas');
const camadaNotas = document.getElementById('notas');
const SIMBOLOS = ['♪', '♫', '♩', '♬'];

let timerBraco = null;

function animarPalhetada(direcao) {
  bracoRitmo.classList.remove('baixo', 'cima');
  bracoRitmo.classList.add(direcao === 'C' ? 'cima' : 'baixo');
  clearTimeout(timerBraco);
  timerBraco = setTimeout(() => bracoRitmo.classList.remove('baixo', 'cima'), 110);

  cordasSvg.classList.remove('vibrando');
  void cordasSvg.getBBox(); // reinicia a animação
  cordasSvg.classList.add('vibrando');

  soltarNota();
}

function soltarNota() {
  const nota = document.createElement('span');
  nota.className = 'nota';
  nota.textContent = SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];
  nota.style.left = `${50 + Math.random() * 20}%`;
  nota.style.top = `${62 + Math.random() * 10}%`;
  nota.style.setProperty('--dx', `${Math.round(Math.random() * 120 - 40)}px`);
  nota.style.setProperty('--giro', `${Math.round(Math.random() * 60 - 30)}deg`);
  nota.addEventListener('animationend', () => nota.remove());
  camadaNotas.append(nota);
}

// Move a pata da mão esquerda pelo braço do violão (mesma transformação do desenho).
function posicionarPata(xLocal) {
  const angulo = (25 * Math.PI) / 180;
  const x = 215 + xLocal * Math.cos(angulo);
  const y = 345 + xLocal * Math.sin(angulo);
  const caminho = `M140 265 Q ${((140 + x) / 2 - 10).toFixed(1)} ${(y - 15).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  bracoAcorde.setAttribute('d', caminho);
  bracoAcorde.style.d = `path("${caminho}")`;
  pataAcorde.setAttribute('cx', x.toFixed(1));
  pataAcorde.setAttribute('cy', y.toFixed(1));
}

// ---------- Controles ----------

const areaAcordes = document.getElementById('acordes');
const btnTocar = document.getElementById('btn-tocar');
const btnAuto = document.getElementById('btn-auto');
const btnRock = document.getElementById('btn-rock');
const inputBpm = document.getElementById('bpm');
const saidaBpm = document.getElementById('bpm-valor');

let acordeAtual = 0;
let proximaDirecao = 'B';

const botoesAcorde = ACORDES.map((acorde, i) => {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.innerHTML = `${acorde.nome}<small>${i + 1}</small>`;
  botao.setAttribute('aria-label', `Acorde ${acorde.nome} (tecla ${i + 1})`);
  botao.addEventListener('click', () => {
    escolherAcorde(i);
    tocarManual();
  });
  areaAcordes.append(botao);
  return botao;
});

function escolherAcorde(i) {
  acordeAtual = i;
  botoesAcorde.forEach((b, j) => b.classList.toggle('ativo', j === i));
  posicionarPata(ACORDES[i].pos);
}

// Tocando à mão, alterna baixo e cima a cada toque.
function tocarManual() {
  palhetar(acordeAtual, proximaDirecao);
  proximaDirecao = proximaDirecao === 'B' ? 'C' : 'B';
}

// ---------- Show automático (agendador com antecedência, para não atrasar) ----------

let showLigado = false;
let timerShow = null;
let proximoTempo = 0;
let passoShow = 0;

function bpm() { return Number(inputBpm.value); }

function agendarShow() {
  const colcheia = 60 / bpm() / 2;
  while (proximoTempo < ctx.currentTime + 0.12) {
    const compasso = Math.floor(passoShow / BATIDA.length) % PROGRESSAO.length;
    const golpe = BATIDA[passoShow % BATIDA.length];
    const indice = PROGRESSAO[compasso];
    if (passoShow % BATIDA.length === 0) {
      const atraso = Math.max(0, (proximoTempo - ctx.currentTime) * 1000);
      setTimeout(() => escolherAcorde(indice), atraso);
    }
    if (golpe !== '-') palhetar(indice, golpe, proximoTempo);
    proximoTempo += colcheia;
    passoShow++;
  }
  timerShow = setTimeout(agendarShow, 25);
}

function alternarShow(ligar = !showLigado) {
  showLigado = ligar;
  btnAuto.setAttribute('aria-pressed', String(ligar));
  svgGato.classList.toggle('tocando', ligar);
  clearTimeout(timerShow);
  if (ligar) {
    iniciarAudio();
    if (ctx.state === 'suspended') ctx.resume();
    passoShow = 0;
    proximoTempo = ctx.currentTime + 0.05;
    agendarShow();
  }
}

function alternarRock() {
  iniciarAudio();
  const ligar = btnRock.getAttribute('aria-pressed') !== 'true';
  btnRock.setAttribute('aria-pressed', String(ligar));
  svgGato.classList.toggle('rock', ligar);
  const agora = ctx.currentTime;
  seco.gain.setTargetAtTime(ligar ? 0.15 : 1, agora, 0.02);
  molhado.gain.setTargetAtTime(ligar ? 0.55 : 0, agora, 0.02);
}

function atualizarBpm() {
  saidaBpm.textContent = inputBpm.value;
  document.documentElement.style.setProperty('--batida', `${60 / bpm()}s`);
}

svgGato.setAttribute('tabindex', '0');
svgGato.addEventListener('pointerdown', tocarManual);
btnTocar.addEventListener('click', tocarManual);
btnAuto.addEventListener('click', () => alternarShow());
btnRock.addEventListener('click', alternarRock);
inputBpm.addEventListener('input', atualizarBpm);

document.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const numero = Number(e.key);
  if (numero >= 1 && numero <= ACORDES.length) {
    escolherAcorde(numero - 1);
    tocarManual();
  } else if (e.code === 'Space' || (e.key === 'Enter' && e.target === svgGato)) {
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;
    e.preventDefault();
    tocarManual();
  } else if (e.key.toLowerCase() === 'a') {
    alternarShow();
  } else if (e.key.toLowerCase() === 'r') {
    alternarRock();
  }
});

escolherAcorde(0);
atualizarBpm();
