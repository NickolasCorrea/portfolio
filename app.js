
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
    localStorage.setItem('lightmode', !wasLightmode);
    const element = document.body;
    element.classList.toggle('light-mode', !wasLightmode);
    console.log(wasLightmode);
}

function onload() {
    const wasLightmode = localStorage.getItem('lightmode') === 'true';
    document.body.classList.toggle('light-mode', localStorage.getItem('lightmode') === 'true');
    document.getElementById('toggleDarkModeBtn').checked = wasLightmode;
    console.log(wasLightmode);
}