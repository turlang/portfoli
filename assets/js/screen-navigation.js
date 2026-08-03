(() => {
  const body = document.body;
  if (!body.classList.contains('home-no-scroll')) return;

  const panels = [...document.querySelectorAll('[data-screen-panel]')];
  const screenLinks = [...document.querySelectorAll('[data-screen-target]')];
  const previousButton = document.querySelector('[data-screen-prev]');
  const nextButton = document.querySelector('[data-screen-next]');
  const dotsContainer = document.querySelector('[data-screen-dots]');
  const progressLabel = document.querySelector('[data-screen-progress]');
  const mainNav = document.querySelector('.main-nav');
  const menuButton = document.querySelector('.menu-btn');

  if (!panels.length) return;

  let currentScreen = 0;

  function getPanelIndexById(id) {
    return panels.findIndex((panel) => panel.id === id);
  }

  function normalizeIndex(index) {
    return Math.max(0, Math.min(index, panels.length - 1));
  }

  function closeMobileMenu() {
    mainNav?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }

  function updateScreenDots() {
    if (!dotsContainer) return;

    dotsContainer.innerHTML = panels
      .map((panel, index) => {
        const label = panel.dataset.screenName || `Tela ${index + 1}`;
        return `<button class="screen-dot${index === currentScreen ? ' active' : ''}" type="button" data-screen-dot="${index}" aria-label="Abrir ${label}" title="${label}"></button>`;
      })
      .join('');

    dotsContainer.querySelectorAll('[data-screen-dot]').forEach((button) => {
      button.addEventListener('click', () => {
        showScreen(Number(button.dataset.screenDot));
      });
    });
  }

  function showScreen(index, options = {}) {
    const { updateHash = true } = options;
    currentScreen = normalizeIndex(index);

    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === currentScreen;
      panel.classList.toggle('is-active', active);
      panel.classList.toggle('is-before', panelIndex < currentScreen);
      panel.classList.toggle('is-after', panelIndex > currentScreen);
      panel.setAttribute('aria-hidden', String(!active));

      if ('inert' in panel) {
        panel.inert = !active;
      }
    });

    const activePanel = panels[currentScreen];

    screenLinks.forEach((link) => {
      const active = link.dataset.screenTarget === activePanel.id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    if (previousButton) previousButton.disabled = currentScreen === 0;
    if (nextButton) nextButton.disabled = currentScreen === panels.length - 1;

    if (progressLabel) {
      progressLabel.textContent = `${String(currentScreen + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`;
    }

    updateScreenDots();
    closeMobileMenu();

    if (updateHash && activePanel.id) {
      history.replaceState(null, '', `#${activePanel.id}`);
    }
  }

  screenLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.dataset.screenTarget;
      const targetIndex = getPanelIndexById(targetId);
      if (targetIndex < 0) return;

      event.preventDefault();
      showScreen(targetIndex);
    });
  });

  previousButton?.addEventListener('click', () => showScreen(currentScreen - 1));
  nextButton?.addEventListener('click', () => showScreen(currentScreen + 1));

  window.addEventListener('keydown', (event) => {
    const element = event.target;
    const editing = element instanceof HTMLElement && element.matches('input, textarea, select, [contenteditable="true"]');
    if (editing) return;

    if (['ArrowRight', 'PageDown'].includes(event.key)) {
      event.preventDefault();
      showScreen(currentScreen + 1);
    }

    if (['ArrowLeft', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      showScreen(currentScreen - 1);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      showScreen(0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      showScreen(panels.length - 1);
    }
  });

  window.addEventListener('hashchange', () => {
    const targetId = window.location.hash.replace('#', '');
    const targetIndex = getPanelIndexById(targetId);
    if (targetIndex >= 0) showScreen(targetIndex, { updateHash: false });
  });

  document.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );

  document.addEventListener(
    'touchmove',
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );

  window.scrollTo(0, 0);

  const initialTarget = window.location.hash.replace('#', '');
  const initialIndex = getPanelIndexById(initialTarget);
  showScreen(initialIndex >= 0 ? initialIndex : 0, { updateHash: initialIndex < 0 });

  const githubContainer = document.querySelector('[data-github-paginated]');
  const githubPrevious = document.querySelector('[data-github-page-prev]');
  const githubNext = document.querySelector('[data-github-page-next]');
  const githubPageLabel = document.querySelector('[data-github-page-label]');

  if (!githubContainer) return;

  let githubPage = 0;
  let resizeTimer = null;

  function getGithubPageSize() {
    if (window.innerWidth <= 650) return 1;
    if (window.innerWidth <= 1080) return 2;
    return 3;
  }

  function getGithubCards() {
    return [...githubContainer.querySelectorAll('.github-project-card')];
  }

  function renderGithubPage() {
    const cards = getGithubCards();
    const pageSize = getGithubPageSize();
    const totalPages = Math.max(1, Math.ceil(cards.length / pageSize));
    githubPage = Math.max(0, Math.min(githubPage, totalPages - 1));

    cards.forEach((card, index) => {
      const firstIndex = githubPage * pageSize;
      card.hidden = index < firstIndex || index >= firstIndex + pageSize;
    });

    const hasCards = cards.length > 0;
    if (githubPrevious) githubPrevious.disabled = !hasCards || githubPage === 0;
    if (githubNext) githubNext.disabled = !hasCards || githubPage >= totalPages - 1;
    if (githubPageLabel) githubPageLabel.textContent = hasCards ? `${githubPage + 1} / ${totalPages}` : '0 / 0';
  }

  githubPrevious?.addEventListener('click', () => {
    githubPage -= 1;
    renderGithubPage();
  });

  githubNext?.addEventListener('click', () => {
    githubPage += 1;
    renderGithubPage();
  });

  const githubObserver = new MutationObserver(() => {
    githubPage = 0;
    renderGithubPage();
  });

  githubObserver.observe(githubContainer, { childList: true });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      githubPage = 0;
      renderGithubPage();
    }, 140);
  });

  renderGithubPage();
})();

