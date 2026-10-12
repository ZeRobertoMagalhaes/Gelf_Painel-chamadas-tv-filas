const qrcode = require('qrcode-generator');

// Página inicial (/): links para todas as telas e QR code do endereço atual do
// sistema. É gerada a cada acesso, então o QR acompanha uma eventual mudança de
// IP do computador; quem abre a página por qualquer endereço chega às telas
// por links relativos.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function qrSvg(texto) {
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: `QR code de ${texto}`, title: texto });
}

const BIO = [
    ['/bio/recepcao', 'Recepção', 'Cadastro dos pacientes'],
    ['/controle', 'Controle', 'Chamar, concluir, prontuário'],
    ['/bio/painel', 'Painel da TV', 'Chamadas na TV'],
];
const FILAS = [
    ['/recepcao', 'Recepção', 'Cadastro e filas'],
    ['/atendimento', 'Atendimento', 'Equipes, no celular'],
    ['/painel', 'Painel da TV', 'Chamadas na TV'],
];

const links = (lista) =>
    lista.map(([href, titulo, dica]) => `<a class="tela" href="${esc(href)}"><strong>${esc(titulo)}</strong><span>${esc(dica)}</span></a>`).join('');

function renderizarInicio({ porta, nomeMdns, ips }) {
    const nome = `http://${nomeMdns}:${porta}/`;
    const enderecos = ips.length
        ? ips
              .map((ip) => {
                  const url = `http://${ip}:${porta}/`;
                  return `<div class="end"><div class="qr">${qrSvg(url)}</div><div><code>${esc(url)}</code><p>Aponte a câmera do celular para abrir esta página.</p></div></div>`;
              })
              .join('')
        : '<p class="aviso">Nenhuma rede detectada neste computador. Conecte-o ao Wi-Fi ou ao cabo de rede.</p>';
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#16294a">
<title>Painel GELF - Início</title>
<style>
:root { --azul: #16294a; --azul2: #1e40af; --ouro: #f59e0b; --fundo: #f4f7fc; --texto: #1e293b; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Helvetica Neue", Arial, sans-serif; background: var(--fundo); color: var(--texto); }
header { background: var(--azul); color: #fff; padding: 22px 16px 18px; border-bottom: 4px solid var(--ouro); }
header h1 { margin: 0; font-size: 1.5rem; }
header p { margin: 4px 0 0; color: #cbd5f5; }
main { max-width: 860px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
section { background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, .07); }
h2 { margin: 0 0 10px; font-size: 1.1rem; color: var(--azul); }
.telas { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
a.tela { display: flex; flex-direction: column; gap: 2px; padding: 14px; border-radius: 12px; border: 2px solid var(--azul2); color: var(--azul); text-decoration: none; background: #eff6ff; }
a.tela:hover, a.tela:focus-visible { background: var(--azul2); color: #fff; }
a.tela strong { font-size: 1.05rem; }
a.tela span { font-size: .85rem; opacity: .85; }
.end { display: flex; gap: 14px; align-items: center; margin-top: 12px; }
.qr { width: 150px; flex: none; }
.qr svg { width: 100%; height: auto; display: block; border: 1px solid #cbd5e1; border-radius: 8px; }
code { background: #eef2ff; padding: 2px 6px; border-radius: 4px; word-break: break-all; }
p { margin: 6px 0; }
.dica { color: #475569; font-size: .92rem; }
.aviso { background: #fffbeb; border-left: 4px solid var(--ouro); padding: 8px 12px; }
</style>
</head>
<body>
<header><h1>Painel GELF</h1><p>Escolha a tela que você vai usar</p></header>
<main>
<section><h2>Cura Mediúnica (Bio)</h2><div class="telas">${links(BIO)}</div></section>
<section><h2>Filas por tratamento</h2><div class="telas">${links(FILAS)}</div></section>
<section>
<h2>Endereço deste sistema</h2>
<p>Pelo nome (acompanha mudanças de IP): <code>${esc(nome)}</code></p>
<p class="dica">Salve nos favoritos o endereço com o nome. Se ele não abrir no seu aparelho (acontece em alguns Android e em redes de visitantes), use o endereço numérico abaixo ou o QR code.</p>
${enderecos}
<p class="dica">O endereço numérico muda se o roteador trocar o IP deste computador. Para fixá-lo, reserve o IP do computador no roteador.</p>
</section>
</main>
</body>
</html>`;
}

// Endereços para mostrar na página: só placas reais (Wi-Fi/cabo), sem redes
// virtuais (Docker, WSL, VPN, máquinas virtuais), da faixa doméstica mais
// provável (192.168.x) para a menos provável, no máximo 3.
const VIRTUAIS = /docker|^br-|veth|virbr|vmnet|vboxnet|vethernet|wsl|hyper-v|tailscale|zerotier|^zt|^tun|^tap|loopback/i;
const faixa = (ip) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : 2);

function enderecosParaExibir(interfaces) {
    const ips = [];
    for (const [nome, lista] of Object.entries(interfaces)) {
        if (VIRTUAIS.test(nome)) continue;
        for (const e of lista || []) {
            if (e.family === 'IPv4' && !e.internal && !e.address.startsWith('169.254.')) ips.push(e.address);
        }
    }
    return [...new Set(ips)].sort((a, b) => faixa(a) - faixa(b)).slice(0, 3);
}

module.exports = { renderizarInicio, enderecosParaExibir };
