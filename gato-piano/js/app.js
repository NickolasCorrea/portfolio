'use strict';

(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const PRIMEIRA = 60; // Dó 4
  const ULTIMA = 83;   // Si 5
  const NOMES = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
  const PRETAS = new Set([1, 3, 6, 8, 10]);
  const LARG_BRANCA = 60;
  const LARG_PRETA = 36;
  const TOPO_TECLAS = 310;
  const ALT_BRANCA = 200;
  const ALT_PRETA = 120;
  const MEIO = 420; // divide o teclado entre a pata esquerda e a direita

  // Teclas físicas (e.code), então funciona em QWERTY e ABNT2.
  const ATALHOS = {
    KeyZ: 60, KeyS: 61, KeyX: 62, KeyD: 63, KeyC: 64, KeyV: 65, KeyG: 66,
    KeyB: 67, KeyH: 68, KeyN: 69, KeyJ: 70, KeyM: 71,
    KeyQ: 72, Digit2: 73, KeyW: 74, Digit3: 75, KeyE: 76, KeyR: 77, Digit5: 78,
    KeyT: 79, Digit6: 80, KeyY: 81, Digit7: 82, KeyU: 83,
  };
  const ROTULOS = {};
  for (const [codigo, midi] of Object.entries(ATALHOS)) {
    ROTULOS[midi] = codigo.replace(/^Key|^Digit/, '');
  }

  const palco = document.getElementById('palco');
  const cabeca = document.getElementById('cabeca');
  const notasVoando = document.getElementById('notas-voando');

  // ---------- Teclado do piano ----------

  const teclas = new Map(); // midi -> { grupo, centro, preta }

  function criarTeclado() {
    const brancas = document.getElementById('teclas-brancas');
    const pretas = document.getElementById('teclas-pretas');
    let indiceBranca = 0;

    for (let midi = PRIMEIRA; midi <= ULTIMA; midi++) {
      const preta = PRETAS.has(midi % 12);
      let x;
      let centro;
      if (preta) {
        centro = indiceBranca * LARG_BRANCA;
        x = centro - LARG_PRETA / 2;
      } else {
        x = indiceBranca * LARG_BRANCA;
        centro = x + LARG_BRANCA / 2;
        indiceBranca++;
      }

      const grupo = document.createElementNS(NS, 'g');
      grupo.classList.add('tecla', preta ? 'preta' : 'branca');
      grupo.dataset.midi = midi;
      grupo.setAttribute('role', 'button');
      grupo.setAttribute('aria-label', `${NOMES[midi % 12]} ${Math.floor(midi / 12) - 1}`);

      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', TOPO_TECLAS);
      rect.setAttribute('width', preta ? LARG_PRETA : LARG_BRANCA);
      rect.setAttribute('height', preta ? ALT_PRETA : ALT_BRANCA);
      rect.setAttribute('rx', preta ? 4 : 6);
      grupo.appendChild(rect);

      const rotulo = document.createElementNS(NS, 'text');
      rotulo.classList.add('rotulo');
      rotulo.setAttribute('x', centro);
      rotulo.setAttribute('y', TOPO_TECLAS + (preta ? ALT_PRETA - 12 : ALT_BRANCA - 16));
      rotulo.textContent = ROTULOS[midi] ?? '';
      grupo.appendChild(rotulo);

      (preta ? pretas : brancas).appendChild(grupo);
      teclas.set(midi, { grupo, centro, preta });
    }
  }

  // ---------- Patas ----------

  function criarPata(id, ombro, descanso, lado) {
    const el = document.getElementById(id);
    const [contorno, braco] = el.querySelectorAll('path');
    return {
      ombro, descanso, lado,
      contorno, braco,
      mao: el.querySelector('.mao'),
      x: descanso.x, y: descanso.y,
      alvoX: descanso.x, alvoY: descanso.y,
      notas: [],      // notas seguradas por esta pata, a última é a atual
      ultimoToque: 0,
    };
  }

  const patas = {
    esq: criarPata('pata-esq', { x: 362, y: 215 }, { x: 385, y: 292 }, -1),
    dir: criarPata('pata-dir', { x: 478, y: 215 }, { x: 455, y: 292 }, 1),
  };

  const alturaToque = (tecla) => (tecla.preta ? 390 : 468);

  function desenharPata(p) {
    // Curva com "cotovelo" para fora, para o braço não parecer um palito.
    const cx = (p.ombro.x + p.x) / 2 + p.lado * 40;
    const cy = (p.ombro.y + p.y) / 2 - 10;
    const d = `M${p.ombro.x} ${p.ombro.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    p.contorno.setAttribute('d', d);
    p.braco.setAttribute('d', d);
    p.mao.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
  }

  // Leva a pata até a nota mais recente que ela está segurando.
  function apontarPata(p) {
    const atual = p.notas[p.notas.length - 1];
    if (atual === undefined) return;
    const tecla = teclas.get(atual);
    p.alvoX = tecla.centro;
    p.alvoY = alturaToque(tecla);
  }

  // Ao soltar a última nota, a pata sobe um pouco e espera a próxima;
  // se nada vier em 700 ms, o laço de animação a leva de volta ao descanso.
  function levantarPata(p) {
    p.alvoY = Math.max(p.alvoY - 30, 340);
  }

  // ---------- Notas ----------

  const fontesAtivas = new Map(); // midi -> Set de fontes (teclado, ponteiro, melodia)
  let ultimaNota = -Infinity;

  function ligar(midi, fonte) {
    const tecla = teclas.get(midi);
    if (!tecla) return;
    let fontes = fontesAtivas.get(midi);
    if (!fontes) {
      fontes = new Set();
      fontesAtivas.set(midi, fontes);
    }
    if (fontes.has(fonte)) return;
    fontes.add(fonte);

    Som.tocar(midi);
    tecla.grupo.classList.add('ativa');

    const agora = performance.now();
    ultimaNota = agora;
    const p = tecla.centro < MEIO ? patas.esq : patas.dir;
    p.notas = p.notas.filter((n) => n !== midi);
    p.notas.push(midi);
    p.ultimoToque = agora;
    apontarPata(p);

    cabeca.style.transform = `rotate(${p.lado * 5}deg)`;
    soltarNotinha(tecla);
  }

  function desligar(midi, fonte) {
    const fontes = fontesAtivas.get(midi);
    if (!fontes || !fontes.delete(fonte)) return;
    if (fontes.size > 0) return;
    fontesAtivas.delete(midi);

    Som.soltar(midi);
    const tecla = teclas.get(midi);
    tecla.grupo.classList.remove('ativa');

    const p = tecla.centro < MEIO ? patas.esq : patas.dir;
    p.notas = p.notas.filter((n) => n !== midi);
    p.ultimoToque = performance.now();
    if (p.notas.length) apontarPata(p);
    else levantarPata(p);
  }

  function desligarFontes(filtro) {
    for (const [midi, fontes] of [...fontesAtivas]) {
      for (const fonte of [...fontes]) {
        if (filtro(fonte)) desligar(midi, fonte);
      }
    }
  }

  const CORES_NOTAS = ['#e8833a', '#e86a7f', '#7b6cf6', '#2fa89b', '#d9a400'];

  function soltarNotinha(tecla) {
    const texto = document.createElementNS(NS, 'text');
    texto.classList.add('nota-voando');
    texto.setAttribute('x', tecla.centro);
    texto.setAttribute('y', 285);
    texto.setAttribute('fill', CORES_NOTAS[Math.floor(Math.random() * CORES_NOTAS.length)]);
    texto.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 80)}px`);
    texto.style.setProperty('--giro', `${Math.round((Math.random() - 0.5) * 50)}deg`);
    texto.textContent = Math.random() < 0.5 ? '♪' : '♫';
    texto.addEventListener('animationend', () => texto.remove());
    notasVoando.appendChild(texto);
    // Garantia caso a animação esteja desligada (movimento reduzido).
    setTimeout(() => texto.remove(), 2000);
  }

  // ---------- Animação ----------

  let quadroAnterior = performance.now();

  function quadro(agora) {
    const dt = Math.min(50, agora - quadroAnterior);
    quadroAnterior = agora;
    const k = 1 - Math.exp(-dt / 35);

    for (const p of Object.values(patas)) {
      if (!p.notas.length && agora - p.ultimoToque >= 700) {
        p.alvoX = p.descanso.x;
        p.alvoY = p.descanso.y;
      }
      p.x += (p.alvoX - p.x) * k;
      p.y += (p.alvoY - p.y) * k;
      desenharPata(p);
    }

    const tocando = fontesAtivas.size > 0 || agora - ultimaNota < 900;
    palco.classList.toggle('tocando', tocando);
    if (!tocando) cabeca.style.transform = '';

    requestAnimationFrame(quadro);
  }

  // ---------- Miau ----------

  let fimMiau = 0;
  function miar() {
    Som.miau();
    palco.classList.add('miando');
    clearTimeout(fimMiau);
    fimMiau = setTimeout(() => palco.classList.remove('miando'), 850);
  }

  // ---------- Entrada: mouse e toque ----------

  const ponteiros = new Map(); // pointerId -> midi atual (ou null fora das teclas)
  const midiDoAlvo = (alvo) => {
    const grupo = alvo.closest?.('[data-midi]');
    return grupo ? Number(grupo.dataset.midi) : null;
  };

  palco.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const midi = midiDoAlvo(e.target);
    if (midi === null) return;
    e.preventDefault();
    // No toque o navegador "prende" o dedo no primeiro elemento; soltamos
    // para poder arrastar o dedo de uma tecla para outra (glissando).
    if (e.target.hasPointerCapture?.(e.pointerId)) e.target.releasePointerCapture(e.pointerId);
    ponteiros.set(e.pointerId, midi);
    ligar(midi, `ponteiro:${e.pointerId}`);
  });

  palco.addEventListener('pointerover', (e) => {
    if (!ponteiros.has(e.pointerId)) return;
    const atual = ponteiros.get(e.pointerId);
    const midi = midiDoAlvo(e.target);
    if (midi === atual) return;
    const fonte = `ponteiro:${e.pointerId}`;
    if (atual !== null) desligar(atual, fonte);
    ponteiros.set(e.pointerId, midi);
    if (midi !== null) ligar(midi, fonte);
  });

  function fimPonteiro(e) {
    if (!ponteiros.has(e.pointerId)) return;
    const atual = ponteiros.get(e.pointerId);
    if (atual !== null) desligar(atual, `ponteiro:${e.pointerId}`);
    ponteiros.delete(e.pointerId);
  }
  window.addEventListener('pointerup', fimPonteiro);
  window.addEventListener('pointercancel', fimPonteiro);

  cabeca.addEventListener('click', miar);

  // ---------- Entrada: teclado do computador ----------

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') {
      if (e.target.closest?.('button, input')) return;
      e.preventDefault();
      if (!e.repeat) miar();
      return;
    }
    const midi = ATALHOS[e.code];
    if (midi === undefined) return;
    e.preventDefault();
    if (!e.repeat) ligar(midi, `teclado:${e.code}`);
  });

  window.addEventListener('keyup', (e) => {
    const midi = ATALHOS[e.code];
    if (midi !== undefined) desligar(midi, `teclado:${e.code}`);
  });

  // Se a janela perde o foco, o keyup nunca chega: solta tudo.
  window.addEventListener('blur', () => desligarFontes((f) => !f.startsWith('melodia')));

  // ---------- Melodia de demonstração ----------
  // "Brilha, brilha, estrelinha": melodia na pata direita, baixo na esquerda.

  const FRASES = {
    a: { melodia: [72, 72, 79, 79, 81, 81, 79], baixo: [60, 60, 65, 60] },
    b: { melodia: [77, 77, 76, 76, 74, 74, 72], baixo: [65, 60, 67, 60] },
    c: { melodia: [79, 79, 77, 77, 76, 76, 74], baixo: [60, 65, 60, 67] },
  };
  const ORDEM = ['a', 'b', 'c', 'c', 'a', 'b'];
  const TEMPO = 520; // ms por tempo

  const botaoMelodia = document.getElementById('botao-melodia');
  let agendados = [];

  function montarEventos() {
    const eventos = [];
    ORDEM.forEach((nome, i) => {
      const frase = FRASES[nome];
      const inicio = i * 8;
      frase.melodia.forEach((midi, j) => {
        eventos.push({ tempo: inicio + j, midi, duracao: j === 6 ? 1.8 : 0.85 });
      });
      frase.baixo.forEach((midi, j) => {
        eventos.push({ tempo: inicio + j * 2, midi, duracao: 1.8 });
      });
    });
    return eventos;
  }

  function pararMelodia() {
    agendados.forEach(clearTimeout);
    agendados = [];
    desligarFontes((f) => f.startsWith('melodia'));
    botaoMelodia.textContent = '▶ Tocar melodia';
  }

  function tocarMelodia() {
    if (agendados.length) {
      pararMelodia();
      return;
    }
    botaoMelodia.textContent = '■ Parar';
    const eventos = montarEventos();
    let fim = 0;
    eventos.forEach((ev, i) => {
      const fonte = `melodia:${i}`;
      const comeco = ev.tempo * TEMPO;
      const termino = comeco + ev.duracao * TEMPO;
      fim = Math.max(fim, termino);
      agendados.push(setTimeout(() => ligar(ev.midi, fonte), comeco));
      agendados.push(setTimeout(() => desligar(ev.midi, fonte), termino));
    });
    agendados.push(setTimeout(pararMelodia, fim + 50));
  }

  botaoMelodia.addEventListener('click', tocarMelodia);
  document.getElementById('botao-miau').addEventListener('click', miar);

  // ---------- Controles ----------

  const volume = document.getElementById('volume');
  volume.addEventListener('input', () => Som.definirVolume(Number(volume.value)));

  const mostrarRotulos = document.getElementById('mostrar-rotulos');
  mostrarRotulos.addEventListener('change', () => {
    palco.classList.toggle('com-rotulos', mostrarRotulos.checked);
  });

  criarTeclado();
  requestAnimationFrame(quadro);
})();
