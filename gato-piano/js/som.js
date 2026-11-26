'use strict';

// Síntese de som com a Web Audio API: piano (soma de parciais com envelope)
// e um miau (onda dente de serra passando por um filtro que varia).
const Som = (() => {
  let ctx = null;
  let mestre = null;
  let volume = 0.7;
  const vozes = new Map(); // midi -> { saida, oscs }

  // O navegador só libera o áudio depois de uma interação do usuário,
  // por isso o contexto é criado na primeira nota.
  function garantir() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const compressor = ctx.createDynamicsCompressor();
      mestre = ctx.createGain();
      mestre.gain.value = volume;
      mestre.connect(compressor);
      compressor.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const frequencia = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  function tocar(midi) {
    const c = garantir();
    soltar(midi, 0.03);

    const t = c.currentTime;
    const f = frequencia(midi);
    // Notas agudas morrem mais rápido, como num piano de verdade.
    const duracao = Math.max(1.2, 3.4 - (midi - 60) * 0.08);

    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(Math.min(f * 10, 12000), t);
    filtro.frequency.exponentialRampToValueAtTime(Math.max(f * 2, 700), t + 1.2);

    const saida = c.createGain();
    saida.gain.setValueAtTime(0.0001, t);
    saida.gain.exponentialRampToValueAtTime(0.5, t + 0.006);
    saida.gain.exponentialRampToValueAtTime(0.16, t + 0.3);
    saida.gain.exponentialRampToValueAtTime(0.0001, t + duracao);

    filtro.connect(saida);
    saida.connect(mestre);

    const parciais = [
      [1, 'triangle', 1],
      [2, 'sine', 0.35],
      [3, 'sine', 0.12],
      [4, 'sine', 0.05],
    ];
    const oscs = parciais.map(([mult, tipo, ganho]) => {
      const o = c.createOscillator();
      o.type = tipo;
      o.frequency.value = f * mult;
      o.detune.value = (Math.random() - 0.5) * 4;
      const g = c.createGain();
      g.gain.value = ganho;
      o.connect(g);
      g.connect(filtro);
      o.start(t);
      o.stop(t + duracao + 0.05);
      return o;
    });

    const voz = { saida, oscs };
    vozes.set(midi, voz);
    oscs[0].onended = () => {
      if (vozes.get(midi) === voz) vozes.delete(midi);
      saida.disconnect();
    };
  }

  // Abafa a nota quando a tecla é solta.
  function soltar(midi, tempo = 0.3) {
    const voz = vozes.get(midi);
    if (!voz || !ctx) return;
    vozes.delete(midi);
    const t = ctx.currentTime;
    const ganho = voz.saida.gain;
    if (ganho.cancelAndHoldAtTime) {
      ganho.cancelAndHoldAtTime(t);
    } else {
      ganho.cancelScheduledValues(t);
      ganho.setValueAtTime(ganho.value, t);
    }
    ganho.setTargetAtTime(0.0001, t, tempo / 4);
    for (const o of voz.oscs) {
      try { o.stop(t + tempo + 0.05); } catch { /* já parado */ }
    }
  }

  function miau() {
    const c = garantir();
    const t = c.currentTime;
    const fim = t + 0.85;

    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(840, t + 0.18);
    o.frequency.linearRampToValueAtTime(760, t + 0.42);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.78);

    const vibrato = c.createOscillator();
    vibrato.frequency.value = 6;
    const vibratoGanho = c.createGain();
    vibratoGanho.gain.value = 14;
    vibrato.connect(vibratoGanho);
    vibratoGanho.connect(o.frequency);

    const filtro = c.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 4;
    filtro.frequency.setValueAtTime(800, t);
    filtro.frequency.linearRampToValueAtTime(2100, t + 0.2);
    filtro.frequency.exponentialRampToValueAtTime(700, t + 0.78);

    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.06);
    g.gain.setValueAtTime(0.7, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);

    o.connect(filtro);
    filtro.connect(g);
    g.connect(mestre);
    o.start(t);
    vibrato.start(t);
    o.stop(fim);
    vibrato.stop(fim);
    o.onended = () => g.disconnect();
  }

  function definirVolume(valor) {
    volume = valor;
    if (mestre) mestre.gain.setTargetAtTime(valor, ctx.currentTime, 0.02);
  }

  return { tocar, soltar, miau, definirVolume };
})();
