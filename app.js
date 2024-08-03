
// Mostrador original
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


// Mostrador com efeito de digitação repetição
/*
const observerDigitation = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        console.log(entry);
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            // Inicia o efeito de digitação quando o elemento se torna visível
            typeWriterEffect(entry.target.id, entry.target.dataset.text, 25);
        } else {
            entry.target.classList.remove('show');
        }
    });
});

// Seleciona todos os elementos ocultos e adiciona o observador
const hiddenElementsDigitation = document.querySelectorAll('.hiddenText');
hiddenElementsDigitation.forEach((el) => {
    // Salva o texto original em um atributo data
    el.dataset.text = el.innerHTML;
    observerDigitation.observe(el);
});
*/


// Mostrador com efeito de digitação
const observerDigitationOnce = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.classList.contains('typed')) {
            entry.target.classList.add('show');
            // Inicia o efeito de digitação quando o elemento se torna visível
            typeWriterEffect(entry.target, entry.target.dataset.text, 20);
            // Marca o elemento como já tendo sido digitado
            entry.target.classList.add('typed');
        }
    });
});

const hiddenElementsDigitationOnce = document.querySelectorAll('.hiddenText');
hiddenElementsDigitationOnce.forEach((el) => {
    el.dataset.text = el.innerHTML;
    observerDigitationOnce.observe(el);
});



// Efeito de digitação 
function typeWriterEffect(element, txt, speed) {
    let i = 0;
    let buffer = '';

    function type() {
        if (i < txt.length) {
            buffer += txt.charAt(i);
            element.innerHTML = buffer + '<span class="cursor">&nbsp;</span>';
            i++;
            setTimeout(type, speed);
        } 
    }
    element.innerHTML = '';
    type();
}



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

// Modal 
/*
const openProject = () => {
    window.open(lista[id].linkProjeto, '_blank');
    modalButtonRepository.removeEventListener("click", openRepository);
    
}
const openRepository = () => {
    window.open(lista[id].linkRepositorio, '_blank');
    modalButtonProject.removeEventListener("click",openProject);    
}
*/


const openButtons = document.querySelectorAll(".projeto-botao");
const closeButton = document.querySelector(".closeButton");
const modal = document.querySelector(".modal");
const sombra = document.querySelector(".sombra");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalVideo = document.getElementById("modal-video");

openButtons.forEach(button => {
    button.addEventListener("click", () => {
        const title = button.getAttribute("data-title");
        const description = button.getAttribute("data-description");
        const video = button.getAttribute("data-video");
        
        modalTitle.textContent = title;
        modalDescription.textContent = description;
        modalVideo.src = video;

        modal.classList.add("open");
        sombra.classList.add("open");
    });
});

closeButton.addEventListener("click", () => {
    modal.classList.remove("open");
    sombra.classList.remove("open");
    modalVideo.src = ""; // Stop the video when closing the modal
});

sombra.addEventListener("click", () => {
    modal.classList.remove("open");
    sombra.classList.remove("open");
    modalVideo.src = ""; // Stop the video when clicking outside the modal
});
