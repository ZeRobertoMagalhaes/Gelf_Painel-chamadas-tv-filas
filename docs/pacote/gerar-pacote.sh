#!/bin/bash
# Gera o pacote de instalação para teste e validação (dist/Painel-Gelf-Filas-Windows.zip).
#
# Uso (na raiz do projeto):
#   VERSAO=abc1234 bash docs/pacote/gerar-pacote.sh
#
# Variáveis opcionais:
#   VERSAO      identificação gravada em VERSAO.txt (padrão: data de hoje)
#   FERRAMENTAS pasta onde ficam playwright-core, marked e mermaid (padrão: /tmp/gelf-ferramentas-pdf)
#   CHROME_PATH caminho do Chrome/Chromium (padrão: o instalado pelo Playwright)
#   NAO_PDF=1   não regenera os PDFs (usa os que já existem)
#
# Requer: node, npm, zip e acesso à internet na primeira vez (instala as ferramentas de PDF e as dependências).
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
FERRAMENTAS="${FERRAMENTAS:-/tmp/gelf-ferramentas-pdf}"
VERSAO="${VERSAO:-$(date +%Y-%m-%d)}"
PALCO="$(mktemp -d)"
PACOTE="$PALCO/Painel-Gelf-Filas"
trap 'rm -rf "$PALCO"' EXIT
export FERRAMENTAS

echo "==> Montando $PACOTE (versão $VERSAO)"
mkdir -p "$PACOTE/dados" "$PACOTE/documentos"
cp -r "$RAIZ/server" "$RAIZ/public" "$RAIZ/config" "$RAIZ/instalacao" "$RAIZ/package.json" "$RAIZ/package-lock.json" "$PACOTE/"
touch "$PACOTE/dados/.gitkeep"
(cd "$PACOTE" && npm ci --omit=dev --silent)

echo "==> Atalhos de inicialização e textos"
cp "$RAIZ/docs/pacote/INICIAR-SISTEMA.bat" "$RAIZ/docs/pacote/iniciar-mac-linux.sh" "$RAIZ/docs/pacote/LEIA-ME-PRIMEIRO.txt" "$PACOTE/"
chmod +x "$PACOTE/iniciar-mac-linux.sh"
printf 'Painel GELF - Filas e Bio - pacote de teste e validacao\r\nVersao: %s\r\nGerado em: %s\r\nConteudo: filas por tratamento + modulo Bio (recepcao, controle e painel de TV)\r\n' "$VERSAO" "$(date +%d/%m/%Y)" > "$PACOTE/VERSAO.txt"

if [ -z "${NAO_PDF:-}" ]; then
  if [ ! -d "$FERRAMENTAS/node_modules/mermaid" ]; then
    echo "==> Instalando as ferramentas de PDF em $FERRAMENTAS"
    mkdir -p "$FERRAMENTAS" && (cd "$FERRAMENTAS" && npm init -y >/dev/null && npm i --silent playwright-core marked mermaid)
  fi
  echo "==> Gerando os PDFs"
  node "$RAIZ/docs/pacote/ferramentas/md2pdf.mjs" "$RAIZ/docs/pacote/0-Roteiro-Evangelho-Terapia.md" "$PACOTE/documentos/0-Roteiro-Evangelho-Terapia.pdf" "Painel GELF — Roteiro rápido: Evangelho Terapia"
  node "$RAIZ/docs/pacote/ferramentas/md2pdf.mjs" "$RAIZ/docs/pacote/0-Roteiro-Bio-Energia.md" "$PACOTE/documentos/0-Roteiro-Bio-Energia.pdf" "Painel GELF — Roteiro rápido: Bio Energia"
  node "$RAIZ/docs/pacote/ferramentas/md2pdf.mjs" "$RAIZ/docs/pacote/1-Instalacao-e-uso.md" "$PACOTE/documentos/1-Instalacao-e-uso.pdf" "Painel GELF Bio — Instalação e uso"
  node "$RAIZ/docs/pacote/ferramentas/md2pdf.mjs" "$RAIZ/docs/pacote/2-Roteiro-de-validacao.md" "$PACOTE/documentos/2-Roteiro-de-validacao.pdf" "Painel GELF Bio — Roteiro de validação" paisagem
  node "$RAIZ/docs/pacote/ferramentas/pdf-fluxos.mjs" "$RAIZ" Bio
fi
[ -f "$RAIZ/docs/fluxos/pdf/Fluxo-Cura-Mediunica-Bio.pdf" ] || { echo "PDF do Bio ausente: rode sem NAO_PDF=1 para gerá-lo." >&2; exit 1; }
cp "$RAIZ/docs/fluxos/pdf/Fluxo-Cura-Mediunica-Bio.pdf" "$PACOTE/documentos/3-Fluxo-Cura-Mediunica-Bio.pdf"

echo "==> Compactando"
mkdir -p "$RAIZ/dist"
rm -f "$RAIZ/dist/Painel-Gelf-Filas-Windows.zip"
(cd "$PALCO" && zip -qr "$RAIZ/dist/Painel-Gelf-Filas-Windows.zip" Painel-Gelf-Filas -x "*/dados/*.json")
ls -la "$RAIZ/dist/Painel-Gelf-Filas-Windows.zip"
