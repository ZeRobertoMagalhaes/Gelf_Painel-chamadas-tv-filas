#!/bin/bash
# Painel GELF - Cura Mediunica (Bio) para Linux Mint.
# Liga o sistema. Usa o Node.js que vem dentro deste pacote (pasta "node"), sem precisar instalar nada.
cd "$(dirname "$(readlink -f "$0")")" || exit 1
AQUI="$(pwd)"
PORTA="${PORT:-3000}"

esperar() { echo; read -r -p "Pressione Enter para fechar esta janela." _; }

if [ -x "$AQUI/node/bin/node" ]; then
  NODE="$AQUI/node/bin/node"
  ORIGEM="incluido neste pacote"
elif command -v node >/dev/null 2>&1 && [ "$(node -p "process.versions.node.split('.')[0]")" -ge 18 ]; then
  NODE="$(command -v node)"
  ORIGEM="instalado no computador"
else
  echo "O Node.js nao foi encontrado (nem dentro do pacote, nem instalado no computador)."
  echo "Confira se a pasta 'node' existe ao lado deste arquivo e se o computador e de 64 bits (uname -m mostra x86_64)."
  esperar; exit 1
fi

if ss -ltn 2>/dev/null | grep -q ":$PORTA "; then
  echo "A porta $PORTA ja esta em uso: o sistema provavelmente ja esta ligado em outra janela."
  echo "Abra http://localhost:$PORTA ou feche a outra janela e tente de novo."
  esperar; exit 1
fi

mkdir -p dados
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "=========================================="
echo " PAINEL GELF - Cura Mediunica (Bio)"
echo "=========================================="
echo " Node.js: $("$NODE" -v) ($ORIGEM)"
echo
echo " Pagina inicial (links de todas as telas e QR code para o celular):"
echo "     http://localhost:$PORTA"
[ -n "$IP" ] && echo " Em outros aparelhos da mesma rede:  http://$IP:$PORTA"
echo
echo " O navegador vai abrir na pagina inicial em instantes."
echo " PARA ENCERRAR: feche esta janela ou pressione Ctrl+C."
echo "------------------------------------------"
(sleep 4; xdg-open "http://localhost:$PORTA/" >/dev/null 2>&1) &
PORT="$PORTA" "$NODE" server/index.js
echo
echo "O sistema parou. Se apareceu uma mensagem de erro acima, tire uma foto da tela e envie com os seus comentarios."
esperar
