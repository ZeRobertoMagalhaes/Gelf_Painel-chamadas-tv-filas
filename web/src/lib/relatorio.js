// Salvar o relatório do dia: o navegador sugere o título da página como nome do PDF, e o mesmo nome
// (com .json) vai para o arquivo JSON baixado junto, com os mesmos dados que aparecem no PDF.
const dois = (n) => String(n).padStart(2, "0");

export function nomeBaseRelatorio(agora = new Date()) {
  const data = `${dois(agora.getDate())}-${dois(agora.getMonth() + 1)}-${agora.getFullYear()}`;
  const hora = `${dois(agora.getHours())}${dois(agora.getMinutes())}${dois(agora.getSeconds())}`;
  return `Relatorio Atendimentos Gelf ${data}_${hora}`;
}

function baixarJson(nomeArquivo, dados) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// `montarDados(agora, nomeBase)` devolve o conteúdo do JSON. Baixa o JSON e abre a janela de impressão/PDF.
export function salvarRelatorio(montarDados) {
  const agora = new Date();
  const nomeBase = nomeBaseRelatorio(agora);
  baixarJson(`${nomeBase}.json`, montarDados(agora, nomeBase));
  const tituloAnterior = document.title;
  document.title = nomeBase;
  window.addEventListener("afterprint", () => (document.title = tituloAnterior), { once: true });
  window.print();
}
