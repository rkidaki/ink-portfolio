// Extract chapters from the AO3-exported HTML of 罗曼史作为顿悟
// and write one markdown file per chapter.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SRC = '/Users/aki.x/Documents/个人写作/罗曼史作为顿悟.html';
const OUT_DIR = resolve('src/content/fiction/romance-as-enlightenment');

const html = readFileSync(SRC, 'utf8');

const chapterTitles = [
  { cn: '神话', en: 'Myth' },
  { cn: '秘密', en: 'Secret' },
  { cn: '乐园', en: 'Reverie' },
  { cn: '夜车', en: 'Night Train' },
  { cn: '晴日', en: 'Clear Day' },
];

// Grab everything between `<!--chapter content-->` and `<!--/chapter content-->`
// for each occurrence.
const chapterContentRegex = /<!--chapter content-->([\s\S]*?)<!--\/chapter content-->/g;

function htmlToMarkdown(chapterHtml) {
  // Remove outer <div class="userstuff"> wrapper if present
  let s = chapterHtml.trim().replace(/^<div[^>]*>/, '').replace(/<\/div>\s*$/, '');

  // --- Step 1: Extract <p align="center"> blocks and protect them with
  // sentinels so the paragraph-separator logic below doesn't touch them. ---
  const centerBlocks = [];
  s = s.replace(/<p\s+align="center">([\s\S]*?)<\/p>/g, (_, inner) => {
    // Keep <br> tags as literal HTML and trim lines so the resulting block
    // renders cleanly. Strip any stray tags inside (use \b so `<br>` is not
    // misread as `<b...>`).
    const cleaned = inner
      .replace(/<br\s*\/?>\s*/g, '<br>')
      .replace(/<\/?(?:em|strong|i|b|span|a)\b[^>]*>/g, '')
      .trim();
    centerBlocks.push(cleaned);
    return `___CENTER_${centerBlocks.length - 1}___`;
  });

  // --- Step 2: Process remaining HTML as normal markdown paragraphs. ---

  // <br /> inside paragraphs becomes markdown hard break
  s = s.replace(/<br\s*\/?>/g, '  \n');

  // Split at </p><p> boundaries (paragraph separators).
  // Also clean up when a </p> is immediately followed by a CENTER sentinel,
  // and when a CENTER sentinel is followed by <p>.
  s = s.replace(/<\/p>\s*<p[^>]*>/g, '\n\n');
  s = s.replace(/<\/p>\s*(___CENTER_\d+___)/g, '\n\n$1');
  s = s.replace(/(___CENTER_\d+___)\s*<p[^>]*>/g, '$1\n\n');

  // Remove leading <p...> and trailing </p>
  s = s.replace(/^\s*<p[^>]*>/, '').replace(/<\/p>\s*$/, '');

  // Strip remaining inline tags (keep their text). Use \b so `<br>` is not
  // misread as `<b...>`.
  s = s.replace(/<a [^>]*>([\s\S]*?)<\/a>/g, '$1');
  s = s.replace(/<\/?(?:em|strong|i|b|span)\b[^>]*>/g, '');

  // Decode common HTML entities
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // --- Step 3: Restore center blocks as raw HTML, with blank lines around
  // so markdown treats them as block-level HTML. ---
  centerBlocks.forEach((content, i) => {
    s = s.replace(`___CENTER_${i}___`, `<p class="center">${content}</p>`);
  });

  // --- Step 4: Batch normalisations requested by the author ---

  // 1. Replace Japanese-style corner brackets with Chinese curly double quotes.
  s = s.replace(/「/g, '\u201c').replace(/」/g, '\u201d');

  // 2. Remove spaces at the boundary between CJK characters and Latin/digits
  //    (both directions). Only collapses spaces/tabs, not newlines.
  const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\uff00-\\uffef';
  s = s.replace(new RegExp(`([${CJK}])[ \\t]+([A-Za-z0-9])`, 'g'), '$1$2');
  s = s.replace(new RegExp(`([A-Za-z0-9])[ \\t]+([${CJK}])`, 'g'), '$1$2');

  // Collapse 3+ blank lines into 2
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

const matches = [...html.matchAll(chapterContentRegex)];
if (matches.length !== 5) {
  console.error(`Expected 5 chapters, got ${matches.length}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

matches.forEach((m, i) => {
  const chapterNum = i + 1;
  const { cn, en } = chapterTitles[i];
  const content = htmlToMarkdown(m[1]);

  const frontmatter = [
    '---',
    `title: ${cn}`,
    `enTitle: ${en}`,
    `order: ${chapterNum}`,
    '---',
    '',
  ].join('\n');

  const file = `${OUT_DIR}/ch-${chapterNum}.md`;
  writeFileSync(file, frontmatter + content + '\n');
  console.log(`Wrote ${file} (${content.length} chars)`);
});
