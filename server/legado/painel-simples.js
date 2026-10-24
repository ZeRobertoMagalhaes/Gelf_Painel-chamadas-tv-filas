/* Painel da TV, versão simples (TV Box e navegadores antigos).
 * Só JavaScript antigo (ES5): sem módulos, sem =>, let/const, template strings nem ?. e ??.
 * Serve as duas telas: /painel-simples (filas) e /bio/painel-simples (Cura Mediúnica). */
(function () {
  var BIO = location.pathname.indexOf('/bio/') === 0;
  var config = null;
  var estado = null;
  var destaque = null;
  var pendentes = [];
  var ocupado = false;
  var pulsando = false;
  var audio = null;

  var STATUS = { chamado: 'Chamado', em_atendimento: 'Em atendimento', concluido: 'Atendimento concluído', aguardando: 'Etapa concluída — aguarde' };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function porId(lista, id) {
    lista = lista || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }
  function paciente(id) { return porId(estado && estado.pacientes, id); }
  function categoria(c) {
    var lista = BIO ? config.etapas : config.tratamentos;
    return porId(lista, BIO ? c.etapa : c.tratamento) || { nome: '', cor: '#1e40af' };
  }
  // A sala informada pelo controle (Bio) vale mais que o nome da sala da chamada.
  function salaDe(c) {
    var p = paciente(c.pacienteId);
    return (BIO && p && p.salaDestino) || c.sala;
  }
  function statusDe(c) {
    var p = paciente(c.pacienteId);
    return p ? p.situacao : '';
  }
  function statusTexto(c) {
    var p = paciente(c.pacienteId);
    if (!p) return '';
    if (BIO && p.situacao === 'aguardando') {
      var prox = porId(config.etapas, p.rota[p.posicao]);
      var idLocal = p.prioridade && config.prioridade && config.prioridade.localEspera ? config.prioridade.localEspera : prox && prox.esperaEm;
      var loc = porId(config.locais, idLocal);
      return loc ? 'Etapa concluída — aguarde: ' + loc.nome : STATUS.aguardando;
    }
    return STATUS[p.situacao] || '';
  }
  function aberto() { return BIO ? estado.diaAberto !== false : estado.atendimentoAberto !== false; }

  function atual() {
    var h = (estado && estado.historico) || [];
    if (destaque) for (var i = 0; i < h.length; i++) if (h[i].pacienteId === destaque.pacienteId) return h[i];
    return h[0] || null;
  }

  function render() {
    if (!config || !estado) return;
    el('msg').style.display = 'none';
    el('sub').innerHTML = BIO ? 'Cura Mediúnica' : 'Pacientes em atendimento';
    var a = atual();
    var html = '';
    if (a) {
      var cat = categoria(a);
      html = '<div class="badge" style="background:' + esc(cat.cor) + '">' + esc(cat.nome) + '</div>' +
        '<div class="nome">' + esc(a.nomeExibicao) + '</div>' +
        '<div class="sala">' + esc(salaDe(a)) + '</div>';
      var st = statusTexto(a);
      if (st) html += '<div class="status ' + esc(statusDe(a)) + '">' + esc(st) + '</div>';
    } else {
      html = '<div class="ocioso">' + (aberto() ? 'Aguardando próxima chamada' : 'Atendimento encerrado') + '</div>';
    }
    el('card').innerHTML = html;
    el('card').className = pulsando ? 'pulso' : '';

    var h = (estado.historico || []).filter(function (c) { return !a || c.pacienteId !== a.pacienteId; });
    h = h.slice(0, (config.painel && config.painel.ultimasChamadas) || 4);
    var cards = '';
    for (var i = 0; i < h.length; i++) {
      var cat2 = categoria(h[i]);
      var st2 = statusTexto(h[i]);
      var linha = (BIO ? '' : cat2.nome + ' • ') + salaDe(h[i]) + (st2 ? ' • ' + st2 : '');
      cards += '<div class="h" style="border-left-color:' + esc(cat2.cor) + '"><div class="hn">' + esc(h[i].nomeExibicao) + '</div><div class="ht">' + esc(linha) + '</div></div>';
    }
    el('hist').innerHTML = h.length ? '<div class="titulo">ÚLTIMOS CHAMADOS</div><div class="linha">' + cards + '</div>' : '';
    el('hist').style.display = h.length ? 'block' : 'none';
  }

  /* ---- som ---- */
  function contexto() {
    if (!audio) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (C) audio = new C();
    }
    return audio;
  }
  function chime(volume) {
    var c = contexto();
    if (!c) return;
    try {
      if (c.state === 'suspended' && c.resume) c.resume();
      [523.25, 783.99].forEach(function (freq, i) {
        var t0 = c.currentTime + i * 0.15;
        var osc = c.createOscillator();
        var gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(volume, t0 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + 1.9);
      });
    } catch (e) { /* sem áudio: segue só com a imagem */ }
  }
  function botaoSom() {
    var c = contexto();
    el('som').style.display = c && c.state === 'running' ? 'none' : 'block';
  }
  el('som').onclick = function () {
    var c = contexto();
    if (c && c.resume) c.resume();
    chime(config ? config.som.volume : 0.3);
    setTimeout(botaoSom, 300);
  };
  setInterval(botaoSom, 3000);
  botaoSom();

  /* ---- fila de chamadas: uma de cada vez, sem cortar o som da anterior ---- */
  function processar() {
    if (ocupado || pendentes.length === 0 || !config) return;
    var chamada = pendentes.shift();
    var som = config.som;
    var painel = config.painel;
    ocupado = true;
    destaque = chamada;
    pulsando = true;
    render();
    for (var i = 0; i < som.repeticoes; i++) setTimeout(function () { chime(som.volume); }, i * som.intervaloMs);
    setTimeout(function () { pulsando = false; render(); }, painel.destaqueMs);
    setTimeout(function () { ocupado = false; processar(); }, (som.repeticoes - 1) * som.intervaloMs + 4000);
  }

  /* ---- ligação com o servidor ---- */
  if (typeof io === 'undefined') {
    el('msg').innerHTML = 'Não foi possível carregar a ligação com o servidor (/socket.io). Confira o endereço e a rede.';
    return;
  }
  var socket = io(BIO ? '/bio' : '/');
  socket.on('connect', function () { el('conn').className = ''; el('conn').innerHTML = 'conectado'; });
  socket.on('disconnect', function () { el('conn').className = 'off'; el('conn').innerHTML = 'sem conexão'; });
  socket.on('config', function (c) { config = c; render(); });
  socket.on('estado', function (e) { estado = e; render(); });
  socket.on('chamada', function (c) { pendentes.push(c); processar(); });
})();
