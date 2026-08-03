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
