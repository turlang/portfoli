const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.main-nav');

if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
}

function initializeCarousel() {
  const cards = [...document.querySelectorAll('.project-card')];
  const carousel = document.getElementById('projectCarousel');
  const dots = document.getElementById('projectDots');

  if (!cards.length || !carousel) return;

  let current = 0;
  let timer = null;

  function renderDots() {
    if (!dots) return;

    dots.innerHTML = cards
      .map(
        (_, index) =>
          `<button class="${index === current ? 'active' : ''}" aria-label="Projeto ${index + 1}"></button>`,
      )
      .join('');

    [...dots.children].forEach((button, index) => {
      button.addEventListener('click', () => {
        current = index;
        updateCarousel();
        restartTimer();
      });
    });
  }

  function updateCarousel() {
    const total = cards.length;

    cards.forEach((card, index) => {
      let offset = index - current;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;

      const distance = Math.abs(offset);
      card.classList.toggle('active', offset === 0);
      card.style.zIndex = String(10 - distance);
      card.style.opacity = distance > 2 ? '0' : String(1 - distance * 0.18);
      card.style.filter = distance > 0 ? 'brightness(.78)' : 'brightness(1.05)';
      card.style.transform = `translateX(calc(-50% + ${offset * 270}px)) translateZ(${-distance * 140}px) rotateY(${offset * -18}deg) scale(${1 - distance * 0.08})`;
    });

    renderDots();
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      current = (current + 1) % cards.length;
      updateCarousel();
    }, 4500);
  }

  function restartTimer() {
    startTimer();
  }

  document.querySelector('.carousel-btn.prev')?.addEventListener('click', () => {
    current = (current - 1 + cards.length) % cards.length;
    updateCarousel();
    restartTimer();
  });

  document.querySelector('.carousel-btn.next')?.addEventListener('click', () => {
    current = (current + 1) % cards.length;
    updateCarousel();
    restartTimer();
  });

  carousel.addEventListener('mouseenter', stopTimer);
  carousel.addEventListener('mouseleave', startTimer);

  cards.forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;

      if (card.classList.contains('active')) {
        card.style.setProperty('--tilt', `rotateX(${y * -6}deg) rotateY(${x * 6}deg)`);
      }
    });
  });

  updateCarousel();
  startTimer();
}

const GITHUB_CONFIG = Object.freeze({
  username: 'turlang',
  topic: 'portfolio',
  cacheKey: 'evandro-portfolio-github-projects-v1',
  cacheDuration: 60 * 60 * 1000,
  maximumProjects: 12,
});

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safePublicUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function readGithubCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(GITHUB_CONFIG.cacheKey));
    if (!cache || !Array.isArray(cache.repositories) || !cache.savedAt) return null;
    return cache;
  } catch {
    return null;
  }
}

function writeGithubCache(repositories) {
  try {
    localStorage.setItem(
      GITHUB_CONFIG.cacheKey,
      JSON.stringify({ repositories, savedAt: Date.now() }),
    );
  } catch {
    // O portfólio continua funcionando quando o armazenamento local está bloqueado.
  }
}

function selectPortfolioRepositories(repositories) {
  return repositories
    .filter((repository) => {
      const topics = Array.isArray(repository.topics) ? repository.topics : [];
      return (
        !repository.fork &&
        !repository.archived &&
        repository.name.toLowerCase() !== 'portfoli' &&
        topics.some((topic) => topic.toLowerCase() === GITHUB_CONFIG.topic)
      );
    })
    .sort((first, second) => new Date(second.updated_at) - new Date(first.updated_at))
    .slice(0, GITHUB_CONFIG.maximumProjects);
}

async function requestGithubRepositories() {
  const endpoint = `https://api.github.com/users/${GITHUB_CONFIG.username}/repos?sort=updated&direction=desc&per_page=100`;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/vnd.github+json' },
  });

  if (!response.ok) {
    throw new Error(`GitHub API respondeu com status ${response.status}.`);
  }

  const repositories = await response.json();
  if (!Array.isArray(repositories)) throw new Error('Resposta inesperada da API do GitHub.');
  return selectPortfolioRepositories(repositories);
}

async function getGithubRepositories(forceRefresh = false) {
  const cache = readGithubCache();
  const cacheIsFresh = cache && Date.now() - cache.savedAt < GITHUB_CONFIG.cacheDuration;

  if (!forceRefresh && cacheIsFresh) {
    return { repositories: cache.repositories, savedAt: cache.savedAt, source: 'cache' };
  }

  try {
    const repositories = await requestGithubRepositories();
    writeGithubCache(repositories);
    return { repositories, savedAt: Date.now(), source: 'github' };
  } catch (error) {
    if (cache) {
      return {
        repositories: cache.repositories,
        savedAt: cache.savedAt,
        source: 'stale-cache',
        error,
      };
    }
    throw error;
  }
}

function formatRepositoryDate(value) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return 'data não informada';
  }
}

