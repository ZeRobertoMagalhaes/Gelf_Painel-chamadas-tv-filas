export const SITUACAO = {
  aguardando: "Aguardando",
  chamado: "Chamado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  nao_compareceu: "Não compareceu",
};

export function tratamentoPorId(config, id) {
  return config?.tratamentos.find((t) => t.id === id) ?? { id, nome: id, cor: "#1e40af" };
}

export function horaCurta(iso) {
  return iso ? iso.slice(11, 16) : "";
}

export function lembrar(chave, valor) {
  try {
    if (valor === undefined) return localStorage.getItem(chave);
    localStorage.setItem(chave, valor);
  } catch {
    // modo privado / armazenamento bloqueado: segue sem lembrar
  }
  return valor ?? null;
}

export function idDoAparelho() {
  let id = lembrar("gelf.equipeId");
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 36);
    lembrar("gelf.equipeId", id);
  }
  return id;
}
