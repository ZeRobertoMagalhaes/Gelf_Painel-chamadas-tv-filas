// Grava o vídeo de demonstração (Evangelho Terapia) com narração, usando o sistema de verdade.
// Sobe uma CÓPIA do sistema em pasta temporária (nada é gravado em dados/), com pacientes fictícios,
// abre o Chrome, executa as cenas (clicando e digitando como uma pessoa) e junta tela + voz num MP4.
//
// Uso (na raiz do projeto):
//   CHROME_PATH=/usr/bin/google-chrome FFMPEG=<ffmpeg> PIPER_PY=<python do piper> PIPER_MODELO=<voz.onnx> \
//     node docs/pacote/ferramentas/video-demo.mjs [saida.mp4]
// Requer: Node 22+ (WebSocket nativo), Chrome, ffmpeg e Piper (voz pt-BR; pip install piper-tts).
// MODO=celular: grava só a tela do celular da equipe (vertical, 720x1280), sem Recepção nem TV.
// Variável opcional PASTA_TRABALHO: onde ficam os quadros e áudios (padrão: pasta temporária).
import { createRequire } from 'module';
import { spawn, execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MODO = process.env.MODO === 'celular' ? 'celular' : 'completo';
const LARG = MODO === 'celular' ? 720 : 1280;
const ALT = MODO === 'celular' ? 1280 : 720;
const NOME_PADRAO = MODO === 'celular' ? 'Demo-Celular-da-Equipe-Evangelho-Terapia.mp4' : 'Demo-Painel-Gelf-Evangelho-Terapia.mp4';
const SAIDA = path.resolve(process.argv[2] || path.join(RAIZ, 'dist', NOME_PADRAO));
const CHROME = process.env.CHROME_PATH || 'google-chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const PIPER_PY = process.env.PIPER_PY;
const PIPER_MODELO = process.env.PIPER_MODELO;
// Outra voz: VOZ_SCRIPT = script Python que lê o texto da entrada padrão e grava um WAV 16 bits mono no caminho recebido.
const VOZ_SCRIPT = process.env.VOZ_SCRIPT;
if (!PIPER_PY || (!PIPER_MODELO && !VOZ_SCRIPT)) throw new Error('Defina PIPER_PY (python com piper-tts) e PIPER_MODELO (arquivo .onnx da voz), ou VOZ_SCRIPT.');
const PORTA = 3936;
const DEBUG = 9336;
const URL_BASE = `http://localhost:${PORTA}`;
const IP_SERVIDOR = '192.168.0.192';
const { io } = createRequire(path.join(RAIZ, 'package.json'))('socket.io-client');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const agora = () => performance.now();

// ---------------------------------------------------------------- pasta de trabalho e sistema temporário
const tmp = process.env.PASTA_TRABALHO ? path.resolve(process.env.PASTA_TRABALHO) : fs.mkdtempSync(path.join(os.tmpdir(), 'gelf-demo-'));
const sistema = path.join(tmp, 'sistema');
fs.rmSync(sistema, { recursive: true, force: true });
fs.mkdirSync(path.join(tmp, 'cenas'), { recursive: true });
for (const d of ['server', 'public', 'config']) fs.cpSync(path.join(RAIZ, d), path.join(sistema, d), { recursive: true });
fs.copyFileSync(path.join(RAIZ, 'package.json'), path.join(sistema, 'package.json'));
fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(sistema, 'node_modules'));
fs.mkdirSync(path.join(sistema, 'dados'));
// Como se a recepção já tivesse aberto o dia anterior com Reiki em dois: o sistema lembra o último limite usado.
if (process.env.MODO !== 'celular') fs.writeFileSync(path.join(sistema, 'dados', 'limites-padrao.json'), JSON.stringify({ reiki: 2 }));

// Só na cópia: o servidor da demo não anuncia o nome na rede e finge ter o IP do servidor real.
const indexCopia = path.join(sistema, 'server', 'index.js');
let codigo = fs.readFileSync(indexCopia, 'utf8');
for (const [de, para] of [
  ['function iniciarRespondedorMdns() {', 'function iniciarRespondedorMdns() { return;'],
  ['ipServidor: config.rede.ipServidor }', `ipServidor: config.rede.ipServidor, interfaces: () => ({ Ethernet: [{ family: 'IPv4', address: '${IP_SERVIDOR}', internal: false }] }) }`],
]) {
  if (!codigo.includes(de)) throw new Error(`server/index.js mudou: não achei "${de}"`);
  codigo = codigo.replace(de, para);
}
fs.writeFileSync(indexCopia, codigo);

