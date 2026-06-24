const fs = require('fs');
const path = require('path');

const catalogPath = path.resolve('src/movieCatalog.js');
const outputPath = path.resolve('src/movieVisuals.js');

const readExportedArray = (source, exportName) => {
  const match = source.match(new RegExp(`export const ${exportName} = (\\[[\\s\\S]*\\]);?\\s*$`));
  if (!match) throw new Error(`Cannot parse ${exportName}`);
  return Function(`"use strict"; return (${match[1]});`)();
};

const source = fs.readFileSync(catalogPath, 'utf8');
const movieCatalog = readExportedArray(source, 'movieCatalog');

const decodeHtml = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const cleanUrl = (url) => decodeHtml(url).replace(/\\\//g, '/').trim();

const uniq = (items) => [...new Set(items.filter(Boolean))];

const isMovieImage = (url) => {
  const lower = url.toLowerCase();
  const fileName = lower.split('/').pop() || '';
  return (
    lower.includes('/wp-content/uploads/') &&
    /\.(jpe?g|png|webp)(\?|$)/.test(lower) &&
    !/logo|mwge|oracle|cropped|transparent|icon|menu|background|teal|heading|avatar|button|slumdog-millionaire-review|movie-her|god-friended-me/.test(
      fileName,
    )
  );
};

const getImageTokens = (movie, sourceUrl) => {
  const slug = sourceUrl.split('/').filter(Boolean).pop() || '';
  const text = `${slug} ${movie.title}`.toLowerCase();
  return uniq(
    text
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter(
        (token) =>
          token.length >= 3 &&
          ![
            'the',
            'and',
            'for',
            'with',
            'from',
            'into',
            'that',
            'this',
            'part',
            'movie',
            'film',
          ].includes(token),
      ),
  );
};

const isRelevantSceneImage = (url, tokens) => {
  const fileName = (url.toLowerCase().split('/').pop() || '').replace(/[^a-z0-9]+/g, ' ');
  return tokens.some((token) => fileName.includes(token));
};

async function fetchMovieVisual(movie) {
  const response = await fetch(`https://mwge.org/?p=${movie.id}`, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const contentHtml = html
    .split('<div data-elementor-type="jet-popup"')[0]
    .split('<footer')[0]
    .split('<script id="jet-popup')[0];
  const sourceUrl =
    cleanUrl(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]) || response.url;
  const ogImage = cleanUrl(html.match(/property="og:image" content="([^"]+)"/)?.[1] || '');
  const featuredImage = cleanUrl(html.match(/"featuredImage":"([^"]+)"/)?.[1] || '');
  const backgroundImages = [
    ...contentHtml.matchAll(/background-image:url\(["']?([^"')]+)["']?\)/g),
  ].map((match) => cleanUrl(match[1]));

  const posterUrl = [ogImage, featuredImage].find(isMovieImage) || '';
  const imageTokens = getImageTokens(movie, sourceUrl);
  const sceneImages = uniq(backgroundImages.filter(isMovieImage))
    .filter((url) => url !== posterUrl)
    .filter((url) => isRelevantSceneImage(url, imageTokens));

  return {
    id: movie.id,
    sourceUrl,
    posterUrl,
    sceneImages: sceneImages.slice(0, 4),
  };
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      const movie = items[current];
      try {
        const result = await worker(movie);
        results[current] = result;
        console.log(
          `${current + 1}/${items.length} ok ${movie.title} ${result.posterUrl ? 'poster' : 'no-poster'} ${result.sceneImages.length} scenes`,
        );
      } catch (error) {
        results[current] = { id: movie.id, posterUrl: '', sceneImages: [] };
        console.log(`${current + 1}/${items.length} error ${movie.title}: ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, runWorker));
  return results;
}

(async () => {
  const startIndex = Number(process.env.START || 0);
  const limit = Number(process.env.LIMIT || movieCatalog.length);
  const concurrency = Number(process.env.CONCURRENCY || 4);
  const slice = movieCatalog.slice(startIndex, startIndex + limit);
  const records = await runPool(slice, fetchMovieVisual, concurrency);
  const existing = fs.existsSync(outputPath)
    ? readExportedArray(fs.readFileSync(outputPath, 'utf8'), 'movieVisuals')
    : [];
  const cache = new Map(existing.map((record) => [record.id, record]));
  records.forEach((record) => cache.set(record.id, record));
  const merged = [...cache.values()].sort((a, b) => Number(a.id) - Number(b.id));
  fs.writeFileSync(
    outputPath,
    `export const movieVisuals = ${JSON.stringify(merged, null, 2)};\n`,
  );
  const posterCount = merged.filter((record) => record.posterUrl).length;
  const sceneCount = merged.filter((record) => record.sceneImages?.length).length;
  console.log(`wrote ${merged.length} records, ${posterCount} posters, ${sceneCount} with scenes`);
})();
