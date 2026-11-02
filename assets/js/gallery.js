/** gallery.js — renderiza la galería de obras desde artworks.json */

async function loadArtworks() {
  const res = await fetch('/artworks.json');
  const data = await res.json();
  return data.artworks;
}

function renderCard(artwork) {
  const card = document.createElement('a');
  card.href = `/ar/${artwork.slug}/`;
  card.className = 'artwork-card';
  card.setAttribute('aria-label', `${artwork.title} ${artwork.year}`);

  const accent = document.createElement('div');
  accent.className = 'artwork-card-accent';
  accent.style.background = artwork.accent;

  const img = document.createElement('img');
  img.src = artwork.poster;
  img.alt = artwork.title;
  img.loading = 'lazy';

  const info = document.createElement('div');
  info.className = 'artwork-card-info';
  info.innerHTML = `
    <div class="artwork-card-title">${artwork.title}</div>
    <div class="artwork-card-tag">${artwork.category} · ${artwork.year}</div>
  `;

  card.append(accent, img, info);
  return card;
}

async function init() {
  const grid = document.getElementById('gallery-grid');
  try {
    const artworks = await loadArtworks();
    artworks.forEach(aw => grid.appendChild(renderCard(aw)));
  } catch {
    grid.innerHTML = '<p style="padding:20px;opacity:.5">No se pudieron cargar las obras.</p>';
  }
}

init();
