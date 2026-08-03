(() => {
  const GITHUB_USER = 'turlang';
  const MAX_AUTOMATIC_PROJECTS = 30;
  const CACHE_KEY = 'evandro-automatic-3d-projects-v1';

  const featuredRepositories = new Set([
    'glossflow1',
    'mestre-orc',
    'prospe--o-clientes',
    'papel-parede',
    'orcamento-pessoal',
    'fenix',
    'devclub-level-up',
    'portfoli',
  ]);

  // A antiga tela separada deixa de existir: os projetos automáticos entram no carrossel 3D.
  document.querySelector('.main-nav a[data-screen-target="github"]')?.remove();
  document.querySelector('[data-screen-panel][id="github"]')?.remove();
  document.querySelector('.projects-next-action')?.remove();

  const originalWrap = document.querySelector('.carousel-wrap');
  const originalDots = document.getElementById('projectDots');
  if (!originalWrap || !originalDots) return;

  // Remove os listeners e o temporizador do carrossel antigo sem alterar os cards existentes.
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
    .project-art.github-auto {
      background:
        radial-gradient(circle at 75% 18%, rgba(88,183,255,.72), transparent 30%),
        linear-gradient(135deg, #071c36, #020711);
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

    .project-preview-image {
      position: absolute;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transform: scale(1.035);
      transition: opacity .4s ease, transform .7s cubic-bezier(.16,1,.3,1);
    }

    .project-art.has-preview .project-preview-image {
      opacity: 1;
      transform: scale(1);
    }

    .project-art.has-preview::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(180deg, rgba(1,7,16,.08), rgba(1,7,16,.18) 42%, rgba(1,7,16,.9));
      pointer-events: none;
    }

    .project-art.has-preview > span {
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
  `;
  document.head.appendChild(style);

  let cards = [];
  let current = 0;
  let timer = null;

  function getCardStep() {
    if (window.innerWidth <= 520) return Math.min(205, window.innerWidth * 0.58);
    if (window.innerWidth <= 900) return 230;
    return 270;
  }

  function refreshCards() {
    cards = [...carousel.querySelectorAll('.project-card')];
    current = Math.min(current, Math.max(0, cards.length - 1));
    cards.forEach((card, index) => {
      card.dataset.index = String(index);
    });
    updateCarousel();
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

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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
    return name
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function screenshotUrl(url) {
    return `https://image.thum.io/get/width/1200/crop/700/noanimate/${url}`;
  }

  function githubPreviewUrl(repositoryName) {
    return `https://opengraph.githubassets.com/automatic-portfolio-card/${GITHUB_USER}/${repositoryName}`;
  }

  function attachPreview(visual, repository, title) {
    const homepage = safeUrl(repository.homepage);
    const primary = homepage ? screenshotUrl(homepage) : githubPreviewUrl(repository.name);
    const fallback = homepage ? githubPreviewUrl(repository.name) : null;
    const image = document.createElement('img');
    let fallbackUsed = false;

    image.className = 'project-preview-image';
    image.alt = `Prévia visual do projeto ${title}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('load', () => visual.classList.add('has-preview'));
    image.addEventListener('error', () => {
      if (!fallbackUsed && fallback) {
        fallbackUsed = true;
        image.src = fallback;
        return;
      }
      image.remove();
      visual.classList.remove('has-preview');
    });

    visual.prepend(image);
    image.src = primary;
  }

  function openProject(url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  }

  function createAutomaticCard(repository) {
    const title = displayRepositoryName(repository.name);
    const destination = safeUrl(repository.homepage) || safeUrl(repository.html_url);
    if (!destination) return null;

    const topics = Array.isArray(repository.topics) ? repository.topics.slice(0, 3) : [];
    const technologies = [repository.language, ...topics].filter(Boolean).slice(0, 4);
    const article = document.createElement('article');
    article.className = 'project-card';
    article.dataset.automaticProject = 'true';
    article.dataset.repository = repository.name;
    article.dataset.projectUrl = destination;
    article.dataset.actionLabel = repository.homepage ? 'Abrir demonstração' : 'Abrir repositório';
    article.setAttribute('role', 'link');
    article.setAttribute('aria-label', `${article.dataset.actionLabel} de ${title} em uma nova aba`);

    article.innerHTML = `
      <div class="project-art github-auto"><span>${escapeHtml(title)}</span><i></i></div>
      <p class="tag">GitHub / Projeto automático</p>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(repository.description || 'Projeto público adicionado automaticamente a partir do GitHub.')}</p>
      <div class="chips">${technologies.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
    `;

    const visual = article.querySelector('.project-art');
    if (visual) attachPreview(visual, repository, title);

    article.addEventListener('click', () => openProject(destination));
    article.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      openProject(destination);
    });

    return article;
  }

  function selectAutomaticRepositories(repositories) {
    return repositories
      .filter((repository) => {
        const name = String(repository.name || '').toLowerCase();
        return (
          repository.visibility !== 'private' &&
          !repository.private &&
          !repository.fork &&
          !repository.archived &&
          !repository.disabled &&
          !featuredRepositories.has(name)
        );
      })
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
    return selectAutomaticRepositories(repositories);
  }

  function appendAutomaticCards(repositories) {
    carousel.querySelectorAll('[data-automatic-project="true"]').forEach((card) => card.remove());

    repositories.forEach((repository) => {
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
      appendAutomaticCards(repositories);
    } catch (error) {
      const fallback = readFallback();
      if (fallback.length) appendAutomaticCards(fallback);
      console.error('Falha ao adicionar os novos cards 3D do GitHub:', error);
    }
  }

  refreshCards();
  startTimer();
  synchronizeProjects();
})();
