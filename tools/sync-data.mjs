/**
 * 从 ../ai-ref-library-cn 同步词库与配方到本站。
 * 生成 data/tags.js / data/recipes.js，保证本地双击也能用（不走 fetch）。
 *
 * 用法：node tools/sync-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '..');
const source = path.resolve(site, '..', 'ai-ref-library-cn', 'data');

const tags = JSON.parse(fs.readFileSync(path.join(source, 'tags.json'), 'utf8'));
const recipes = JSON.parse(fs.readFileSync(path.join(source, 'recipes.json'), 'utf8'));

const banner = (name) => `/* 由 tools/sync-data.mjs 从 ai-ref-library-cn 同步生成，请勿手改。 */\n`;

fs.writeFileSync(
  path.join(site, 'data', 'tags.js'),
  banner('tags') + `window.TAG_ATLAS = ${JSON.stringify(tags)};\n`,
);
fs.writeFileSync(
  path.join(site, 'data', 'recipes.js'),
  banner('recipes') + `window.TAG_RECIPES = ${JSON.stringify(recipes)};\n`,
);

console.log(`tags: ${tags.terms.length} terms, ${tags.categories.length} categories`);
console.log(`recipes: ${recipes.recipes.length}`);
