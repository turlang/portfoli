(() => {
  const OWNER = 'turlang';
  const VERSION = '20260803-repository-svg-1';
  const SVG_CACHE_KEY = 'portfolio-repository-svg-cache-v1';
  const SVG_CACHE_TTL = 24 * 60 * 60 * 1000;
  const TREE_CONCURRENCY = 3;

  const featured = Object.freeze({
    GlossFlow: { repository: 'glossflow1', homepage: 'https://glossflow1.vercel.app/' },
    'Mestre Orc': { repository: 'saas-mestre-orc', homepage: 'https://turlang.github.io/Mestre-orc/' },
    'LeadHunter Pro': { repository: 'Prospe--o-clientes', homepage: 'https://prospe-o-clientes.onrender.com/' },
    'WallArt Premium': { repository: 'papel-parede' },
    'FinançasPro BI': { repository: 'orcamento-pessoal', homepage: 'https://turlang.github.io/orcamento-pessoal/' },
    'Mestre Orc Engine': { repository: 'fenix' },
    'DevClub Level Up': { repository: 'DEVCLUB-LEVEL-UP', homepage: 'https://turlang.github.io/DEVCLUB-LEVEL-UP/' },
  });

  const treeQueue = [];
  let activeTreeRequests = 0;
  const pendingRepositories = new Map();

  const style = document.createElement('style');
  style.dataset.repositorySvgPreview = VERSION;
  style.textContent = `
    .project-art.has-repository-preview {
      background-color:#071426!important;
    }

    .project-art .repository-preview-layer {
      position:absolute!important;
      inset:0!important;
      z-index:0!important;
      display:block!important;
      width:100%!important;
      height:100%!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:inherit!important;
      opacity:1!important;
      visibility:visible!important;
      transform:none!important;
      object-position:center!important;
      pointer-events:none!important;
    }

    .project-art[data-preview-kind="repository-svg"] .repository-preview-layer {
      object-fit:contain!important;
      padding:10px!important;
      background:linear-gradient(145deg,#071426,#020711)!important;
    }

    .project-art[data-preview-kind="github"],
    .project-art[data-preview-kind="website"] {
      background:#071426!important;
    }

    .project-art[data-preview-kind="github"] .repository-preview-layer,
    .project-art[data-preview-kind="website"] .repository-preview-layer,
    .project-art[data-preview-kind="generated"] .repository-preview-layer {
      object-fit:cover!important;
    }

    .project-art.has-repository-preview > i {
      display:none!important;
    }
  `;
  document.head.appendChild(style);

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
      ? `https://opengraph.githubassets.com/${VERSION}/${OWNER}/${encodeURIComponent(repository)}`
      : null;
  }

  function thumPreview(homepage) {
    const url = safeUrl(homepage);
    if (!url || new URL(url).hostname === 'github.com') return null;
    const target = new URL(url);
    target.searchParams.set('portfolioPreview', VERSION);
    return `https://image.thum.io/get/width/1200/crop/700/noanimate/${target.href}`;
  }

  function mshotsPreview(homepage) {
    const url = safeUrl(homepage);
    if (!url || new URL(url).hostname === 'github.com') return null;
    return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1200&h=700&v=${VERSION}`;
  }

  function readSvgCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SVG_CACHE_KEY));
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeSvgCache(cache) {
    try {
      localStorage.setItem(SVG_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // A busca continua funcionando quando o armazenamento local está bloqueado.
    }
  }

  function getCachedSvg(repository) {
    const cache = readSvgCache();
    const entry = cache[String(repository || '').toLowerCase()];
    if (!entry || Date.now() - Number(entry.savedAt || 0) > SVG_CACHE_TTL) return undefined;
    return entry.url || null;
  }

  function cacheSvg(repository, url) {
    const cache = readSvgCache();
    cache[String(repository || '').toLowerCase()] = {
      url: url || null,
      savedAt: Date.now(),
    };
    writeSvgCache(cache);
  }

  function scoreSvgPath(path) {
    const lower = String(path || '').toLowerCase();
    if (!lower.endsWith('.svg')) return Number.NEGATIVE_INFINITY;
    if (/(^|\/)(node_modules|vendor|dist|build|coverage|\.git)(\/|$)/.test(lower)) return -1000;

    let score = 0;
    const keywords = [
      ['preview', 150],
      ['cover', 140],
      ['screenshot', 135],
      ['banner', 125],
      ['hero', 120],
      ['social', 110],
      ['open-graph', 108],
      ['opengraph', 108],
      ['thumbnail', 105],
      ['thumb', 100],
      ['card', 90],
      ['mockup', 85],
      ['project', 70],
      ['logo', 45],
    ];

    keywords.forEach(([keyword, value]) => {
      if (lower.includes(keyword)) score += value;
    });

    if (/(^|\/)(public|assets|images|img|media)(\/|$)/.test(lower)) score += 38;
    if (lower.includes('src/assets/')) score += 30;
    if (lower.includes('readme')) score += 20;
    if (/(icon|favicon|sprite|loader|spinner)/.test(lower)) score -= 90;
    score -= Math.max(0, lower.split('/').length - 2) * 3;
    return score;
  }

  function rawRepositoryUrl(repository, branch, path) {
    const encodedPath = String(path)
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `https://raw.githubusercontent.com/${OWNER}/${encodeURIComponent(repository)}/${encodeURIComponent(branch)}/${encodedPath}`;
  }

  async function requestRepositorySvg(repository) {
    const cached = getCachedSvg(repository);
    if (cached !== undefined) return cached;

    for (const branch of ['main', 'master']) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${OWNER}/${encodeURIComponent(repository)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
          { headers: { Accept: 'application/vnd.github+json' } },
        );

        if (response.status === 404) continue;
        if (!response.ok) throw new Error(`GitHub API respondeu com status ${response.status}.`);

        const payload = await response.json();
        const candidates = Array.isArray(payload.tree)
          ? payload.tree
              .filter((item) => item?.type === 'blob' && String(item.path || '').toLowerCase().endsWith('.svg'))
              .map((item) => ({ path: item.path, score: scoreSvgPath(item.path) }))
              .filter((item) => item.score > -500)
              .sort((first, second) => second.score - first.score)
          : [];

        const selected = candidates[0]?.path;
        const url = selected ? rawRepositoryUrl(repository, branch, selected) : null;
        cacheSvg(repository, url);
        return url;
      } catch (error) {
        console.warn(`Não foi possível procurar SVG em ${repository}/${branch}:`, error);
      }
    }

    cacheSvg(repository, null);
    return null;
  }

  function processTreeQueue() {
    while (activeTreeRequests < TREE_CONCURRENCY && treeQueue.length) {
      const job = treeQueue.shift();
      activeTreeRequests += 1;

      requestRepositorySvg(job.repository)
        .then(job.resolve)
        .finally(() => {
          activeTreeRequests -= 1;
          pendingRepositories.delete(job.key);
          processTreeQueue();
        });
    }
  }

  function resolveRepositorySvg(repository) {
    const key = String(repository || '').toLowerCase();
    if (!key) return Promise.resolve(null);
    if (pendingRepositories.has(key)) return pendingRepositories.get(key);

    const promise = new Promise((resolve) => {
      treeQueue.push({ key, repository, resolve });
      processTreeQueue();
    });

    pendingRepositories.set(key, promise);
    return promise;
  }

  function preloadFirstAvailable(candidates) {
    return new Promise((resolve) => {
      let index = 0;

      function next() {
        if (index >= candidates.length) {
          resolve(null);
          return;
        }

        const candidate = candidates[index];
        index += 1;
        if (!candidate?.url) {
          next();
          return;
        }

        const preloader = new Image();
        preloader.decoding = 'async';
        preloader.onload = () => resolve(candidate);
        preloader.onerror = next;
        preloader.src = candidate.url;
      }

      next();
    });
  }

  function ensurePreviewImage(visual, title) {
    visual.querySelectorAll('.project-preview-image, .repository-preview-layer').forEach((image) => image.remove());

    const image = document.createElement('img');
    image.className = 'repository-preview-layer';
    image.alt = `Imagem do projeto ${title}`;
    image.loading = 'eager';
    image.decoding = 'async';
    image.src = generatedCover(title);

    visual.prepend(image);
    visual.classList.add('has-preview', 'has-repository-preview');
    visual.dataset.previewKind = 'generated';
    return image;
  }

  async function applyPreview(card) {
    const visual = card.querySelector('.project-art');
    const title = card.querySelector('h3')?.textContent?.trim();
    if (!visual || !title) return;

    const automaticRepository = card.dataset.repository;
    const config = automaticRepository
      ? { repository: automaticRepository, homepage: card.dataset.projectUrl }
      : featured[title];

    if (!config?.repository || visual.dataset.repositorySvgVersion === VERSION) return;
    visual.dataset.repositorySvgVersion = VERSION;

    const image = ensurePreviewImage(visual, title);
    const svgUrl = await resolveRepositorySvg(config.repository);
    const homepage = safeUrl(config.homepage);
    const candidates = [
      svgUrl ? { url: svgUrl, kind: 'repository-svg' } : null,
      { url: githubPreview(config.repository), kind: 'github' },
      { url: thumPreview(homepage), kind: 'website' },
      { url: mshotsPreview(homepage), kind: 'website' },
    ].filter((candidate) => candidate?.url);

    const selected = await preloadFirstAvailable(candidates);
    if (!selected || !image.isConnected || !visual.isConnected) return;

    image.src = selected.url;
    image.alt = selected.kind === 'repository-svg'
      ? `Imagem SVG encontrada no repositório ${config.repository}`
      : `Prévia visual do projeto ${title}`;
    visual.dataset.previewKind = selected.kind;
    visual.dataset.previewSource = selected.url;
  }

  function hydrate() {
    document.querySelectorAll('#projectCarousel .project-card').forEach((card) => {
      applyPreview(card).catch((error) => {
        console.error('Falha ao carregar imagem do card:', error);
      });
    });
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