(() => {
  const projectDestinations = Object.freeze({
    GlossFlow: {
      url: 'https://glossflow1.vercel.app/',
      kind: 'demonstração',
    },
    'Mestre Orc': {
      url: 'https://turlang.github.io/Mestre-orc/',
      kind: 'demonstração',
    },
    'LeadHunter Pro': {
      url: 'https://prospe-o-clientes.onrender.com/',
      kind: 'demonstração',
    },
    'WallArt Premium': {
      url: 'https://github.com/turlang/papel-parede',
      kind: 'repositório',
    },
    'FinançasPro BI': {
      url: 'https://turlang.github.io/orcamento-pessoal/',
      kind: 'demonstração',
    },
    'Mestre Orc Engine': {
      url: 'https://github.com/turlang/fenix',
      kind: 'repositório',
    },
    'DevClub Level Up': {
      url: 'https://github.com/turlang/DEVCLUB-LEVEL-UP',
      kind: 'repositório',
    },
  });

  const cards = [...document.querySelectorAll('.project-card')];
  if (!cards.length) return;

  const style = document.createElement('style');
  style.dataset.projectCardLinks = 'true';
  style.textContent = `
    .project-card.is-clickable-project {
      cursor: pointer;
      padding-bottom: 54px;
    }

    .project-card.is-clickable-project::after {
      content: attr(data-action-label);
      position: absolute;
      right: 16px;
      bottom: 14px;
      left: 16px;
      display: flex;
      min-height: 34px;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      border: 1px solid rgba(88, 183, 255, .28);
      border-radius: 9px;
      background: rgba(7, 19, 38, .88);
      color: #9fd4ff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .04em;
      opacity: .86;
      transition: border-color .22s ease, background .22s ease, color .22s ease, opacity .22s ease;
    }

    .project-card.is-clickable-project::before {
      content: '↗';
      position: absolute;
      right: 28px;
      bottom: 21px;
      z-index: 2;
      color: #9fd4ff;
      font-size: 15px;
      pointer-events: none;
    }

    .project-card.is-clickable-project:hover::after,
    .project-card.is-clickable-project:focus-visible::after {
      border-color: rgba(88, 183, 255, .78);
      background: rgba(13, 55, 104, .94);
      color: #fff;
      opacity: 1;
    }

    .project-card.is-clickable-project:focus-visible {
      outline: 3px solid rgba(88, 183, 255, .92);
      outline-offset: 5px;
    }
  `;
  document.head.appendChild(style);

  function openProject(card) {
    const url = card.dataset.projectUrl;
    if (!url) return;

    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (openedWindow) openedWindow.opener = null;
    else window.location.assign(url);
  }

  function syncFocusState() {
    cards.forEach((card) => {
      card.tabIndex = card.classList.contains('active') ? 0 : -1;
    });
  }

  cards.forEach((card) => {
    const title = card.querySelector('h3')?.textContent?.trim();
    const destination = title ? projectDestinations[title] : null;
    if (!destination) return;

    const actionLabel = destination.kind === 'demonstração' ? 'Abrir demonstração' : 'Abrir repositório';

    card.classList.add('is-clickable-project');
    card.dataset.projectUrl = destination.url;
    card.dataset.actionLabel = actionLabel;
    card.setAttribute('role', 'link');
    card.setAttribute('aria-label', `${actionLabel} de ${title} em uma nova aba`);
    card.setAttribute('title', `${actionLabel} de ${title}`);

    card.addEventListener('click', () => openProject(card));
    card.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      openProject(card);
    });

    const observer = new MutationObserver(syncFocusState);
    observer.observe(card, { attributes: true, attributeFilter: ['class'] });
  });

  syncFocusState();
})();
