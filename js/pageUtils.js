const { shell } = require('electron');


// Prevent page from cutting itself off on reload or page change
// This wasn't as big of an issue before multiple pages were added
document.querySelector('.desktop-ena').style.height = `${window.outerHeight}px`;

// Abrir enlaces en los navegadores por defecto.
// Open links in default browser
const links = document.querySelectorAll('.custom-link');
links.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const href = link.getAttribute('href');

        shell.openExternal(href);
    });
});