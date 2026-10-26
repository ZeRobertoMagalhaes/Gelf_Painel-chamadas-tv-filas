#!/bin/bash
# Cria o atalho "Painel GELF" na Area de Trabalho e no menu do Linux Mint (duplo clique liga o sistema).
cd "$(dirname "$(readlink -f "$0")")" || exit 1
AQUI="$(pwd)"
chmod +x "$AQUI/iniciar-mint.sh" "$AQUI/node/bin/node" 2>/dev/null
ICONE="$(ls "$AQUI"/public/assets/hero-logo-*.png 2>/dev/null | head -1)"
conteudo="[Desktop Entry]
Type=Application
Name=Painel GELF
Comment=Cura Mediunica (Bio) - liga o sistema
Exec=\"$AQUI/iniciar-mint.sh\"
Path=$AQUI
Terminal=true
Icon=${ICONE:-utilities-terminal}
Categories=Utility;"
mkdir -p "$HOME/.local/share/applications"
printf '%s\n' "$conteudo" > "$HOME/.local/share/applications/painel-gelf.desktop"
chmod +x "$HOME/.local/share/applications/painel-gelf.desktop"
DESK="$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
if [ -d "$DESK" ]; then
  printf '%s\n' "$conteudo" > "$DESK/Painel GELF.desktop"
  chmod +x "$DESK/Painel GELF.desktop"
  gio set "$DESK/Painel GELF.desktop" metadata::trusted true 2>/dev/null
fi
echo "Pronto! O atalho 'Painel GELF' foi criado na Area de Trabalho e no menu (Aplicativos)."
echo "Se o icone aparecer com um aviso, clique nele com o botao direito e escolha 'Permitir execucao' / 'Confiar neste lancador'."
