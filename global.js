console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/portfolio/";

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'resume/', title: 'Resume' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/bryanzhang938', title: 'GitHub' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = !p.url.startsWith('http') ? BASE_PATH + p.url : p.url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = p.title;

  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname,
  );

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-selector">
      <option value="automatic">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`,
);

const themeSelector = document.getElementById('theme-selector');

function setColorScheme(colorScheme) {
  console.log('Setting color scheme to:', colorScheme);
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  themeSelector.value = colorScheme;
}

if ('colorScheme' in localStorage) {
  console.log('Color scheme from localStorage:', localStorage.colorScheme);
  setColorScheme(localStorage.colorScheme);
}

themeSelector.addEventListener('input', function (event) {
  const selectedScheme = event.target.value;
  console.log('color scheme changed to', selectedScheme);
  localStorage.colorScheme = selectedScheme;
  setColorScheme(selectedScheme);
});
