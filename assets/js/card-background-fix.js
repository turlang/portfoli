(() => {
  const VERSION = '20260803-card-background-2';

  const featured = Object.freeze({
    GlossFlow: { repository: 'glossflow1', homepage: 'https://glossflow1.vercel.app/' },
    'Mestre Orc': { repository: 'saas-mestre-orc', homepage: 'https://turlang.github.io/Mestre-orc/' },
    'LeadHunter Pro': { repository: 'Prospe--o-clientes', homepage: 'https://prospe-o-clientes.onrender.com/' },
    'WallArt Premium': { repository: 'papel-parede' },
    'FinançasPro BI': { repository: 'orcamento-pessoal', homepage: 'https://turlang.github.io/orcamento-pessoal/' },
    'Mestre Orc Engine': { repository: 'fenix' },
    'DevClub Level Up': { repository: 'DEVCLUB-LEVEL-UP', homepage: 'https://turlang.github.io/DEVCLUB-LEVEL-UP/' },
  });

  function safeUrl(value) {
    if (!value) return null;
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
    } catch {
      return null;
    }
  }

  function escapeXml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function generatedCover(title) {
    const safeTitle = escapeXml(title).slice(0, 38);
    const initials = escapeXml(
      title
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('') || 'ER',
    );

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#071a34"/>
          <stop offset=".55" stop-color="#0b2f59"/>
          <stop offset="1" stop-color="#030814"/>
        </linearGradient>
        <radialGradient id="glow" cx="78%" cy="18%" r="55%">
          <stop stop-color="#58b7ff" stop-opacity=".72"/>
          <stop offset="1" stop-color="#58b7ff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#bg)"/>
      <rect width="1200" height="700" fill="url(#glow)"/>
      <g opacity=".13" stroke="#8dccff">
        <path d="M0 110H1200M0 220H1200M0 330H1200M0 440H1200M0 550H1200"/>
        <path d="M150 0V700M300 0V700M450 0V700M600 0V700M750 0V700M900 0V700M1050 0V700"/>
      </g>
      <rect x="70" y="65" width="1060" height="570" rx="40" fill="#06101f" fill-opacity=".72" stroke="#58b7ff" stroke-opacity=".34"/>
      <circle cx="965" cy="190" r="105" fill="#1683ff" fill-opacity=".18" stroke="#8dccff" stroke-opacity=".4"/>
      <text x="965" y="226" fill="#dff3ff" font-family="Arial,sans-serif" font-size="92" text-anchor="middle" font-weight="800">${initials}</text>
      <text x="120" y="195" fill="#58b7ff" font-family="Arial,sans-serif" font-size="25" font-weight="800" letter-spacing="5">PORTFOLIO • GITHUB</text>
      <text x="120" y="330" fill="#ffffff" font-family="Arial,sans-serif" font-size="66" font-weight="800">${safeTitle}</text>
      <text x="120" y="395" fill="#bcd0e9" font-family="Arial,sans-serif" font-size="28">Projeto público em destaque</text>
    </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function githubPreview(repository) {
    return repository
      ? `https://opengraph.githubassets.com/${VERSION}/turlang/${encodeURIComponent(repository)}`
      : null;
  }

  function thumPreview(homepage) {
    const url = safeUrl(homepage);
    if (!url) return null;
    const target = new URL(url);
    target.searchParams.set('portfolioPreview', VERSION);
    return `https://image.thum.io/get/width/1200/crop/700/noanimate/${target.href}`;
  }

  function mshotsPreview(homepage) {
    const url = safeUrl(homepage);
    return url
      ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1200&h=700&v=${VERSION}`
      : null;
  }

  function preload(candidates, onSuccess) {
    let index = 0;

    function next() {
      if (index >= candidates.length) return;
      const source = candidates[index];
      index += 1;
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => onSuccess(source);
      image.onerror = next;
      image.src = source;
    }

    next();
  }

  function applyBackground(card) {
    const visual = card.querySelector('.project-art');
    const title = card.querySelector('h3')?.textContent?.trim();
    if (!visual || !title) return;

    const automaticRepository = card.dataset.repository;
    const config = automaticRepository
      ? { repository: automaticRepository, homepage: card.dataset.projectUrl }
      : featured[title];

    if (!config || visual.dataset.backgroundFixVersion === VERSION) return;

    visual.querySelectorAll('.project-preview-image').forEach((image) => image.remove());
    visual.style.setProperty('background-image', `url("${generatedCover(title)}")`, 'important');
    visual.style.setProperty('background-size', 'cover', 'important');
    visual.style.setProperty('background-position', 'center', 'important');
    visual.style.setProperty('background-repeat', 'no-repeat', 'important');
    visual.classList.add('has-preview');
    visual.dataset.backgroundFixVersion = VERSION;
    visual.dataset.previewSource = 'generated';

    const homepage = safeUrl(config.homepage);
    const candidates = [
      githubPreview(config.repository),
      thumPreview(homepage),
      mshotsPreview(homepage),
    ].filter(Boolean);

    preload(candidates, (source) => {
      if (!visual.isConnected) return;
      visual.style.setProperty('background-image', `url("${source}")`, 'important');
      visual.dataset.previewSource = source.includes('opengraph.githubassets.com')
        ? 'github'
        : 'website';
    });
  }

  function hydrate() {
    document.querySelectorAll('#projectCarousel .project-card').forEach(applyBackground);
  }

  hydrate();

  const carouselHost = document.querySelector('.projects-section');
  if (carouselHost) {
    new MutationObserver(hydrate).observe(carouselHost, {
      childList: true,
      subtree: true,
    });
  }

  window.addEventListener('load', hydrate, { once: true });
  window.setTimeout(hydrate, 500);
  window.setTimeout(hydrate, 1800);
})();
