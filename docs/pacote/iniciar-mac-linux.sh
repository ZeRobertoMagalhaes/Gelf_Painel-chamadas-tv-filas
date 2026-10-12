#!/bin/bash
# Mac / Linux: de um duplo clique (ou rode no Terminal: ./iniciar-mac-linux.sh)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "O Node.js nao esta instalado. Baixe a versao LTS em https://nodejs.org e tente de novo."
  exit 1
fi
mkdir -p dados
echo "Painel GELF - Cura Mediunica (Bio)"
echo "Pagina inicial (links e QR code para o celular): http://localhost:3000"
echo "Controle neste computador: http://localhost:3000/bio/controle"
(sleep 3; (xdg-open http://localhost:3000/bio/controle || open http://localhost:3000/bio/controle) >/dev/null 2>&1) &
echo "Para encerrar: pressione Ctrl+C."
node server/index.js
