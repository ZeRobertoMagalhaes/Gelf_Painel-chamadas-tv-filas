// Converte um Markdown em PDF (A4) usando o Chrome. Uso:
//   FERRAMENTAS=<pasta com node_modules> node md2pdf.mjs entrada.md saida.pdf "Título" [paisagem]
// Dependências (instaladas em FERRAMENTAS): playwright-core, marked. Chrome: CHROME_PATH ou o do Playwright.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const ferr = process.env.FERRAMENTAS || process.cwd();
const req = createRequire(path.join(ferr, 'x.js'));
const { chromium } = req('playwright-core');
const { marked } = req('marked');
const chrome = process.env.CHROME_PATH || chromium.executablePath();

const [, , entrada, saida, titulo, paisagem] = process.argv;
const css = `
@page { size: A4 ${paisagem === 'paisagem' ? 'landscape' : ''}; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1e293b; font-size: 10.5pt; line-height: 1.5; }
h1 { font-size: 21pt; color: #16294a; margin: 0 0 2px; }
h2 { font-size: 14pt; color: #16294a; margin: 18px 0 6px; border-bottom: 2px solid #f59e0b; padding-bottom: 3px; break-after: avoid; }
h1 + h2 { border: 0; color: #475569; font-size: 12.5pt; margin-top: 0; }
p, li { orphans: 3; widows: 3; }
a { color: #1e40af; text-decoration: none; }
code { background: #eef2ff; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9.5pt; }
tr { break-inside: avoid; }
th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
th { background: #eef2ff; color: #16294a; }
blockquote { border-left: 4px solid #f59e0b; margin: 8px 0; padding: 2px 12px; background: #fffbeb; }
`;
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo}</title><style>${css}</style></head><body>${marked.parse(fs.readFileSync(entrada, 'utf8'))}</body></html>`;
const f = saida + '.html';
fs.writeFileSync(f, html);
const b = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto('file://' + path.resolve(f));
await p.pdf({
  path: saida, format: 'A4', landscape: paisagem === 'paisagem', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>',
  footerTemplate: `<div style="font-size:8px;color:#64748b;width:100%;text-align:center">${titulo} — <span class="pageNumber"></span>/<span class="totalPages"></span></div>`,
  margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
});
await b.close();
fs.unlinkSync(f);
console.log('ok', saida);