function createRepositoryCard(repository, index) {
  const description = repository.description || 'Projeto público em desenvolvimento e evolução contínua.';
  const language = repository.language || 'Web';
  const topics = (Array.isArray(repository.topics) ? repository.topics : [])
    .filter((topic) => topic.toLowerCase() !== GITHUB_CONFIG.topic)
    .slice(0, 4);
  const repositoryUrl = safePublicUrl(repository.html_url);
  const demoUrl = safePublicUrl(repository.homepage);
  const links = [
    repositoryUrl
      ? `<a class="repo-link primary" href="${escapeHtml(repositoryUrl)}" target="_blank" rel="noopener noreferrer">Ver código</a>`
      : '',
    demoUrl
      ? `<a class="repo-link" href="${escapeHtml(demoUrl)}" target="_blank" rel="noopener noreferrer">Ver demonstração</a>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const topicMarkup = topics.length
    ? topics.map((topic) => `<span>${escapeHtml(topic)}</span>`).join('')
    : `<span>${escapeHtml(language)}</span>`;

  return `
    <article class="github-project-card">
      <div class="repo-visual theme-${index % 4}">
        <span>${escapeHtml(repository.name.slice(0, 2).toUpperCase())}</span>
        <small>${escapeHtml(language)}</small>
      </div>
      <div class="repo-card-body">
        <p class="tag">GitHub / Atualização automática</p>
        <h3>${escapeHtml(repository.name)}</h3>
        <p>${escapeHtml(description)}</p>
        <div class="repo-topics">${topicMarkup}</div>
        <div class="repo-meta">
          <span>${escapeHtml(language)}</span>
          <span>Atualizado em ${escapeHtml(formatRepositoryDate(repository.updated_at))}</span>
        </div>
        <div class="repo-actions">${links}</div>
      </div>
    </article>`;
}

function setGithubStatus(message, state = 'default') {
  document.querySelectorAll('[data-github-status]').forEach((status) => {
    status.textContent = message;
    status.dataset.state = state;
  });
}

function renderGithubRepositories(repositories) {
  const containers = [...document.querySelectorAll('[data-github-projects]')];
  if (!containers.length) return;

  if (!repositories.length) {
    const emptyState = `
      <div class="github-empty-state">
        <strong>Nenhum projeto sincronizado ainda.</strong>
        <p>Adicione o tópico <code>${GITHUB_CONFIG.topic}</code> aos repositórios públicos que devem aparecer nesta seção.</p>
        <a href="https://github.com/${GITHUB_CONFIG.username}?tab=repositories" target="_blank" rel="noopener noreferrer">Abrir repositórios no GitHub →</a>
      </div>`;

    containers.forEach((container) => {
      container.innerHTML = emptyState;
      container.setAttribute('aria-busy', 'false');
    });
    return;
  }

  const markup = repositories.map(createRepositoryCard).join('');
  containers.forEach((container) => {
    container.innerHTML = markup;
    container.setAttribute('aria-busy', 'false');
  });
}

async function loadGithubProjects(forceRefresh = false) {
  const containers = [...document.querySelectorAll('[data-github-projects]')];
  if (!containers.length) return;

  const refreshButtons = [...document.querySelectorAll('[data-github-refresh]')];
  refreshButtons.forEach((button) => {
    button.disabled = true;
    button.textContent = 'Atualizando...';
  });

  containers.forEach((container) => container.setAttribute('aria-busy', 'true'));
  setGithubStatus('Consultando os projetos públicos marcados com o tópico portfolio...');

  try {
    const result = await getGithubRepositories(forceRefresh);
    renderGithubRepositories(result.repositories);

    const syncTime = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(result.savedAt));

    if (result.source === 'stale-cache') {
      setGithubStatus(
        `GitHub temporariamente indisponível. Exibindo a última sincronização salva às ${syncTime}.`,
        'warning',
      );
    } else {
      const total = result.repositories.length;
      setGithubStatus(
        `${total} ${total === 1 ? 'projeto sincronizado' : 'projetos sincronizados'} automaticamente às ${syncTime}.`,
        'success',
      );
    }
  } catch (error) {
    containers.forEach((container) => {
      container.innerHTML = `
        <div class="github-empty-state error">
          <strong>Não foi possível consultar o GitHub agora.</strong>
          <p>Os estudos de caso fixos continuam disponíveis normalmente.</p>
          <a href="https://github.com/${GITHUB_CONFIG.username}?tab=repositories" target="_blank" rel="noopener noreferrer">Ver projetos diretamente no GitHub →</a>
        </div>`;
      container.setAttribute('aria-busy', 'false');
    });
    setGithubStatus('Falha temporária na sincronização automática.', 'error');
    console.error('Falha ao sincronizar projetos do GitHub:', error);
  } finally {
    refreshButtons.forEach((button) => {
      button.disabled = false;
      button.textContent = 'Atualizar agora';
    });
  }
}

initializeCarousel();
loadGithubProjects();

document.querySelectorAll('[data-github-refresh]').forEach((button) => {
  button.addEventListener('click', () => loadGithubProjects(true));
});
