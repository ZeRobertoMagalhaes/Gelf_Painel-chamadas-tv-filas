// Gera os PDFs dos fluxos (docs/fluxos/pdf) a partir dos Markdown, com capturas e diagramas Mermaid. Uso:
//   FERRAMENTAS=<pasta com node_modules> node pdf-fluxos.mjs <raiz do projeto> [Bio|Filas]
// Dependências (em FERRAMENTAS): playwright-core, marked, mermaid. Chrome: CHROME_PATH ou o do Playwright.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const ferr = process.env.FERRAMENTAS || process.cwd();
const req = createRequire(path.join(ferr, 'x.js'));
const { chromium } = req('playwright-core');
const { marked } = req('marked');
const mermaidJs = path.join(ferr, 'node_modules/mermaid/dist/mermaid.min.js');
const chrome = process.env.CHROME_PATH || chromium.executablePath();

const R = process.argv[2];
const so = process.argv[3];
const D = path.join(R, 'docs/fluxos');
const hoje = new Date().toLocaleDateString('pt-BR');
const css = `
@page { size: A4; margin: 16mm 14mm 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1e293b; font-size: 10.5pt; line-height: 1.5; }
h1 { font-size: 20pt; color: #16294a; border-bottom: 3px solid #f59e0b; padding-bottom: 6px; margin: 0 0 12px; }
h2 { font-size: 14pt; color: #16294a; margin: 20px 0 6px; break-after: avoid; }
h3 { font-size: 11.5pt; color: #1e40af; margin: 16px 0 4px; break-after: avoid; }
p, li { orphans: 3; widows: 3; }
a { color: #1e40af; text-decoration: none; }
code { background: #eef2ff; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9.5pt; break-inside: avoid; }
th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; vertical-align: top; }
th { background: #eef2ff; color: #16294a; }
blockquote { border-left: 4px solid #f59e0b; margin: 8px 0; padding: 2px 12px; background: #fffbeb; }
p:has(> img) { text-align: center; margin: 8px 0 12px; break-inside: avoid; }
img { max-width: 100%; max-height: 120mm; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
pre.mermaid { text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; break-inside: avoid; margin: 10px 0; }
pre.mermaid svg { max-width: 100%; max-height: 190mm; height: auto; }
section.doc { break-before: page; }
section.doc:first-of-type { break-before: auto; }
.capa { text-align: center; padding-top: 70mm; break-after: page; }
.capa h1 { border: 0; font-size: 28pt; }
.capa p { font-size: 12pt; color: #475569; }
.capa .marca { color: #f59e0b; font-weight: 700; letter-spacing: 2px; }
`;

function md2html(arquivo) {
  let s = fs.readFileSync(path.join(D, arquivo), 'utf8');
  s = s.replace(/^Anterior:.*$|^Próximo:.*$/gm, '').replace(/\n{3,}/g, '\n\n');
  const mer = [];
  s = s.replace(/```mermaid\n([\s\S]*?)```/g, (_, c) => { mer.push(c); return `@@MER${mer.length - 1}@@`; });
  let h = marked.parse(s);
  h = h.replace(/@@MER(\d+)@@/g, (_, i) => `<pre class="mermaid">${mer[i].replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`);
  h = h.replace(/<p><pre/g, '<pre').replace(/<\/pre><\/p>/g, '</pre>');
  h = h.replace(/src="img\//g, `src="file://${D}/img/`);
  h = h.replace(/<a href="(?!http)[^"]*">(.*?)<\/a>/g, '$1'); // links entre documentos viram texto
  return `<section class="doc">${h}</section>`;
}

const todos = [
  { saida: 'Fluxos-Filas-por-Tratamento.pdf', chave: 'Filas', titulo: 'Fluxos das Filas por Tratamento', sub: 'Abertura do dia · Recepção · Atendimento · Painel da TV', docs: ['1-abertura.md', '2-recepcao.md', '3-atendimento.md', '4-painel.md'] },
  { saida: 'Fluxo-Cura-Mediunica-Bio.pdf', chave: 'Bio', titulo: 'Fluxo da Cura Mediúnica (Bio)', sub: 'Processo oficial, rota de etapas, prontuário, painel da TV e relatório', docs: ['fluxo-operacional-bio.md', '5-bio.md'] },
];
const conjuntos = so ? todos.filter((c) => c.chave === so) : todos;
fs.mkdirSync(path.join(D, 'pdf'), { recursive: true });
const b = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox', '--allow-file-access-from-files'] });
for (const c of conjuntos) {
  const corpo = c.docs.map(md2html).join('\n');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${c.titulo}</title><style>${css}</style></head><body>
  <div class="capa"><p class="marca">GELF APOMETRIA CAMPINAS</p><h1>${c.titulo}</h1><p>${c.sub}</p><p>Telas e transições · ${hoje}</p></div>${corpo}</body></html>`;
  const f = path.join(D, 'pdf', '_tmp.html');
  fs.writeFileSync(f, html);
  const p = await b.newPage();
  p.on('console', (m) => console.log('página:', m.text().slice(0, 300)));
  await p.goto('file://' + f);
  await p.addScriptTag({ path: mermaidJs });
  await p.evaluate(async () => {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
    for (const [i, el] of [...document.querySelectorAll('pre.mermaid')].entries()) {
      try { await mermaid.run({ nodes: [el] }); } catch (e) { console.log('ERRO no diagrama', i, String(e.message || e).slice(0, 200)); el.remove(); }
    }
  });
  await p.waitForFunction(() => [...document.images].every((i) => i.complete));
  await p.pdf({
    path: path.join(D, 'pdf', c.saida), format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>',
    footerTemplate: `<div style="font-size:8px;color:#64748b;width:100%;text-align:center">${c.titulo} — <span class="pageNumber"></span>/<span class="totalPages"></span></div>`,
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
  });
  console.log('ok', c.saida);
  await p.close();
  fs.unlinkSync(f);
}
await b.close();
