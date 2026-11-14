/* =========================================================
   Tocador de música das páginas da Diná (buquê, cantinho e convite)

   - Mesmo tocador em todas as páginas (visual em assets/Dina/player.css).
   - Lembra a música e o segundo em que estava: ao trocar de página,
     continua do mesmo ponto em vez de recomeçar.
   - Página aberta "por cima" de outra que já tem tocador (ex.: cartas e
     convite abertos pelo "Guardar" do buquê): usa o tocador de lá, sem
     criar um segundo tocando junto.

   Uso: <link rel="stylesheet" href="assets/Dina/player.css"> no <head> e
        <script src="assets/Dina/player.js"></script> no fim do <body>.
   As páginas falam com ele por window.DinaPlayer.
   ========================================================= */
(function () {
    if (window.DinaPlayer) return;

    /* ---------- Dentro de outra página que já tem tocador ---------- */
    if (window.self !== window.top) {
        let parentPlayer = null;
        try { parentPlayer = window.parent.DinaPlayer; } catch (e) { }
        window.DinaPlayer = parentPlayer || {
            embedded: true,
            play: () => Promise.resolve(),
            pause() { },
            closePlaylist() { },
            get sfxEnabled() { return true; },
            onSfxChange() { },
        };
        return;
    }

    /* ---------- Músicas (arquivos em assets/Musics/) ---------- */
    const TRACKS = [
        { src: 'assets/Musics/Taylor-Swift-Enchanted-Taylor-s-Version-Lyric-Video_009_128k.mp3', title: 'Enchanted' },
        { src: 'assets/Musics/Taylor-Swift-Everything-Has-Changed-ft-Ed-Sheeran_009_128k.mp3', title: 'Everything Has Changed' },
        { src: 'assets/Musics/Taylor-Swift-invisible-string-Official-Lyric-Video_009_128k.mp3', title: 'invisible string' },
        { src: 'assets/Musics/Taylor-Swift-Daylight-Official-Audio_009_128k.mp3', title: 'Daylight' },
    ];
    const ARTIST = 'Taylor Swift';
    const ALBUM = 'Pra você, Diná 🌷';

    // Onde fica guardado o "momento" da música (só neste aparelho)
    const STATE_KEY = 'dina-player';
    // Depois de muito tempo sem abrir o site, recomeça a música do início
    const MAX_AGE_MS = 12 * 60 * 60 * 1000;

    // iPhone: trata como "tocador de música", que continua com a tela bloqueada
    // ou em outro app (e ignora a chave do silencioso)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }

    /* ---------- Monta o tocador na página ---------- */
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.setAttribute('playsinline', '');

    const player = document.createElement('div');
    player.className = 'player';
    player.id = 'player';
    player.innerHTML = `
        <div class="playlist closed" id="playlist">
            <div class="pl-head">
                <span>Músicas pra você 🎶</span>
                <div class="pl-head-actions">
                    <label class="pl-volume-wrap" id="pl-volume-wrap" title="Volume">🔉
                        <input type="range" id="pl-volume" min="0" max="1" step="0.01" value="0.6" aria-label="Volume">
                    </label>
                    <button class="pl-chip on" id="pl-sfx" type="button">🔔 Efeitos</button>
                    <button class="pl-chip" id="pl-loop" type="button">🔁 Repetir</button>
                </div>
            </div>
            <div id="pl-tracks"></div>
        </div>

        <div class="player-main">
            <button class="disc" id="pl-disc" type="button" aria-label="Ver lista de músicas">
                <span class="disc-badge">♪</span>
            </button>
            <div class="pl-info">
                <div class="pl-title" id="pl-title">Carregando...</div>
                <div class="pl-artist-row">
                    <span class="pl-artist">${ARTIST}</span>
                    <button class="pl-mute" id="pl-mute" type="button" aria-label="Silenciar música">
                        <svg viewBox="0 0 24 24" id="pl-mute-icon"></svg>
                    </button>
                </div>
                <div class="pl-progress">
                    <span id="pl-cur">0:00</span>
                    <input type="range" class="seek" id="pl-seek" min="0" max="1000" value="0" step="1"
                        aria-label="Posição da música">
                    <span id="pl-dur">0:00</span>
                </div>
            </div>
            <div class="pl-buttons">
                <button class="pl-btn" id="pl-prev" type="button" aria-label="Música anterior">
                    <svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
                </button>
                <button class="pl-btn play" id="pl-play" type="button" aria-label="Tocar">
                    <svg viewBox="0 0 24 24" id="pl-play-icon"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <button class="pl-btn" id="pl-next" type="button" aria-label="Próxima música">
                    <svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
                </button>
            </div>
        </div>`;

    document.body.appendChild(audio);
    document.body.appendChild(player);
    document.body.classList.add('has-player');

    const $ = id => player.querySelector('#' + id);
    const playlistEl = $('playlist');
    const tracksEl = $('pl-tracks');
    const titleEl = $('pl-title');
    const curEl = $('pl-cur');
    const durEl = $('pl-dur');
    const seekEl = $('pl-seek');
    const playBtn = $('pl-play');
    const playIcon = $('pl-play-icon');
    const loopBtn = $('pl-loop');
    const sfxBtn = $('pl-sfx');
    const volumeEl = $('pl-volume');
    const muteBtn = $('pl-mute');
    const muteIcon = $('pl-mute-icon');

    const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
    const ICON_PAUSE = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
    const ICON_SOUND = '<path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/>';
    const ICON_MUTED = '<path d="M3 9v6h4l5 4V5L7 9H3zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"/>';

    // iPhone não deixa site nenhum mudar o volume (só os botões do aparelho):
    // lá o controle de volume some e fica só o botão de silenciar
    const volumeSupported = (() => {
        try { const t = new Audio(); t.volume = 0.5; return Math.abs(t.volume - 0.5) < 0.01; } catch (e) { return false; }
    })();
    if (!volumeSupported) $('pl-volume-wrap').hidden = true;

    let current = 0;
    let userPaused = false;   // se ela pausou, a música não volta sozinha (nem em outra página)
    let isLooping = false;
    let seeking = false;
    let hasStarted = false;
    let pendingSeek = null;   // segundo em que a música deve continuar
    let sfxEnabled = true;
    const sfxListeners = [];
    const failed = new Set();

    /* ---------- Guardar / recuperar o momento da música ---------- */
    let lastSave = 0;
    function save(force) {
        const now = Date.now();
        if (!force && now - lastSave < 1000) return;
        lastSave = now;
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify({
                track: current,
                time: pendingSeek !== null ? pendingSeek : (audio.currentTime || 0),
                paused: userPaused,
                loop: isLooping,
                vol: audio.volume,
                muted: audio.muted,
                sfx: sfxEnabled,
                at: now,
            }));
        } catch (e) { }
    }

    function readState() {
        try { return JSON.parse(localStorage.getItem(STATE_KEY)); } catch (e) { return null; }
    }

    /* ---------- Tocador ---------- */
    function fmt(sec) {
        if (!isFinite(sec) || sec < 0) return '0:00';
        const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    function renderPlaylist() {
        tracksEl.innerHTML = '';
        TRACKS.forEach((t, i) => {
            if (failed.has(i)) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'pl-track' + (i === current ? ' active' : '');
            const playingNow = i === current && !audio.paused;
            b.innerHTML = `<span class="num">${playingNow ? '♪' : i + 1}</span><span>${t.title}</span>`;
            b.addEventListener('click', () => {
                userPaused = false;
                if (i === current) audio.play().catch(() => { });
                else loadTrack(i, true);
            });
            tracksEl.appendChild(b);
        });
    }

    function updateMediaSession() {
        if (!('mediaSession' in navigator)) return;
        try {
            navigator.mediaSession.metadata = new MediaMetadata({ title: TRACKS[current].title, artist: ARTIST, album: ALBUM });
        } catch (e) { }
    }

    function setProgress(time) {
        const dur = audio.duration;
        if (!isFinite(dur) || dur <= 0) return;
        const pct = Math.min(100, time / dur * 100);
        seekEl.value = Math.round(pct * 10);
        seekEl.style.setProperty('--p', pct + '%');
        curEl.innerText = fmt(time);
    }

    function loadTrack(i, autoplay, startAt) {
        current = i;
        pendingSeek = startAt > 1 ? startAt : null;
        // "#t=" já pede pro navegador começar daquele segundo
        audio.src = TRACKS[i].src + (pendingSeek ? '#t=' + pendingSeek.toFixed(1) : '');
        titleEl.innerText = TRACKS[i].title;
        curEl.innerText = fmt(pendingSeek || 0);
        durEl.innerText = '0:00';
        seekEl.value = 0;
        seekEl.style.setProperty('--p', '0%');
        updateMediaSession();
        renderPlaylist();
        save(true);
        if (autoplay) audio.play().catch(() => { });
    }

    // Se o navegador ainda não começou do segundo certo, ajusta assim que puder
    function applyPendingSeek() {
        if (pendingSeek === null || !isFinite(audio.duration)) return;
        if (pendingSeek < audio.duration - 1 && Math.abs(audio.currentTime - pendingSeek) > 1) {
            try { audio.currentTime = pendingSeek; } catch (e) { return; }
        }
        pendingSeek = null;
    }

    function stepTrack(dir) {
        if (failed.size === TRACKS.length) return;
        let n = current;
        do { n = (n + dir + TRACKS.length) % TRACKS.length; } while (failed.has(n));
        return n;
    }

    // Toca, a não ser que ela tenha pausado (chamado pelas páginas, ex.: toque no buquê)
    function play() {
        if (userPaused || failed.size === TRACKS.length) return Promise.resolve();
        return audio.play();
    }

    function togglePlay() {
        if (audio.paused) {
            userPaused = false;
            audio.play().catch(() => { });
        } else {
            userPaused = true;
            audio.pause();
        }
        save(true);
    }

    function nextTrack() {
        const n = stepTrack(1);
        if (n !== undefined) loadTrack(n, !userPaused);
    }

    function prevTrack() {
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        const n = stepTrack(-1);
        if (n !== undefined) loadTrack(n, !userPaused);
    }

    function setPlayingUI(playing) {
        player.classList.toggle('playing', playing);
        playIcon.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
        playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Tocar');
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch (e) { }
        }
        renderPlaylist();
    }

    function setLoop(on) {
        isLooping = on;
        audio.loop = on;
        loopBtn.classList.toggle('on', on);
        loopBtn.innerText = on ? '🔂 Repetindo' : '🔁 Repetir';
    }

    function setMuted(on) {
        audio.muted = on;
        muteIcon.innerHTML = on ? ICON_MUTED : ICON_SOUND;
        muteBtn.classList.toggle('on', on);
        muteBtn.setAttribute('aria-label', on ? 'Ligar o som da música' : 'Silenciar música');
    }

    function setSfx(on) {
        sfxEnabled = on;
        sfxBtn.classList.toggle('on', on);
        sfxBtn.innerText = on ? '🔔 Efeitos' : '🔕 Efeitos';
        sfxListeners.forEach(cb => { try { cb(on); } catch (e) { } });
    }

    /* ---------- Botões ---------- */
    playBtn.addEventListener('click', togglePlay);
    $('pl-next').addEventListener('click', () => { userPaused = false; nextTrack(); });
    $('pl-prev').addEventListener('click', () => { userPaused = false; prevTrack(); });

    $('pl-disc').addEventListener('click', e => {
        e.stopPropagation();
        playlistEl.classList.toggle('closed');
    });
    // Fecha a lista ao tocar fora do tocador
    document.addEventListener('click', e => {
        if (!player.contains(e.target)) playlistEl.classList.add('closed');
    });

    loopBtn.addEventListener('click', () => { setLoop(!isLooping); save(true); });
    sfxBtn.addEventListener('click', () => { setSfx(!sfxEnabled); save(true); });
    volumeEl.addEventListener('input', e => {
        audio.volume = e.target.value;
        if (audio.muted && audio.volume > 0) setMuted(false); // mexeu no volume: volta o som
        save();
    });
    muteBtn.addEventListener('click', () => { setMuted(!audio.muted); save(true); });

    // Barra de progresso (funciona com dedo e mouse)
    seekEl.addEventListener('input', () => {
        seeking = true;
        seekEl.style.setProperty('--p', seekEl.value / 10 + '%');
        if (isFinite(audio.duration)) curEl.innerText = fmt(audio.duration * seekEl.value / 1000);
    });
    seekEl.addEventListener('change', () => {
        pendingSeek = null;
        if (isFinite(audio.duration)) audio.currentTime = audio.duration * seekEl.value / 1000;
        seeking = false;
        save(true);
    });

    /* ---------- Eventos do áudio ---------- */
    audio.addEventListener('loadedmetadata', () => {
        durEl.innerText = fmt(audio.duration);
        applyPendingSeek();
    });
    audio.addEventListener('playing', applyPendingSeek);
    audio.addEventListener('timeupdate', () => {
        if (seeking || pendingSeek !== null) return;
        setProgress(audio.currentTime);
        save();
    });
    audio.addEventListener('play', () => { hasStarted = true; setPlayingUI(true); save(true); });
    audio.addEventListener('pause', () => { setPlayingUI(false); save(true); });
    audio.addEventListener('ended', () => { if (!isLooping) loadTrack(stepTrack(1), true); });
    audio.addEventListener('error', () => {
        // Arquivo não encontrado: pula pra próxima
        failed.add(current);
        if (failed.size === TRACKS.length) {
            player.hidden = true;
            document.body.classList.remove('has-player');
            window.dispatchEvent(new Event('dinaplayer:hidden'));
            return;
        }
        loadTrack(stepTrack(1), hasStarted && !userPaused);
    });

    // Antes de sair da página (ou ir pro fundo), guarda o segundo exato
    window.addEventListener('pagehide', () => save(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });

    // Controles na tela de bloqueio / central de controle do celular
    if ('mediaSession' in navigator) {
        const handlers = {
            play: () => { userPaused = false; audio.play().catch(() => { }); },
            pause: () => { userPaused = true; audio.pause(); save(true); },
            nexttrack: () => { userPaused = false; nextTrack(); },
            previoustrack: () => { userPaused = false; prevTrack(); },
        };
        Object.entries(handlers).forEach(([k, fn]) => {
            try { navigator.mediaSession.setActionHandler(k, fn); } catch (e) { }
        });
    }

    /* ---------- Começa de onde parou ---------- */
    const state = readState();
    if (state && TRACKS[state.track]) {
        const recent = Date.now() - (state.at || 0) < MAX_AGE_MS;
        if (typeof state.vol === 'number') { audio.volume = state.vol; volumeEl.value = state.vol; }
        else audio.volume = volumeEl.value;
        setLoop(!!state.loop);
        setSfx(state.sfx !== false);
        setMuted(!!state.muted);
        userPaused = recent && !!state.paused;
        loadTrack(state.track, false, recent ? state.time : 0);
    } else {
        audio.volume = volumeEl.value;
        setMuted(false);
        loadTrack(0, false);
    }

    // Tenta continuar tocando sozinho; se o navegador bloquear (quase sempre no celular),
    // continua no primeiro toque na tela
    function startWhenAllowed() {
        play().catch(() => {
            const go = e => {
                // Toque nos botões do próprio tocador: ele mesmo resolve (senão tocaria e pausaria junto)
                if (player.contains(e.target)) return;
                document.removeEventListener('click', go, true);
                document.removeEventListener('touchend', go, true);
                play().catch(() => { });
            };
            document.addEventListener('click', go, true);
            document.addEventListener('touchend', go, true);
        });
    }
    if (document.readyState === 'complete') startWhenAllowed();
    else window.addEventListener('load', startWhenAllowed);

    /* ---------- O que as páginas podem usar ---------- */
    window.DinaPlayer = {
        embedded: false,
        audio,
        element: player,
        play,
        pause() { userPaused = true; audio.pause(); save(true); },
        closePlaylist() { playlistEl.classList.add('closed'); },
        get sfxEnabled() { return sfxEnabled; },
        onSfxChange(cb) { sfxListeners.push(cb); },
    };
})();
