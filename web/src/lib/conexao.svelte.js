import { io } from "socket.io-client";

// Estado compartilhado das três telas. O servidor é a fonte de verdade: cada
// tela só pede ações (agir) e redesenha o que o servidor transmite.
export const rede = $state({ online: false, config: null, estado: null });

const ouvintesChamada = new Set();
let socket = null;

export function conectar() {
  if (socket) return;
  socket = io({ transports: ["websocket", "polling"] });
  socket.on("connect", () => (rede.online = true));
  socket.on("disconnect", () => (rede.online = false));
  socket.on("config", (c) => (rede.config = c));
  socket.on("estado", (e) => (rede.estado = e));
  socket.on("chamada", (c) => ouvintesChamada.forEach((f) => f(c)));
}

export function aoChamar(fn) {
  ouvintesChamada.add(fn);
  return () => ouvintesChamada.delete(fn);
}

// Resolve sempre com { ok, ... }: nunca rejeita, para as telas só tratarem
// "ok" e "mensagem".
export function agir(tipo, payload = {}) {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve({ ok: false, codigo: "offline", mensagem: "Sem conexão com o servidor. Aguarde reconectar." });
      return;
    }
    socket.timeout(5000).emit("acao", tipo, payload, (erro, resposta) => {
      resolve(erro ? { ok: false, codigo: "timeout", mensagem: "O servidor não respondeu. Tente novamente." } : resposta);
    });
  });
}
