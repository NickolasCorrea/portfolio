function getDeviceType() {
    const ua = navigator.userAgent;
    if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        if (/iPhone|iPad|iPod/i.test(ua)) {
            return 'Apple mobile device';
        } else if (/Android/i.test(ua)) {
            return 'Android device';
        } else if (/BlackBerry/i.test(ua)) {
            return 'BlackBerry device';
        } else if (/IEMobile/i.test(ua)) {
            return 'Windows mobile device';
        } else if (/Opera Mini/i.test(ua)) {
            return 'Opera Mini device';
        } else {
            return 'Other mobile device';
        }
    }
    return 'Desktop';
}

const deviceType = getDeviceType();
console.log('Device Type:', deviceType);

if (deviceType !== 'Desktop') {
    document.body.classList.add('hide-cursor');
}


// Mostrador original
/*
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        console.log(entry)
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        } else {
            entry.target.classList.remove('show');
        }
    });
});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => observer.observe(el));
*/

// Mostrador apenas uma vez
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            // Desconectar o observer para garantir que o elemento nunca mais volte a ser oculto
            observer.unobserve(entry.target);
        }
    });
});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => observer.observe(el));


// Efeito de digitação
function typeWriterEffect(element, txt, speed, removeCursor) {
    let i = 0;
    let buffer = '';

    function type() {
        if (i < txt.length) {
            buffer += txt.charAt(i);
            element.innerHTML = buffer + '<span class="cursor">&nbsp;</span>';
            i++;
            setTimeout(type, speed);
        } else if (i >= txt.length && removeCursor === "true") {
            // Remover o cursor após a digitação
            element.innerHTML = buffer;
        }
    }
    element.innerHTML = '';
    type();
}

// Mostrador com efeito de digitação
const observerDigitationOnce = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.classList.contains('typed')) {
            entry.target.classList.add('show');
            // Inicia o efeito de digitação quando o elemento se torna visível
            const speed = entry.target.dataset.speed ? parseInt(entry.target.dataset.speed, 10) : 20;
            typeWriterEffect(entry.target, entry.target.dataset.text, speed, entry.target.dataset.removeCursor);
            // Marca o elemento como já tendo sido digitado
            entry.target.classList.add('typed');
        }
    });
});

const hiddenTitleElementsDigitationOnce = document.querySelectorAll('.hiddenTitle');
hiddenTitleElementsDigitationOnce.forEach((el) => {
    el.dataset.text = el.innerHTML;
    el.dataset.speed = 80; // Defina a velocidade de escrita aqui, se necessário
    el.dataset.removeCursor = "false";
    observerDigitationOnce.observe(el);
});

const hiddenSubtitleElementsDigitationOnce = document.querySelectorAll('.hiddenSubtitle');
hiddenSubtitleElementsDigitationOnce.forEach((el) => {
    el.dataset.text = el.innerHTML;
    el.dataset.speed = 125; // Defina a velocidade de escrita aqui, se necessário
    el.dataset.removeCursor = "false";
    observerDigitationOnce.observe(el);
});

const hiddenElementsDigitationOnce = document.querySelectorAll('.hiddenText');
hiddenElementsDigitationOnce.forEach((el) => {
    el.dataset.text = el.innerHTML;
    el.dataset.speed = 20; // Defina a velocidade de escrita aqui, se necessário
    el.dataset.removeCursor = "true";
    observerDigitationOnce.observe(el);
});



// Light mode e Dark mode
function toggleLightMode() {
    const wasLightmode = localStorage.getItem('lightmode') === 'true';
    const isNowLightmode = !wasLightmode;
    localStorage.setItem('lightmode', isNowLightmode);

    const element = document.body;
    element.classList.toggle('light-mode', isNowLightmode);

    const logo = document.getElementById('logoPrincipal');
    if (isNowLightmode) {
        logo.src = './assets/NickLogoLight.png'; // Altere para o caminho da logo do modo claro
    } else {
        logo.src = './assets/NickLogo.png'; // Altere para o caminho da logo do modo escuro
    }
    console.log('Light mode:', isNowLightmode);
}

function onload() {
    const isLightmode = localStorage.getItem('lightmode') === 'true';
    document.body.classList.toggle('light-mode', isLightmode);

    const logo = document.getElementById('logoPrincipal');
    if (isLightmode) {
        logo.src = './assets/NickLogoLight.png';; // Altere para o caminho da logo do modo claro
    } else {
        logo.src = './assets/NickLogo.png'; // Altere para o caminho da logo do modo escuro
    }

    document.getElementById('toggleDarkModeBtn').checked = isLightmode;
    console.log('Light mode:', isLightmode);
}


// Cursor customizado
let innerCursor = document.querySelector('.inner-cursor');
let outerCursor = document.querySelector('.outer-cursor');
let isCursorEnlarged = false;

document.addEventListener('mousemove', moveCursor);
document.addEventListener('mousedown', growCursor);
document.addEventListener('mouseup', shrinkCursor);
document.addEventListener('dblclick', toggleCursorSize);

function moveCursor(e) {
    let x = e.clientX;
    let y = e.clientY;

    innerCursor.style.left = `${x}px`;
    innerCursor.style.top = `${y}px`;
    outerCursor.style.left = `${x}px`;
    outerCursor.style.top = `${y}px`;
}

function growCursor() {
    innerCursor.classList.add('grow');
}

function shrinkCursor() {
    innerCursor.classList.remove('grow');
}

function toggleCursorSize() {
    if (isCursorEnlarged) {
        innerCursor.classList.remove('enlarged');
    } else {
        innerCursor.classList.add('enlarged');
    }
    isCursorEnlarged = !isCursorEnlarged;
}


const openButtons = document.querySelectorAll(".projeto-botao[data-type='open-modal']");
const closeButton = document.querySelector(".closeButton");
const modal = document.querySelector(".modal");
const sombra = document.querySelector(".sombra");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalVideo = document.getElementById("modal-video");
const botaoRepositorio = document.getElementById("botao-repositorio");
const botaoDownload = document.getElementById("botao-download");

openButtons.forEach(button => {
    button.addEventListener("click", () => {
        const title = button.getAttribute("data-title");
        const description = button.getAttribute("data-description");
        const video = button.getAttribute("data-video");
        const linkRepositorio = button.getAttribute("data-repo");
        const linkDownload = button.getAttribute("data-download");

        modalTitle.textContent = title;
        modalDescription.textContent = description;
        modalVideo.src = video;
        botaoRepositorio.href = linkRepositorio;
        botaoDownload.href = linkDownload;

        modal.classList.add("open");
        sombra.classList.add("open");
    });
});

closeButton.addEventListener("click", () => {
    modal.classList.remove("open");
    sombra.classList.remove("open");
    modalVideo.src = '';
});

sombra.addEventListener("click", () => {
    modal.classList.remove("open");
    sombra.classList.remove("open");
    modalVideo.src = '';
});
