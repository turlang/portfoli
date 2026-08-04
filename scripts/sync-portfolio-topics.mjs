const OWNER = 'turlang';
const TOPIC = 'portfolio';
const API_VERSION = '2022-11-28';
const token = process.env.PORTFOLIO_ADMIN_TOKEN || process.env.GH_TOKEN;

if (!token) {
  console.error('Defina PORTFOLIO_ADMIN_TOKEN com permissão Administration: write para os repositórios públicos.');
  process.exit(1);
}

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': API_VERSION,
  'User-Agent': 'turlang-portfolio-topic-sync',
};

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${body}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function listPublicRepositories() {
  const repositories = [];

  for (let page = 1; ; page += 1) {
    const batch = await github(
      `/user/repos?affiliation=owner&visibility=public&per_page=100&page=${page}&sort=created&direction=desc`,
    );

    repositories.push(...batch.filter((repository) => repository.owner?.login?.toLowerCase() === OWNER));
    if (batch.length < 100) break;
  }

  return repositories;
}

async function applyTopic(repository) {
  const path = `/repos/${OWNER}/${encodeURIComponent(repository.name)}/topics`;
  const current = await github(path);
  const names = [...new Set([...(current.names || []), TOPIC])].sort();

  if ((current.names || []).includes(TOPIC)) {
    console.log(`✓ ${repository.name}: tópico já existente`);
    return 'unchanged';
  }

  await github(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names }),
  });

  console.log(`+ ${repository.name}: tópico ${TOPIC} adicionado`);
  return 'updated';
}

const repositories = await listPublicRepositories();
let updated = 0;
let unchanged = 0;
let failed = 0;

for (const repository of repositories) {
  try {
    const result = await applyTopic(repository);
    if (result === 'updated') updated += 1;
    else unchanged += 1;
  } catch (error) {
    failed += 1;
    console.error(`✗ ${repository.name}: ${error.message}`);
  }
}

console.log(`\nResultado: ${updated} atualizados, ${unchanged} já configurados, ${failed} falhas.`);
if (failed > 0) process.exitCode = 1;
