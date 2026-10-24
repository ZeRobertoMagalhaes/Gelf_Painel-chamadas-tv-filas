/* Diagnóstico do navegador da TV Box. Só JavaScript antigo (ES5). */
(function () {
  var linhas = [];
  function add(nome, valor, bom) {
    linhas.push('<tr><td class="k">' + nome + '</td><td class="' + (bom === true ? 'ok' : bom === false ? 'no' : '') + '">' + valor + '</td></tr>');
  }
  function sim(v) { return v ? 'SIM' : 'NÃO'; }
  function tenta(codigo) {
    try { new Function(codigo)(); return true; } catch (e) { return false; }
  }

  var ua = navigator.userAgent || '';
  var m = /Chrome\/(\d+)/.exec(ua) || /Chromium\/(\d+)/.exec(ua);
  var chrome = m ? parseInt(m[1], 10) : null;
  var android = /Android ([\d.]+)/.exec(ua);

  add('Endereço aberto', location.href);
  add('Navegador (identificação)', ua.replace(/</g, '&lt;'));
  add('Versão do Chrome/Chromium', chrome ? String(chrome) + (chrome >= 85 ? '' : ' (antiga: o painel normal precisa de 85 ou mais)') : 'não identificada', chrome ? chrome >= 85 : undefined);
  add('Versão do Android', android ? android[1] : 'não identificada');
  add('Tela', screen.width + ' x ' + screen.height + ' (janela ' + window.innerWidth + ' x ' + window.innerHeight + ')');

  var modulos = 'noModule' in document.createElement('script');
  var encadeamento = tenta('var a = {}; return a?.b;');
  var nulo = tenta('var a = null; return a ?? 1;');
  var atrib = tenta('var a = null; a ??= 1; var b = 0; b ||= 2; return a + b;');
  var replaceAll = typeof String.prototype.replaceAll === 'function';
  var promessa = typeof Promise !== 'undefined';
  var ws = typeof WebSocket !== 'undefined';
  var audio = !!(window.AudioContext || window.webkitAudioContext);
  var css = window.CSS && CSS.supports ? CSS.supports('font-size', 'min(10px, 2vw)') : false;
  var clamp = window.CSS && CSS.supports ? CSS.supports('font-size', 'clamp(10px, 2vw, 20px)') : false;
  var gapFlex = window.CSS && CSS.supports ? CSS.supports('gap', '1px') : false;

  add('Módulos JavaScript (type="module")', sim(modulos), modulos);
  add('Sintaxe moderna ( ?. e ?? )', sim(encadeamento && nulo), encadeamento && nulo);
  add('Sintaxe moderna ( ??= e ||= )', sim(atrib), atrib);
  add('replaceAll', sim(replaceAll), replaceAll);
  add('Promise', sim(promessa), promessa);
  add('WebSocket', sim(ws), ws);
  add('Áudio (sinal sonoro)', sim(audio), audio);
  add('CSS min() e clamp()', sim(css && clamp), css && clamp);
  add('CSS gap', sim(gapFlex), gapFlex);

  var modernoOk = modulos && encadeamento && nulo && atrib && replaceAll && promessa && css && clamp;

  var tab = document.getElementById('tab');
  function mostrar() { tab.innerHTML = linhas.join(''); }
  mostrar();

  function veredito(servidorOk) {
    var v = document.getElementById('veredito');
    var l = document.getElementById('links');
    var simples = '<a href="/painel-simples">Painel simples (filas)</a><a href="/bio/painel-simples">Painel simples (Bio)</a>';
    var normal = '<a href="/painel">Painel normal (filas)</a><a href="/bio/painel">Painel normal (Bio)</a>';
    if (!servidorOk) {
      v.className = 'caixa ruim';
      v.innerHTML = 'Este navegador NÃO alcançou o servidor. O problema é de rede/endereço, não do navegador. Confira o Wi-Fi/cabo e o endereço digitado.';
      l.innerHTML = '';
    } else if (modernoOk) {
      v.className = 'caixa bom';
      v.innerHTML = 'Tudo certo: este navegador abre o painel normal. Se mesmo assim ele não abrir, use o painel simples abaixo.';
      l.innerHTML = normal + simples;
    } else {
      v.className = 'caixa meio';
      v.innerHTML = 'Este navegador é antigo para o painel normal. Use o PAINEL SIMPLES (funciona igual).';
      l.innerHTML = simples + normal;
    }
  }

  // O servidor responde? (e a ligação em tempo real fica disponível?)
  function pedir(url, ok, falha) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.timeout = 8000;
    x.onload = function () { (x.status >= 200 && x.status < 300 ? ok : falha)(x); };
    x.onerror = x.ontimeout = function () { falha(x); };
    x.send();
  }
  pedir('/status', function (x) {
    var servico = '';
    try { servico = JSON.parse(x.responseText).servico; } catch (e) { /* ignora */ }
    add('Servidor responde', 'SIM (' + servico + ')', true);
    pedir('/socket.io/socket.io.js', function () {
      add('Ligação em tempo real (socket.io)', 'SIM', true);
      mostrar();
      veredito(true);
    }, function () {
      add('Ligação em tempo real (socket.io)', 'NÃO', false);
      mostrar();
      veredito(false);
    });
  }, function () {
    add('Servidor responde', 'NÃO', false);
    mostrar();
    veredito(false);
  });
})();
