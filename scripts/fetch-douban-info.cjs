const fs = require('fs');
const path = require('path');

const catalogPath = path.resolve('src/movieCatalog.js');
const infoPath = path.resolve('src/movieInfo.js');
const cachePath = path.resolve('src/doubanMovieInfo.js');

const readExportedArray = (source, exportName) => {
  const match = source.match(new RegExp(`export const ${exportName} = (\\[[\\s\\S]*\\]);?\\s*$`));
  if (!match) {
    throw new Error(`Cannot parse ${exportName}`);
  }
  return Function(`"use strict"; return (${match[1]});`)();
};

const source = fs.readFileSync(catalogPath, 'utf8');
const movieCatalog = readExportedArray(source, 'movieCatalog');
const infoSource = fs.existsSync(infoPath)
  ? fs.readFileSync(infoPath, 'utf8')
  : 'export const movieInfo = [];';
const movieInfo = readExportedArray(infoSource, 'movieInfo');
const infoById = new Map(movieInfo.map((movie) => [movie.id, movie]));

const existingSource = fs.existsSync(cachePath)
  ? fs.readFileSync(cachePath, 'utf8')
  : 'export const doubanMovieInfo = [];';
const existing = readExportedArray(existingSource, 'doubanMovieInfo');
const cache = new Map(existing.map((movie) => [movie.id, movie]));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/,\s*(the|a|an)$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizeLocalTitle = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[《》「」『』“”‘’'"（）()\[\]【】:：,，.。!！?？·・\-—_]/g, '');

const normalizeCatalogTitle = (title) =>
  title
    .replace(/^(.+),\s*(The|A|An)$/i, '$2 $1')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const scoreItem = (item, movieTitle) => {
  const expected = normalize(normalizeCatalogTitle(movieTitle));
  const candidate = normalize(`${item.sub_title || ''} ${item.title || ''}`);
  let score = 0;
  if (item.type === 'movie') score += 10;
  if (candidate.includes(expected)) score += 25;
  if (item.sub_title && normalize(item.sub_title) === expected) score += 20;
  if (item.year) score += 2;
  return score;
};

const scoreChineseItem = (item, info, movieTitle) => {
  let score = scoreItem(item, movieTitle);
  if (info?.titleCn) {
    const expectedCn = normalizeLocalTitle(info.titleCn);
    const candidateCn = normalizeLocalTitle(item.title);
    if (candidateCn === expectedCn) score += 40;
    if (
      expectedCn &&
      candidateCn &&
      (candidateCn.includes(expectedCn) || expectedCn.includes(candidateCn))
    ) {
      score += 18;
    }
  }
  return score;
};

async function fetchSuggestItems(query) {
  const url = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchSearchItems(query) {
  const url = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(query)}&cat=1002`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(/window\.__DATA__ = ({[\s\S]*?});/);
  if (!match) return [];

  try {
    return JSON.parse(match[1]).items || [];
  } catch {
    return [];
  }
}

const scoreSearchItem = (item, info, movieTitle) => {
  const title = item.title || '';
  const expectedCn = normalizeLocalTitle(info?.titleCn);
  const candidateCn = normalizeLocalTitle(title);
  const expected = normalize(normalizeCatalogTitle(movieTitle));
  const candidate = normalize(title);
  let score = 0;
  if (item.cover_url) score += 5;
  if (expectedCn && candidateCn.includes(expectedCn)) score += 60;
  if (expected && candidate.includes(expected)) score += 35;
  if (/电影|剧情|喜剧|爱情|纪录片|动画|科幻|冒险|传记/.test(item.abstract || '')) score += 5;
  return score;
};

const buildSearchInfo = (item, movie) => ({
  id: movie.id,
  titleCn: (item.title || '').replace(/\s+[\w\s:.'’!-]+‎?\s*\(\d{4}\).*$/, '').trim(),
  doubanTitle: item.title || '',
  doubanUrl: String(item.url || '').replace(/\?suggest=.*$/, '/'),
  doubanYear: (item.title || '').match(/\((\d{4})\)/)?.[1] || '',
  doubanCover: item.cover_url || '',
});

async function fetchSuggestion(movie) {
  const info = infoById.get(movie.id);
  const queries = [
    info?.titleCn,
    normalizeCatalogTitle(movie.title),
  ].filter(Boolean);
  let items = [];
  for (const query of queries) {
    items = await fetchSuggestItems(query);
    if (items.length) break;
    await sleep(800);
  }

  const best = items
    .filter((item) => item.type === 'movie')
    .map((item) => ({ item, score: scoreChineseItem(item, info, movie.title) }))
    .sort((a, b) => b.score - a.score)[0];

  if (!best || best.score < 18) {
    for (const query of queries) {
      const searchItems = await fetchSearchItems(query);
      const bestSearch = searchItems
        .map((item) => ({ item, score: scoreSearchItem(item, info, movie.title) }))
        .sort((a, b) => b.score - a.score)[0];
      if (bestSearch && bestSearch.score >= 35) {
        return buildSearchInfo(bestSearch.item, movie);
      }
      await sleep(800);
    }
    return null;
  }

  return {
    id: movie.id,
    titleCn: best.item.title,
    doubanTitle: best.item.sub_title
      ? `${best.item.title} ${best.item.sub_title} (${best.item.year || ''})`.trim()
      : `${best.item.title} (${best.item.year || ''})`.trim(),
    doubanUrl: String(best.item.url || '').replace(/\?suggest=.*$/, '/'),
    doubanYear: best.item.year || '',
    doubanCover: best.item.img || '',
  };
}

(async () => {
  const startIndex = Number(process.env.START || 0);
  const limit = Number(process.env.LIMIT || movieCatalog.length);
  const delay = Number(process.env.DELAY_MS || 900);
  const slice = movieCatalog.slice(startIndex, startIndex + limit);

  for (let index = 0; index < slice.length; index += 1) {
    const movie = slice[index];
    const label = `${startIndex + index + 1}/${movieCatalog.length}`;
    if (cache.has(movie.id)) {
      console.log(`${label} cached ${movie.title}`);
      continue;
    }

    try {
      const info = await fetchSuggestion(movie);
      if (info) {
        cache.set(movie.id, info);
        console.log(`${label} ok ${movie.title} -> ${info.titleCn}`);
      } else {
        console.log(`${label} miss ${movie.title}`);
      }
    } catch (error) {
      console.log(`${label} error ${movie.title}: ${error.message}`);
      if (/HTTP 403|HTTP 429/.test(error.message)) {
        break;
      }
    }

    await sleep(delay);
  }

  const records = [...cache.values()].sort((a, b) => Number(a.id) - Number(b.id));
  fs.writeFileSync(
    cachePath,
    `export const doubanMovieInfo = ${JSON.stringify(records, null, 2)};\n`,
  );
  console.log(`wrote ${records.length} cached records`);
})();