// Páginas auxiliares da demo (só na cópia): cartão de título e "palco" com celular + TV lado a lado.
const demoDir = path.join(sistema, 'public', '_demo');
fs.mkdirSync(demoDir);
const base = `html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:linear-gradient(135deg,#0f1b33,#16294a);font-family:"Helvetica Neue",Arial,sans-serif}`;
fs.writeFileSync(path.join(demoDir, 'titulo.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Demo</title><style>${base}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;gap:18px;border-bottom:8px solid #f59e0b;box-sizing:border-box}
h1{margin:0;font-size:60px;letter-spacing:1px}h2{margin:0;font-size:32px;color:#f59e0b;font-weight:600}p{margin:0;font-size:22px;color:#cbd5f5}</style>
<body><h1 id="t"></h1><h2 id="s"></h2><p id="p"></p>
<script>const q=new URLSearchParams(location.search);t.textContent=q.get('t')||'';s.textContent=q.get('s')||'';p.textContent=q.get('p')||'';</script></body></html>`);
fs.writeFileSync(path.join(demoDir, 'palco.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Palco</title><style>${base}
.cena{display:flex;gap:36px;align-items:center;justify-content:center;height:720px}
.col{display:flex;flex-direction:column;align-items:center;gap:10px}
.rot{font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#cbd5f5;opacity:.85}
.cel{width:360px;height:640px;border:9px solid #05070d;border-radius:36px;overflow:hidden;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.5)}
.cel iframe{width:360px;height:640px;border:0;display:block}
.tv{width:768px;height:432px;border:8px solid #05070d;border-radius:8px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5);background:#000}
.tv iframe{width:1280px;height:720px;border:0;transform:scale(.6);transform-origin:0 0}</style>
<body><div class="cena">
<div class="col"><div class="rot">Celular da equipe</div><div class="cel"><iframe id="cel" src="/atendimento"></iframe></div></div>
<div class="col"><div class="rot">TV do painel</div><div class="tv"><iframe id="tv" src="/painel"></iframe></div></div>
</div></body></html>`);

const servidor = spawn(process.execPath, ['server/index.js'], { cwd: sistema, env: { ...process.env, PORT: String(PORTA) }, stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${path.join(tmp, 'perfil')}`, 'about:blank'], { stdio: 'ignore' });
function encerrar() {
  servidor.kill();
  chrome.kill();
}
process.on('exit', encerrar);
await esperar(3000);

// ---------------------------------------------------------------- Chrome (CDP)
const alvo = (await (await fetch(`http://localhost:${DEBUG}/json`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pend = {};
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  pend[d.id]?.(d.result);
};
const cdp = (method, params = {}) => new Promise((r) => { pend[++seq] = r; ws.send(JSON.stringify({ id: seq, method, params })); });
const js = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
if (MODO === 'celular') await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
else await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await cdp('Page.enable'); // sem isto o Chrome não injeta o script das "mãos" nas páginas novas

// "Mãos" da demo: cursor visível, clique e digitação com ritmo humano. Vale na página de topo e, por ela, nos iframes (mesma origem).
await cdp('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => {
  if (window.top !== window) return;
  const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
  let cur;
  const cursor = () => {
    if (cur && cur.isConnected) return cur;
    cur = document.createElement('div');
    cur.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:26px;height:26px;border-radius:50%;background:rgba(245,158,11,.6);border:3px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.3);left:50%;top:96%;transform:translate(-50%,-50%) scale(1);transition:left .7s ease,top .7s ease,transform .15s ease';
    document.documentElement.appendChild(cur);
    return cur;
  };
  const doc = (f) => (f ? document.getElementById(f).contentDocument : document);
  const achar = (f, sel, texto, filho) => {
    const lista = [...doc(f).querySelectorAll(sel)];
    const el = texto ? lista.find((e) => e.textContent.trim().includes(texto)) : lista[0];
    return el && filho ? el.querySelector(filho) : el;
  };
  const ponto = (f, el) => {
    const r = el.getBoundingClientRect();
    let x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (f) { const fr = document.getElementById(f), b = fr.getBoundingClientRect(), k = b.width / fr.offsetWidth; x = b.left + x * k; y = b.top + y * k; }
    return { x, y };
  };
  const ir = async (f, el) => {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await dorme(700);
    const p = ponto(f, el), c = cursor();
    c.style.left = p.x + 'px'; c.style.top = p.y + 'px';
    await dorme(800);
  };
  window.__demo = {
    async clicar(f, sel, texto, filho) {
      const el = achar(f, sel, texto, filho);
      if (!el) return false;
      await ir(f, el);
      const c = cursor();
      c.style.transform = 'translate(-50%,-50%) scale(.6)';
      await dorme(170);
      el.click();
      c.style.transform = 'translate(-50%,-50%) scale(1)';
      await dorme(300);
      return true;
    },
    async digitar(f, sel, valor, texto, filho) {
      const el = achar(f, sel, texto, filho);
      if (!el) return false;
      await ir(f, el);
      el.focus();
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      for (let i = 1; i <= valor.length; i++) {
        el.value = valor.slice(0, i);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await dorme(75);
      }
      return true;
    },
    async rolar(f, sel, texto) {
      const el = achar(f, sel, texto);
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await dorme(1000);
      return true;
    },
    async destacar(f, sel, ms) {
      const el = achar(f, sel);
      if (!el) return false;
      const antes = el.style.cssText;
      el.style.cssText += ';outline:3px solid #f59e0b;outline-offset:4px;border-radius:6px';
      await dorme(ms);
      el.style.cssText = antes;
      return true;
    },
    ler: (f, sel) => { const el = achar(f, sel); return el ? (el.value ?? el.textContent) : null; },
  };
})();`,
});

const q = (v) => JSON.stringify(v);
// As ações falham alto: se o elemento não existir, a gravação para em vez de sair um vídeo sem a ação.
const exigir = async (descricao, promessa) => {
  if ((await promessa) !== true) throw new Error(`A demo não conseguiu: ${descricao}`);
};
const clicar = (sel, texto = null, { frame = null, filho = null } = {}) =>
  exigir(`clicar em ${sel} ${texto ?? ''}`, js(`__demo.clicar(${q(frame)}, ${q(sel)}, ${q(texto)}, ${q(filho)})`));
const digitar = (sel, valor, { frame = null, texto = null, filho = null } = {}) =>
  exigir(`digitar em ${sel} ${texto ?? ''}`, js(`__demo.digitar(${q(frame)}, ${q(sel)}, ${q(valor)}, ${q(texto)}, ${q(filho)})`));
const destacar = (sel, ms = 3500, frame = null) => exigir(`destacar ${sel}`, js(`__demo.destacar(${q(frame)}, ${q(sel)}, ${ms})`));
const rolar = (sel, texto = null, frame = null) => exigir(`rolar até ${sel}`, js(`__demo.rolar(${q(frame)}, ${q(sel)}, ${q(texto)})`));
const cel = (acao) => ({ frame: 'cel', ...acao });

async function ir(caminho) {
  await cdp('Page.navigate', { url: URL_BASE + caminho });
  await esperar(2200);
}
const titulo = (t, s, p = '') => `/_demo/titulo.html?t=${encodeURIComponent(t)}&s=${encodeURIComponent(s)}&p=${encodeURIComponent(p)}`;

// ---------------------------------------------------------------- dados no servidor
function conectar() {
  const s = io(URL_BASE);
  const est = { v: null };
  s.on('estado', (e) => (est.v = e));
  return new Promise((r) => s.once('connect', () => setTimeout(() => r({ s, est }), 300)));
}
const filas = await conectar();
const agir = (tipo, payload = {}) => new Promise((r) => filas.s.emit('acao', tipo, payload, (x) => setTimeout(() => r(x), 80)));

// Esconde, dentro do iframe da TV, o botão de ativar som (a demo não grava áudio da TV).
const prepararPalco = async () => {
  await ir('/_demo/palco.html');
  await js(`(() => { const c = document.getElementById('cel').contentWindow; c.localStorage.clear(); c.location.reload(); })()`);
  await esperar(2000);
  await js(`(() => { const d = document.getElementById('tv').contentDocument; const s = d.createElement('style'); s.textContent = '.btn-som{display:none!important}'; d.head.appendChild(s); })()`);
};

// ---------------------------------------------------------------- roteiro: o que se diz e o que se faz, passo a passo
// Cada passo fala uma frase e executa a ação ao mesmo tempo; o passo dura o que for maior (fala ou ação).
const cenasCompleto = [
  {
    id: 'abertura',
    preparar: () => ir(titulo('Painel Gelf', 'Demonstração: Evangelho Terapia', 'Chamadas por painel de TV')),
    passos: [
      {
        fala: 'Bem-vindo à demonstração do Painel Guélf, o sistema de chamadas por painel de televisão do Evangelho Terapia. Nos próximos minutos, vamos acompanhar um dia de atendimento, da abertura ao relatório final.',
      },
    ],
  },
  {
    id: 'inicio',
    preparar: () => ir('/'),
    passos: [
      { fala: 'Ao ligar o sistema, abre a página inicial. A seção Tratamentos, Evangelho Terapia, aparece em primeiro lugar, com os atalhos de todas as telas.' },
      { fala: 'Logo abaixo, dois códigos QR abrem a tela de Atendimento no celular: um pelo nome do sistema na rede, e outro pelo endereço do computador servidor. Basta apontar a câmera do celular.' },
    ],
  },
  {
    id: 'dia-fechado',
    preparar: () => ir('/recepcao'),
    passos: [
      {
        fala: 'Na Recepção, o dia começa fechado. Vamos tentar cadastrar um paciente nessa situação.',
        fazer: async () => {
          await digitar('#nome', 'Maria Souza');
          await clicar('button.chip-trat', 'Reiki');
        },
      },
      {
        fala: 'O sistema recusa, e mostra uma mensagem de erro: é preciso abrir o atendimento antes.',
        fazer: async () => {
          await clicar('button.btn-call', 'Cadastrar');
          await destacar('.send-feedback', 3500);
        },
      },
    ],
  },
  {
    id: 'abertura-do-dia',
    preparar: () => ir('/recepcao'),
    passos: [
      {
        fala: 'Para abrir o dia, a Recepção define, para cada tratamento, quantos pacientes podem ser chamados ao mesmo tempo para as salas.',
        fazer: () => rolar('.limites'),
      },
      {
        fala: 'Os valores já vêm preenchidos com os do último dia de atendimento: aqui, o Reiki com dois, e os outros com um. O sistema lembra o último valor usado, e a Recepção só altera o que mudou. Na primeira vez, o padrão é um.',
        fazer: () => destacar('.limites', 5000),
      },
      { fala: 'Em seguida, toca em Abrir atendimento. A partir de agora, o cadastro e as chamadas estão liberados.', fazer: () => clicar('button.btn-mini', 'Abrir atendimento') },
    ],
  },
  {
    id: 'cadastro',
    passos: [
      {
        fala: 'O cadastro é feito em um único campo, com nome e sobrenome. Vamos cadastrar Maria Souza e João Pereira, no Reiki, e Ana Paula Lima, no Apométrico.',
        fazer: async () => {
          for (const [nome, trat] of [['Maria Souza', 'Reiki'], ['João Pereira', 'Reiki'], ['Ana Paula Lima', 'Apométrico']]) {
            await digitar('#nome', nome);
            await clicar('button.chip-trat', trat);
            await clicar('button.btn-call', 'Cadastrar');
          }
          await agir('cadastrar', { nome: 'Beatriz Alves Costa', tratamento: 'reiki' });
        },
      },
      {
        fala: 'O João Pereira precisa de prioridade. Com a estrela, ele passa para o início da fila do Reiki.',
        fazer: async () => {
          await clicar('.cartao-paciente', 'João', { filho: 'button.icone' });
          await esperar(1800);
        },
      },
    ],
  },
  {
    id: 'celular-chamar',
    preparar: prepararPalco,
    passos: [
      {
        fala: 'Agora, no celular da equipe. Na primeira vez, a pessoa escolhe o tratamento, e o aparelho lembra.',
        fazer: () => clicar('button.trat-botao', 'Reiki', cel({})),
      },
      {
        fala: 'Repare que o próximo da fila, o João, é prioritário. Por isso, a Sala Prioritários, Térreo, já vem selecionada, sem precisar digitar.',
        fazer: () => rolar('.bloco-chamar', null, 'cel'),
      },
      {
        fala: 'Ao tocar em Chamar próximo, a televisão mostra o nome e a sala, para o paciente se dirigir ao local.',
        fazer: async () => {
          await clicar('.bloco-chamar .btn-call', 'Chamar próximo', cel({}));
          await esperar(3500);
        },
      },
    ],
  },
  {
    id: 'limite',
    passos: [
      {
        fala: 'O paciente aparece como chamado. A equipe toca em Iniciar atendimento quando ele chegar à sala.',
        fazer: () => clicar('button.btn-call', 'Iniciar atendimento', cel({})),
      },
      {
        fala: 'Agora a fila tem a Maria e a Beatriz. Para chamar alguém fora da ordem, basta tocar no nome do paciente na fila de espera. Vamos escolher a Beatriz, que está em segundo lugar.',
        fazer: async () => {
          await rolar('.fila-lista', null, 'cel');
          await clicar('button.fila-item', 'Beatriz', cel({}));
        },
      },
      {
        fala: 'O botão passa a mostrar Chamar Beatriz, e como o tratamento é o Reiki, a Sala Reiki já vem selecionada. Para desistir, é só tocar em Voltar ao próximo da fila.',
        fazer: async () => {
          await rolar('.bloco-chamar', null, 'cel');
          await destacar('.bloco-chamar .link-claro', 2500, 'cel');
        },
      },
      {
        fala: 'Chamamos a Beatriz. Os dois lugares do Reiki ficam ocupados, e a Maria continua esperando, na mesma posição da fila.',
        fazer: async () => {
          await clicar('.bloco-chamar .btn-call', 'Chamar', cel({}));
          await esperar(2500);
        },
      },
      {
        fala: 'Como o limite é de dois, o sistema avisa, e não permite chamar mais ninguém, até que um atendimento termine.',
        fazer: () => rolar('.faixa-aviso', null, 'cel'),
      },
    ],
  },
  {
    id: 'concluir',
    passos: [
      {
        fala: 'Quando o João termina, a equipe toca em Concluir atendimento. A vaga é liberada, e o botão de chamar volta a aparecer.',
        fazer: async () => {
          await clicar('button.btn-call', 'Concluir atendimento', cel({}));
          await rolar('.bloco-chamar', null, 'cel');
        },
      },
    ],
  },
  {
    id: 'outro-tratamento',
    passos: [
      {
        fala: 'Tratamentos diferentes não se bloqueiam. O limite vale só para cada tratamento. Enquanto a Beatriz está na sala do Reiki, a equipe do Apométrico, com o seu próprio celular, trabalha normalmente.',
        // Outro aparelho: a memória do celular é apagada, como se fosse o celular de outra equipe.
        fazer: async () => {
          await js(`(() => { document.querySelector('.rot').textContent = 'Celular da equipe do Apométrico'; const c = document.getElementById('cel').contentWindow; c.localStorage.clear(); c.location.reload(); })()`);
          await esperar(2500);
        },
      },
      {
        fala: 'Essa equipe escolhe o Apométrico, escolhe a sala, e chama a Ana. A televisão mostra a Ana, e a Beatriz continua na sala do Reiki. O aviso amarelo é o limite do próprio Apométrico, de um paciente, e não depende do Reiki. Cada equipe segue o seu atendimento, sem interferir nas outras.',
        fazer: async () => {
          await clicar('button.trat-botao', 'Apométrico', cel({}));
          await clicar('button.room-chip', '2', cel({}));
          await clicar('.bloco-chamar .btn-call', 'Chamar próximo', cel({}));
          await esperar(3500);
          await rolar('.faixa-aviso', null, 'cel');
        },
      },
    ],
  },
  {
    id: 'recepcao-relatorio',
    preparar: () => ir('/recepcao'),
    passos: [
      { fala: 'De volta à Recepção, a tela mostra as filas, e quem está em atendimento em cada tratamento, em tempo real.', fazer: () => esperar(1500) },
      {
        fala: 'Ao longo do dia, o relatório mostra os números por tratamento e o registro de cada paciente. Ao salvar em PDF, o sistema sugere o nome com a data e a hora, e baixa também um arquivo JSON com os mesmos dados.',
        fazer: async () => {
          await js(`location.href = '/relatorio'`);
          await esperar(2500);
        },
      },
      {
        fala: 'Para encerrar, toca em Fechar atendimento. O sistema pergunta se o relatório de atendimentos do dia já foi gerado. Se a resposta for não, o fechamento é cancelado, e o atendimento continua aberto.',
        fazer: async () => {
          await js(`location.href = '/recepcao'`);
          await esperar(2200);
          await clicar('button.btn-mini', 'Fechar atendimento');
          await esperar(1500);
          await rolar('.pergunta-relatorio');
          await destacar('.pergunta-relatorio', 2500);
          await clicar('button.btn-mini', 'Não, cancelar');
          await destacar('.estado-dica[role=status]', 2500);
        },
      },
      {
        fala: 'Com o relatório já gerado, a resposta é sim, e a Recepção confirma. Por privacidade, as filas e os nomes são apagados, e só o relatório, sem nomes, fica guardado.',
        fazer: async () => {
          await clicar('button.btn-mini', 'Fechar atendimento');
          await esperar(800);
          await clicar('button.btn-mini', 'Sim, já gerei');
          await esperar(1000);
          await clicar('button.btn-mini', 'Confirmar: apagar tudo');
          await esperar(1500);
        },
      },
    ],
  },
  {
    id: 'encerramento',
    preparar: () => ir(titulo('Painel Gelf', 'Obrigado pela atenção', 'Evangelho Terapia')),
    passos: [
      {
        fala: 'Esta foi a demonstração do Painel Guélf para o Evangelho Terapia: limite de pacientes por tratamento, lembrado de um dia para o outro, chamada de qualquer paciente da fila, equipes de tratamentos diferentes trabalhando sem se bloquear, salas já selecionadas, aviso com o dia fechado, o relatório do dia, e a pergunta antes de fechar o atendimento. Obrigado pela atenção.',
      },
    ],
  },
];

// ---------------------------------------------------------------- roteiro só do celular da equipe (MODO=celular)
// Os dados do dia (pacientes e limites) são preparados fora da tela, como se a Recepção já tivesse feito o seu trabalho.
const prepararDia = async () => {
  await agir('abrirAtendimento', { limites: { reiki: 2 } });
  for (const [nome, tratamento] of [['Maria Souza', 'Reiki'], ['João Pereira', 'Reiki'], ['Beatriz Alves Costa', 'Reiki'], ['Ana Paula Lima', 'Apométrico']]) {
    await agir('cadastrar', { nome, tratamento: tratamento === 'Reiki' ? 'reiki' : 'apometrico' });
  }
  const joao = filas.est.v.pacientes.find((x) => x.nomeExibicao.startsWith('João'));
  await agir('priorizar', { id: joao.id });
};
const celularLimpo = async () => {
  await ir('/atendimento');
  await js(`localStorage.clear(); location.reload()`);
  await esperar(2200);
};
const cenasCelular = [
  {
    id: 'celular-escolher',
    preparar: async () => {
      await prepararDia();
      await celularLimpo();
    },
    passos: [
      {
        fala: 'Este vídeo mostra apenas a tela do celular da equipe, a página de Atendimento do Evangelho Terapia. Na primeira vez, a pessoa escolhe o tratamento, e o aparelho lembra.',
        fazer: () => clicar('button.trat-botao', 'Reiki'),
      },
      {
        fala: 'No topo, aparecem quantos pacientes aguardam, e quantos estão em sala, dentro do limite do tratamento. O próximo da fila, o João, é prioritário. Por isso, a Sala Prioritários, Térreo, já vem selecionada.',
        fazer: () => rolar('.bloco-chamar'),
      },
    ],
  },
  {
    id: 'celular-chamar',
    passos: [
      {
        fala: 'Ao tocar em Chamar próximo, o paciente é chamado, e a televisão do painel mostra o nome e a sala.',
        fazer: async () => {
          await clicar('.bloco-chamar .btn-call', 'Chamar próximo');
          await esperar(2500);
        },
      },
      {
        fala: 'Quando ele chegar à sala, a equipe toca em Iniciar atendimento.',
        fazer: () => clicar('button.btn-call', 'Iniciar atendimento'),
      },
    ],
  },
  {
    id: 'celular-fora-da-ordem',
    passos: [
      {
        fala: 'Agora a fila tem a Maria e a Beatriz. Para chamar alguém fora da ordem, basta tocar no nome do paciente na fila de espera. Vamos escolher a Beatriz, que está em segundo lugar.',
        fazer: async () => {
          await rolar('.fila-lista');
          await clicar('button.fila-item', 'Beatriz');
        },
      },
      {
        fala: 'O botão passa a mostrar Chamar Beatriz, e como o tratamento é o Reiki, a Sala Reiki já vem selecionada. Para desistir, é só tocar em Voltar ao próximo da fila.',
        fazer: async () => {
          await rolar('.bloco-chamar');
          await destacar('.bloco-chamar .link-claro', 2500);
        },
      },
      {
        fala: 'Chamamos a Beatriz. Os dois lugares do Reiki ficam ocupados, e a Maria continua esperando, na mesma posição da fila.',
        fazer: async () => {
          await clicar('.bloco-chamar .btn-call', 'Chamar');
          await esperar(2500);
        },
      },
      {
        fala: 'Como o limite é de dois, o sistema avisa, e não permite chamar mais ninguém, até que um atendimento termine.',
        fazer: () => rolar('.faixa-aviso'),
      },
    ],
  },
  {
    id: 'celular-concluir',
    passos: [
      {
        fala: 'Quando o João termina, a equipe toca em Concluir atendimento. A vaga é liberada, e o botão de chamar volta a aparecer.',
        fazer: async () => {
          await clicar('button.btn-call', 'Concluir atendimento');
          await rolar('.bloco-chamar');
        },
      },
      {
        fala: 'Se o paciente chamado não aparece, a equipe toca em Chamar novamente e, se ainda assim ele não vier, em Não compareceu, com um segundo toque para confirmar.',
        fazer: () => rolar('.acoes-secundarias'),
      },
    ],
  },
  {
    id: 'celular-outra-equipe',
    preparar: celularLimpo,
    passos: [
      {
        fala: 'Tratamentos diferentes não se bloqueiam. Agora, o celular de outra equipe, a do Apométrico, que escolhe o seu tratamento.',
        fazer: () => clicar('button.trat-botao', 'Apométrico'),
      },
      {
        fala: 'Essa equipe escolhe a sala, e chama a Ana, sem nenhum bloqueio, mesmo com o Reiki ocupado. Cada equipe segue o seu atendimento, sem interferir nas outras.',
        fazer: async () => {
          await clicar('button.room-chip', '2');
          await clicar('.bloco-chamar .btn-call', 'Chamar próximo');
          await esperar(3000);
        },
      },
      {
        fala: 'Esse foi o passo a passo do celular da equipe. Obrigada pela atenção.',
        fazer: () => esperar(500),
      },
    ],
  },
];

const cenas = MODO === 'celular' ? cenasCelular : cenasCompleto;

// ---------------------------------------------------------------- voz (Piper, local) e vídeo (ffmpeg)
const VOZ = ['--length-scale', '1.2', '--noise-scale', '0.5', '--noise-w', '0.55', '--sentence-silence', '0.6'];
function falar(texto, arquivo) {
  const args = VOZ_SCRIPT ? [VOZ_SCRIPT, arquivo] : ['-m', 'piper', '-m', PIPER_MODELO, '-f', arquivo, ...VOZ];
  execFileSync(PIPER_PY, args, { input: texto, stdio: ['pipe', 'ignore', 'ignore'] });
  const taxa = fs.readFileSync(arquivo).readUInt32LE(24); // WAV 16 bits mono
  return (fs.statSync(arquivo).size - 44) / (taxa * 2);
}
const ff = (...args) => execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...args]);

// Captura quadros da tela enquanto a cena roda (JPEG sequenciais, com o instante de cada um).
function gravador(pasta) {
  fs.mkdirSync(pasta, { recursive: true });
  const quadros = [];
  let ativo = true;
  const t0 = agora();
  const laco = (async () => {
    while (ativo) {
      const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
      if (!r?.data) continue;
      const arq = path.join(pasta, `q${String(quadros.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(arq, Buffer.from(r.data, 'base64'));
      quadros.push({ arq, t: (agora() - t0) / 1000 });
    }
  })();
  return {
    t0,
    async parar() {
      ativo = false;
      await laco;
      return { quadros, duracao: (agora() - t0) / 1000 };
    },
  };
}

