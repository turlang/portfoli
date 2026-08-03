(() => {
  const body = document.body;
  if (!body.classList.contains('home-no-scroll')) return;

  const root = document.documentElement;
  const viewport = window.visualViewport;
  const screenPrevious = document.querySelector('[data-screen-prev]');
  const screenNext = document.querySelector('[data-screen-next]');
  const carouselPrevious = document.querySelector('.carousel-btn.prev');
  const carouselNext = document.querySelector('.carousel-btn.next');
  const githubPrevious = document.querySelector('[data-github-page-prev]');
  const githubNext = document.querySelector('[data-github-page-next]');

  let wheelAmount = 0;
  let wheelTimer = null;
  let navigationLocked = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartedAt = 0;
  let touchContext = 'screen';

  function updateViewportMetrics() {
    const width = Math.round(viewport?.width || window.innerWidth);
    const height = Math.round(viewport?.height || window.innerHeight);

    root.style.setProperty('--app-width', `${width}px`);
    root.style.setProperty('--app-height', `${height}px`);

    body.classList.toggle('viewport-short', height < 780);
    body.classList.toggle('viewport-compact', height < 680);
    body.classList.toggle('viewport-narrow', width < 651);
    body.classList.toggle('viewport-landscape', width > height);
  }

  function temporarilyLockNavigation() {
    if (navigationLocked) return false;
    navigationLocked = true;
    body.classList.add('is-screen-transitioning');

    window.setTimeout(() => {
      navigationLocked = false;
      body.classList.remove('is-screen-transitioning');
    }, 620);

    return true;
  }

  function clickAvailable(button) {
    if (!button || button.disabled || navigationLocked) return;
    if (!temporarilyLockNavigation()) return;
    button.click();
  }

  function navigateScreen(direction) {
    clickAvailable(direction > 0 ? screenNext : screenPrevious);
  }

  function navigateContext(context, direction) {
    if (context === 'carousel') {
      (direction > 0 ? carouselNext : carouselPrevious)?.click();
      return;
    }

    if (context === 'github') {
      const button = direction > 0 ? githubNext : githubPrevious;
      if (button && !button.disabled) button.click();
      else navigateScreen(direction);
      return;
    }

    navigateScreen(direction);
  }

  function determineTouchContext(target) {
    if (!(target instanceof Element)) return 'screen';
    if (target.closest('.carousel-wrap')) return 'carousel';
    if (target.closest('.github-projects-shell')) return 'github';
    return 'screen';
  }

  document.addEventListener(
    'wheel',
    (event) => {
      const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(dominantDelta) < 2) return;

      wheelAmount += dominantDelta;
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        wheelAmount = 0;
      }, 180);

      if (Math.abs(wheelAmount) < 90) return;

      const direction = wheelAmount > 0 ? 1 : -1;
      wheelAmount = 0;
      navigateScreen(direction);
    },
    { passive: false },
  );

  document.addEventListener(
    'touchstart',
    (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartedAt = performance.now();
      touchContext = determineTouchContext(event.target);
    },
    { passive: true },
  );

  document.addEventListener(
    'touchend',
    (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const elapsed = performance.now() - touchStartedAt;
      const horizontalGesture = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
      const enoughDistance = Math.abs(deltaX) >= 46;
      const fastEnough = elapsed <= 700;

      if (!horizontalGesture || !enoughDistance || !fastEnough) return;
      navigateContext(touchContext, deltaX < 0 ? 1 : -1);
    },
    { passive: true },
  );

  document.querySelectorAll('[data-screen-target], [data-screen-prev], [data-screen-next], [data-screen-dot]').forEach((control) => {
    control.addEventListener('click', () => {
      body.classList.add('is-screen-transitioning');
      window.setTimeout(() => body.classList.remove('is-screen-transitioning'), 620);
    });
  });

  updateViewportMetrics();
  window.addEventListener('resize', updateViewportMetrics, { passive: true });
  viewport?.addEventListener('resize', updateViewportMetrics, { passive: true });
  viewport?.addEventListener('scroll', updateViewportMetrics, { passive: true });

  requestAnimationFrame(() => body.classList.add('viewport-ready'));
})();
