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

// Campo de nome: enquanto se digita, a 1ª letra de cada palavra fica maiúscula e o resto minúsculo,
// mesmo com o Caps Lock ligado (o servidor grava do mesmo jeito). Uso: <input use:iniciaisMaiusculas ...>.
// Roda na fase de captura, antes do bind:value ler o campo; o tamanho do texto não muda, então o cursor fica onde estava.
export const comIniciaisMaiusculas = (texto) =>
  texto.replace(/\S+/g, (p) => {
    const letras = Array.from(p.toLocaleLowerCase("pt-BR"));
    return letras[0].toLocaleUpperCase("pt-BR") + letras.slice(1).join("");
  });

export function iniciaisMaiusculas(campo) {
  const ajustar = (e) => {
    if (e.isComposing) return; // acento em digitação (tecla morta): espera terminar
    const novo = comIniciaisMaiusculas(campo.value);
    if (novo === campo.value) return;
    const { selectionStart, selectionEnd } = campo;
    campo.value = novo;
    if (novo.length === campo.value.length) campo.setSelectionRange(selectionStart, selectionEnd);
  };
  campo.addEventListener("input", ajustar, true);
  campo.addEventListener("compositionend", ajustar, true);
  return {
    destroy() {
      campo.removeEventListener("input", ajustar, true);
      campo.removeEventListener("compositionend", ajustar, true);
    },
  };
}