const apenas = process.env.SO_CENAS ? process.env.SO_CENAS.split(',') : null;
// SO_CENAS_NO_VIDEO=1: o vídeo final leva só as cenas de SO_CENAS (útil para um trecho curto de teste de voz).
const soEssas = !!process.env.SO_CENAS_NO_VIDEO;
const videosCena = [];
let totalSeg = 0;
for (const [i, cena] of cenas.entries()) {
  const dir = path.join(tmp, 'cenas', `${String(i).padStart(2, '0')}-${cena.id}`);
  fs.mkdirSync(dir, { recursive: true });
  if (apenas && !apenas.includes(cena.id)) {
    if (!soEssas) videosCena.push(path.join(dir, 'cena.mp4')); // reaproveita a gravação anterior
    continue;
  }
  console.log(`\n== Cena ${i}: ${cena.id}`);
  if (cena.preparar) await cena.preparar();

  // Voz de cada passo (antes de gravar, para saber quanto dura cada fala).
  const falas = cena.passos.map((p, n) => {
    const arq = path.join(dir, `fala${n}.wav`);
    return { arq, dur: falar(p.fala, arq) };
  });

  const grav = gravador(path.join(dir, 'quadros'));
  const duracoes = [];
  for (const [n, passo] of cena.passos.entries()) {
    const ini = agora();
    const minimo = (falas[n].dur + 0.9) * 1000;
    const acao = passo.fazer ? passo.fazer() : Promise.resolve();
    await Promise.all([acao, esperar(minimo)]);
    duracoes.push((agora() - ini) / 1000);
  }
  const { quadros, duracao } = await grav.parar();
  // O vídeo da cena vai do início da gravação até o fim do último passo; o resto (parar) é cortado.
  const duracaoCena = duracoes.reduce((a, b) => a + b, 0);
  void duracao;

  // Áudio: cada fala preenchida com silêncio até a duração do seu passo.
  const lista = [];
  for (const [n, f] of falas.entries()) {
    const pad = path.join(dir, `pad${n}.wav`);
    ff('-i', f.arq, '-af', `apad=whole_dur=${duracoes[n].toFixed(3)}`, '-t', duracoes[n].toFixed(3), '-ar', '44100', '-ac', '1', pad);
    lista.push(`file '${pad}'`);
  }
  fs.writeFileSync(path.join(dir, 'audio.txt'), lista.join('\n'));
  const audio = path.join(dir, 'cena.wav');
  ff('-f', 'concat', '-safe', '0', '-i', path.join(dir, 'audio.txt'), '-c', 'copy', audio);

  // Vídeo: quadros com a duração real de cada um.
  const uteis = quadros.filter((qd) => qd.t < duracaoCena);
  const linhas = [];
  uteis.forEach((qd, k) => {
    const fim = k + 1 < uteis.length ? uteis[k + 1].t : duracaoCena;
    linhas.push(`file '${qd.arq}'`, `duration ${Math.max(0.01, fim - qd.t).toFixed(3)}`);
  });
  linhas.push(`file '${uteis[uteis.length - 1].arq}'`);
  fs.writeFileSync(path.join(dir, 'quadros.txt'), linhas.join('\n'));
  const mp4 = path.join(dir, 'cena.mp4');
  ff('-f', 'concat', '-safe', '0', '-i', path.join(dir, 'quadros.txt'), '-i', audio,
    '-vf', `fps=25,scale=${LARG}:${ALT},format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-t', duracaoCena.toFixed(3), mp4);
  videosCena.push(mp4);
  totalSeg += duracaoCena;
  console.log(`   ${uteis.length} quadros, ${duracaoCena.toFixed(1)} s`);
}

fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(path.join(tmp, 'cenas.txt'), videosCena.map((v) => `file '${v}'`).join('\n'));
ff('-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'cenas.txt'), '-c', 'copy', '-movflags', '+faststart', SAIDA);
console.log(`\nVídeo pronto: ${SAIDA} (${Math.floor(totalSeg / 60)} min ${Math.round(totalSeg % 60)} s)`);

filas.s.close();
ws.close();
if (!process.env.PASTA_TRABALHO) fs.rmSync(tmp, { recursive: true, force: true });
process.exit(0);
