// Sinal sonoro agradável (acorde de duas notas) via Web Audio API. Reaproveita
// um único AudioContext: criar um por chamada esgota o limite do navegador em
// painéis que ficam ligados o dia inteiro e o som passa a falhar. O volume e o
// número de toques vêm da configuração.
let ctx = null;

function contexto() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

// Navegadores só liberam áudio após um gesto do usuário (ou com a flag de
// autoplay do atalho kiosk). Esta função serve ao botão "Ativar som".
export async function ativarAudio() {
  const c = contexto();
  await c.resume();
  return c.state === "running";
}

export function aoMudarAudio(fn) {
  const c = contexto();
  const avisar = () => fn(c.state === "running");
  c.addEventListener("statechange", avisar);
  avisar();
  return () => c.removeEventListener("statechange", avisar);
}

export function playChime(volume = 0.3) {
  try {
    const c = contexto();
    if (c.state === "suspended") c.resume();
    [523.25, 783.99].forEach((freq, i) => {
      const t0 = c.currentTime + i * 0.15;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 1.8);
    });
  } catch (e) {
    console.log("Áudio indisponível:", e);
  }
}
