#!/bin/bash
# Gera o pacote para Linux Mint (dist/Painel-GELF-Bio-Linux-Mint.zip): o sistema + o Node.js embutido
# (nao precisa instalar nada nem de internet no Mint) + ligador, atalho e guia em PDF.
#
# Uso (na raiz do projeto):   VERSAO=abc1234 bash docs/pacote/gerar-pacote-mint.sh
# Variaveis: VERSAO, FERRAMENTAS (ferramentas de PDF), CHROME_PATH, NAO_PDF=1, NODE_VERSAO (padrao: a do node instalado),
#            CACHE_NODE (pasta onde o Node baixado fica guardado; padrao /tmp/gelf-node-cache).
# Requer: node, npm, zip, curl, tar e internet na primeira vez (baixa o Node.js oficial e confere o checksum).
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
FERRAMENTAS="${FERRAMENTAS:-/tmp/gelf-ferramentas-pdf}"
VERSAO="${VERSAO:-$(date +%Y-%m-%d)}"
NODE_VERSAO="${NODE_VERSAO:-$(node -v)}"
CACHE_NODE="${CACHE_NODE:-/tmp/gelf-node-cache}"
PALCO="$(mktemp -d)"
PACOTE="$PALCO/Painel-GELF-Bio"
trap 'rm -rf "$PALCO"' EXIT
export FERRAMENTAS

echo "==> Montando $PACOTE (versao $VERSAO, Node.js $NODE_VERSAO incluido)"
mkdir -p "$PACOTE/dados" "$PACOTE/documentos" "$PACOTE/node/bin" "$CACHE_NODE"
cp -r "$RAIZ/server" "$RAIZ/public" "$RAIZ/config" "$RAIZ/package.json" "$RAIZ/package-lock.json" "$PACOTE/"
touch "$PACOTE/dados/.gitkeep"
(cd "$PACOTE" && npm ci --omit=dev --silent)

echo "==> Node.js oficial (linux-x64), com checksum"
ARQ="node-$NODE_VERSAO-linux-x64.tar.xz"
if [ ! -f "$CACHE_NODE/$ARQ" ]; then
  curl -fsSL -o "$CACHE_NODE/SHASUMS256-$NODE_VERSAO.txt" "https://nodejs.org/dist/$NODE_VERSAO/SHASUMS256.txt"
  curl -fsSL -o "$CACHE_NODE/$ARQ" "https://nodejs.org/dist/$NODE_VERSAO/$ARQ"
fi
ESPERADO="$(curl -fsSL "https://nodejs.org/dist/$NODE_VERSAO/SHASUMS256.txt" | grep " $ARQ\$" | cut -d' ' -f1 || true)"
[ -z "$ESPERADO" ] && ESPERADO="$(grep " $ARQ\$" "$CACHE_NODE/SHASUMS256-$NODE_VERSAO.txt" | cut -d' ' -f1)"
[ "$(sha256sum "$CACHE_NODE/$ARQ" | cut -d' ' -f1)" = "$ESPERADO" ] || { echo "Checksum do Node.js nao confere" >&2; exit 1; }
tar -xJf "$CACHE_NODE/$ARQ" -C "$PALCO" "node-$NODE_VERSAO-linux-x64/bin/node" "node-$NODE_VERSAO-linux-x64/LICENSE"
cp "$PALCO/node-$NODE_VERSAO-linux-x64/bin/node" "$PACOTE/node/bin/node"
cp "$PALCO/node-$NODE_VERSAO-linux-x64/LICENSE" "$PACOTE/node/LICENSE"
chmod +x "$PACOTE/node/bin/node"

echo "==> Ligador, atalho e textos"
cp "$RAIZ/docs/pacote/mint/iniciar-mint.sh" "$RAIZ/docs/pacote/mint/instalar-atalho-mint.sh" "$RAIZ/docs/pacote/mint/LEIA-ME-PRIMEIRO.txt" "$PACOTE/"
chmod +x "$PACOTE/iniciar-mint.sh" "$PACOTE/instalar-atalho-mint.sh"
printf 'Painel GELF - Cura Mediunica (Bio) - pacote para Linux Mint\nVersao: %s\nNode.js incluido: %s (linux-x64)\nGerado em: %s\n' "$VERSAO" "$NODE_VERSAO" "$(date +%d/%m/%Y)" > "$PACOTE/VERSAO.txt"

if [ -z "${NAO_PDF:-}" ]; then
  if [ ! -d "$FERRAMENTAS/node_modules/mermaid" ]; then
    echo "==> Instalando as ferramentas de PDF em $FERRAMENTAS"
    mkdir -p "$FERRAMENTAS" && (cd "$FERRAMENTAS" && npm init -y >/dev/null && npm i --silent playwright-core marked mermaid)
  fi
  echo "==> Gerando os PDFs"
  node "$RAIZ/docs/pacote/ferramentas/md2pdf.mjs" "$RAIZ/docs/pacote/mint/1-Instalacao-Linux-Mint.md" "$PACOTE/documentos/1-Instalacao-Linux-Mint.pdf" "Painel GELF Bio — Instalação no Linux Mint"
  node "$RAIZ/docs/pacote/ferramentas/md2pdf.mjs" "$RAIZ/docs/pacote/2-Roteiro-de-validacao.md" "$PACOTE/documentos/2-Roteiro-de-validacao.pdf" "Painel GELF Bio — Roteiro de validação" paisagem
  node "$RAIZ/docs/pacote/ferramentas/pdf-fluxos.mjs" "$RAIZ" Bio
fi
[ -f "$RAIZ/docs/fluxos/pdf/Fluxo-Cura-Mediunica-Bio.pdf" ] || { echo "PDF do Bio ausente: rode sem NAO_PDF=1 para gera-lo." >&2; exit 1; }
cp "$RAIZ/docs/fluxos/pdf/Fluxo-Cura-Mediunica-Bio.pdf" "$PACOTE/documentos/3-Fluxo-Cura-Mediunica-Bio.pdf"

echo "==> Compactando"
mkdir -p "$RAIZ/dist"
rm -f "$RAIZ/dist/Painel-GELF-Bio-Linux-Mint.zip"
(cd "$PALCO" && zip -qr "$RAIZ/dist/Painel-GELF-Bio-Linux-Mint.zip" Painel-GELF-Bio -x "*/dados/*.json")
ls -la "$RAIZ/dist/Painel-GELF-Bio-Linux-Mint.zip"
