(() => {
  const GITHUB_USER = 'turlang';
  const MAX_AUTOMATIC_PROJECTS = 30;
  const CACHE_KEY = 'evandro-automatic-3d-projects-v2';
  const PREVIEW_VERSION = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const IMAGE_CONCURRENCY = 4;

  const featuredProjects = Object.freeze({
    GlossFlow: {
      repository: 'glossflow1',
      homepage: 'https://glossflow1.vercel.app/',
    },
    'Mestre Orc': {
      repository: 'saas-mestre-orc',
      homepage: 'https://turlang.github.io/Mestre-orc/',
    },
    'LeadHunter Pro': {
      repository: 'Prospe--o-clientes',
      homepage: 'https://prospe-o-clientes.onrender.com/',
    },
    'WallArt Premium': {
      repository: 'papel-parede',
    },
    'FinançasPro BI': {
      repository: 'orcamento-pessoal',
      homepage: 'https://turlang.github.io/orcamento-pessoal/',
    },
    'Mestre Orc Engine': {
      repository: 'fenix',
    },
    'DevClub Level Up': {
      repository: 'DEVCLUB-LEVEL-UP',
      homepage: 'https://turlang.github.io/DEVCLUB-LEVEL-UP/',
    },
  });

  const featuredRepositoryNames = new Set([
    ...Object.values(featuredProjects).map((project) => project.repository.toLowerCase()),
    'mestre-orc',
    'portfoli',
  ]);

  document.querySelector('.main-nav a[data-screen-target="github"]')?.remove();
  document.querySelector('[data-screen-panel][id="github"]')?.remove();
  document.querySelector('.projects-next-action')?.remove();

  const originalWrap = document.querySelector('.carousel-wrap');
  const originalDots = document.getElementById('projectDots');
  if (!originalWrap || !originalDots) return;

  const carouselWrap = originalWrap.cloneNode(true);
  const dots = originalDots.cloneNode(false);
  originalWrap.replaceWith(carouselWrap);
  originalDots.replaceWith(dots);

  const carousel = carouselWrap.querySelector('#projectCarousel');
  const previousButton = carouselWrap.querySelector('.carousel-btn.prev');
  const nextButton = carouselWrap.querySelector('.carousel-btn.next');
  if (!carousel || !previousButton || !nextButton) return;

  const style = document.createElement('style');
  style.dataset.automaticProjectCards = 'true';
  style.textContent = `
    .project-art {
      isolation: isolate;
      background-color: #071426;
    }

    .project-art.github-auto {
      background:
        radial-gradient(circle at 76% 18%, rgba(88,183,255,.72), transparent 30%),
        linear-gradient(135deg, #071c36, #020711);
    }

    .project-preview-image {
      position: absolute;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 1;
      transform: scale(1);
      transition: opacity .35s ease, transform .7s cubic-bezier(.16,1,.3,1);
    }

    .project-art::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(1,7,16,.04), rgba(1,7,16,.16) 42%, rgba(1,7,16,.9));
    }

    .project-art > span {
      position: relative;
      z-index: 3;
      max-width: 90%;
      padding: 5px 10px;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 8px;
      background: rgba(2,9,21,.76);
      color: #fff;
      font-size: clamp(17px, 2vw, 26px);
      line-height: 1.1;
      text-shadow: 0 2px 16px rgba(0,0,0,.92);
      backdrop-filter: blur(8px);
    }

    .project-art.has-preview > i {
      display: none;
    }

    .project-card[data-automatic-project="true"] {
      cursor: pointer;
      padding-bottom: 54px;
    }

    .project-card[data-automatic-project="true"]::after {
      content: attr(data-action-label);
      position: absolute;
      right: 16px;
      bottom: 14px;
      left: 16px;
      display: flex;
      min-height: 34px;
      align-items: center;
      padding: 0 34px 0 12px;
      border: 1px solid rgba(88,183,255,.35);
      border-radius: 9px;
      background: rgba(7,19,38,.9);
      color: #a8d8ff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .04em;
    }

    .project-card[data-automatic-project="true"]::before {
      content: '↗';
      position: absolute;
      right: 28px;
      bottom: 21px;
      z-index: 4;
      color: #a8d8ff;
      font-size: 15px;
      pointer-events: none;
    }

    .project-card[data-automatic-project="true"]:focus-visible {
      outline: 3px solid rgba(88,183,255,.92);
      outline-offset: 5px;
    }

    .project-sync-count {
      display: inline-flex;
      min-width: 72px;
      align-items: center;
      justify-content: center;
      margin-left: 10px;
      color: #8fa3c0;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .08em;
    }
  `;
  document.head.appendChild(style);

  let cards = [];
  let current = 0;
  let timer = null;
  let repositoriesByName = new Map();
  const imageQueue = [];
  let activeImageLoads = 0;

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeXml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  function safeUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function displayRepositoryName(name) {
    return String(name || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function placeholderImage(title, subtitle = 'Projeto do portfólio') {
    const safeTitle = escapeXml(title).slice(0, 42);
    const safeSubtitle = escapeXml(subtitle).slice(0, 48);
    const initials = escapeXml(
      title
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('') || 'ER',
    );

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
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
        <text x="965" y="226" fill="#dff3ff" font-family="Arial, sans-serif" font-size="92" text-anchor="middle" font-weight="800">${initials}</text>
        <text x="120" y="195" fill="#58b7ff" font-family="Arial, sans-serif" font-size="25" font-weight="800" letter-spacing="5">PORTFOLIO • GITHUB</text>
        <text x="120" y="330" fill="#ffffff" font-family="Arial, sans-serif" font-size="66" font-weight="800">${safeTitle}</text>
        <text x="120" y="395" fill="#bcd0e9" font-family="Arial, sans-serif" font-size="28">${safeSubtitle}</text>
        <rect x="120" y="485" width="300" height="58" rx="29" fill="#1683ff"/>
        <text x="270" y="523" fill="#ffffff" font-family="Arial, sans-serif" font-size="21" text-anchor="middle" font-weight="800">PROJETO PÚBLICO</text>
      </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function githubPreviewUrl(repositoryName, version = PREVIEW_VERSION) {
    return `https://opengraph.githubassets.com/${encodeURIComponent(version)}/${GITHUB_USER}/${encodeURIComponent(repositoryName)}`;
  }

  function thumPreviewUrl(homepage, version = PREVIEW_VERSION) {
    const separator = homepage.includes('?') ? '&' : '?';
    return `https://image.thum.io/get/width/1200/crop/700/noanimate/${homepage}${separator}portfolioPreview=${version}`;
  }

  function mshotsPreviewUrl(homepage, version = PREVIEW_VERSION) {
    return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(homepage)}?w=1200&h=700&v=${version}`;
  }

  function previewCandidates(repositoryName, homepage, version) {
    return [
      homepage ? thumPreviewUrl(homepage, version) : null,
      homepage ? mshotsPreviewUrl(homepage, version) : null,
      repositoryName ? githubPreviewUrl(repositoryName, version) : null,
    ].filter(Boolean);
  }

  function preloadFirstAvailable(candidates) {
    return new Promise((resolve) => {
      let index = 0;

      function tryNext() {
        if (index >= candidates.length) {
          resolve(null);
          return;
        }

        const source = candidates[index];
        index += 1;
        const preloader = new Image();
        preloader.decoding = 'async';
        preloader.onload = () => resolve(source);
        preloader.onerror = tryNext;
        preloader.src = source;
      }

      tryNext();
    });
  }

  function processImageQueue() {
    while (activeImageLoads < IMAGE_CONCURRENCY && imageQueue.length) {
      const job = imageQueue.shift();
      activeImageLoads += 1;

      preloadFirstAvailable(job.candidates)
        .then((source) => {
          if (source && job.image.isConnected) {
            job.image.src = source;
            job.visual.dataset.previewSource = source.includes('opengraph.githubassets.com')
              ? 'github'
              : 'website';
          }
        })
        .finally(() => {
          activeImageLoads -= 1;
          processImageQueue();
        });
    }
  }

  function applyPreview(card, config) {
    const visual = card.querySelector('.project-art');
    const title = card.querySelector('h3')?.textContent?.trim() || config.repository || 'Projeto';
    if (!visual) return;

    const signature = `${config.repository || ''}|${config.homepage || ''}|${config.version || PREVIEW_VERSION}`;
    if (visual.dataset.previewSignature === signature) return;

    visual.querySelectorAll('.project-preview-image').forEach((image) => image.remove());
    visual.classList.remove('has-preview');

    const image = document.createElement('img');
    image.className = 'project-preview-image';
    image.dataset.managedPreview = 'true';
    image.alt = `Prévia visual do projeto ${title}`;
    image.loading = 'eager';
    image.decoding = 'async';
    image.src = placeholderImage(title, config.language || 'Projeto do portfólio');

    visual.prepend(image);
    visual.classList.add('has-preview');
    visual.dataset.previewSignature = signature;
    visual.dataset.previewSource = 'generated';

    const candidates = previewCandidates(config.repository, config.homepage, config.version || PREVIEW_VERSION);
    if (candidates.length) {
      imageQueue.push({ image, visual, candidates });
      processImageQueue();
    }
  }

  function hydrateFeaturedCards() {
    carousel.querySelectorAll('.project-card:not([data-automatic-project="true"])').forEach((card) => {
      const title = card.querySelector('h3')?.textContent?.trim();
      const project = title ? featuredProjects[title] : null;
      if (!project) return;

      const repository = repositoriesByName.get(project.repository.toLowerCase());
      applyPreview(card, {
        repository: project.repository,
        homepage: safeUrl(project.homepage) || safeUrl(repository?.homepage),
        language: repository?.language || card.querySelector('.chips span')?.textContent || 'Projeto em destaque',
        version: repository?.pushed_at || repository?.updated_at || PREVIEW_VERSION,
      });
    });
  }

  function getCardStep() {
    if (window.innerWidth <= 520) return Math.min(205, window.innerWidth * 0.58);
    if (window.innerWidth <= 900) return 230;
    return 270;
  }

  function renderDots() {
    dots.innerHTML = '';
    if (!cards.length) return;

    const indexes = cards.length <= 12
      ? cards.map((_, index) => index)
      : Array.from({ length: Math.min(7, cards.length) }, (_, position) => {
          const start = Math.max(0, Math.min(current - 3, cards.length - 7));
          return start + position;
        });

    indexes.forEach((index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = index === current ? 'active' : '';
      button.setAttribute('aria-label', `Abrir projeto ${index + 1}`);
      button.addEventListener('click', () => {
        current = index;
        updateCarousel();
        restartTimer();
      });
      dots.appendChild(button);
    });

    if (cards.length > 12) {
      const counter = document.createElement('span');
      counter.className = 'project-sync-count';
      counter.textContent = `${current + 1} / ${cards.length}`;
      dots.appendChild(counter);
    }
  }

  function updateCarousel() {
    if (!cards.length) return;

    const total = cards.length;
    const step = getCardStep();

    cards.forEach((card, index) => {
      let offset = index - current;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;

      const distance = Math.abs(offset);
      const active = offset === 0;
      card.classList.toggle('active', active);
      card.style.zIndex = String(20 - Math.min(distance, 19));
      card.style.opacity = distance > 2 ? '0' : String(Math.max(0.46, 1 - distance * 0.2));
      card.style.pointerEvents = distance > 2 ? 'none' : 'auto';
      card.style.filter = active ? 'brightness(1.05)' : 'brightness(.76)';
      card.style.transform = `translateX(calc(-50% + ${offset * step}px)) translateZ(${-distance * 140}px) rotateY(${offset * -18}deg) scale(${1 - Math.min(distance, 3) * 0.08})`;
      card.tabIndex = active ? 0 : -1;
      card.setAttribute('aria-hidden', String(distance > 2));
    });

    renderDots();
  }

  function refreshCards() {
    cards = [...carousel.querySelectorAll('.project-card')];
    current = Math.min(current, Math.max(0, cards.length - 1));
    cards.forEach((card, index) => {
      card.dataset.index = String(index);
    });
    updateCarousel();
  }

  function stopTimer() {
    if (!timer) return;
    window.clearInterval(timer);
    timer = null;
  }

  function startTimer() {
    stopTimer();
    if (cards.length <= 1) return;
    timer = window.setInterval(() => {
      current = (current + 1) % cards.length;
      updateCarousel();
    }, 5200);
  }

  function restartTimer() {
    startTimer();
  }

  previousButton.addEventListener('click', () => {
    current = (current - 1 + cards.length) % cards.length;
    updateCarousel();
    restartTimer();
  });

  nextButton.addEventListener('click', () => {
    current = (current + 1) % cards.length;
    updateCarousel();
    restartTimer();
  });

  carousel.addEventListener('mouseenter', stopTimer);
  carousel.addEventListener('mouseleave', startTimer);
  carousel.addEventListener('focusin', stopTimer);
  carousel.addEventListener('focusout', startTimer);
  window.addEventListener('resize', updateCarousel, { passive: true });

  function openProject(url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  }

  function createAutomaticCard(repository) {
    const title = displayRepositoryName(repository.name);
    const homepage = safeUrl(repository.homepage);
    const destination = homepage || safeUrl(repository.html_url);
    if (!destination) return null;

    const topics = Array.isArray(repository.topics) ? repository.topics.slice(0, 3) : [];
    const technologies = [repository.language, ...topics].filter(Boolean).slice(0, 4);
    const article = document.createElement('article');
    article.className = 'project-card';
    article.dataset.automaticProject = 'true';
    article.dataset.repository = repository.name;
    article.dataset.projectUrl = destination;
    article.dataset.actionLabel = homepage ? 'Abrir demonstração' : 'Abrir repositório';
    article.setAttribute('role', 'link');
    article.setAttribute('aria-label', `${article.dataset.actionLabel} de ${title} em uma nova aba`);

    article.innerHTML = `
      <div class="project-art github-auto"><span>${escapeHtml(title)}</span><i></i></div>
      <p class="tag">GitHub / Projeto automático</p>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(repository.description || 'Projeto público adicionado automaticamente a partir do GitHub.')}</p>
      <div class="chips">${technologies.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
    `;

    applyPreview(article, {
      repository: repository.name,
      homepage,
      language: repository.language || topics[0] || 'Projeto público',
      version: repository.pushed_at || repository.updated_at || PREVIEW_VERSION,
    });

    article.addEventListener('click', () => openProject(destination));
    article.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      openProject(destination);
    });

    return article;
  }

  function selectPublicRepositories(repositories) {
    return repositories.filter((repository) => (
      repository.visibility !== 'private' &&
      !repository.private &&
      !repository.fork &&
      !repository.archived &&
      !repository.disabled
    ));
  }

  function selectAutomaticRepositories(repositories) {
    return selectPublicRepositories(repositories)
      .filter((repository) => !featuredRepositoryNames.has(String(repository.name || '').toLowerCase()))
      .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
      .slice(0, MAX_AUTOMATIC_PROJECTS);
  }

  function saveFallback(repositories) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(repositories));
    } catch {
      // O carrossel continua funcionando quando o armazenamento local está bloqueado.
    }
  }

  function readFallback() {
    try {
      const repositories = JSON.parse(localStorage.getItem(CACHE_KEY));
      return Array.isArray(repositories) ? repositories : [];
    } catch {
      return [];
    }
  }

  async function requestRepositories() {
    const response = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=created&direction=desc&per_page=100`,
      { headers: { Accept: 'application/vnd.github+json' } },
    );

    if (!response.ok) {
      throw new Error(`GitHub API respondeu com status ${response.status}.`);
    }

    const repositories = await response.json();
    if (!Array.isArray(repositories)) throw new Error('Resposta inesperada da API do GitHub.');
    return selectPublicRepositories(repositories);
  }

  function renderRepositories(repositories) {
    repositoriesByName = new Map(
      repositories.map((repository) => [String(repository.name || '').toLowerCase(), repository]),
    );

    hydrateFeaturedCards();
    carousel.querySelectorAll('[data-automatic-project="true"]').forEach((card) => card.remove());

    selectAutomaticRepositories(repositories).forEach((repository) => {
      const card = createAutomaticCard(repository);
      if (card) carousel.appendChild(card);
    });

    refreshCards();
    restartTimer();
  }

  async function synchronizeProjects() {
    try {
      const repositories = await requestRepositories();
      saveFallback(repositories);
      renderRepositories(repositories);
    } catch (error) {
      const fallback = readFallback();
      hydrateFeaturedCards();
      if (fallback.length) renderRepositories(fallback);
      console.error('Falha ao sincronizar os cards 3D do GitHub:', error);
    }
  }

  hydrateFeaturedCards();
  refreshCards();
  startTimer();
  synchronizeProjects();
})();
