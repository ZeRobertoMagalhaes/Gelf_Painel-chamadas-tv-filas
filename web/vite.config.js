import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// As três telas são páginas separadas, servidas pelo próprio servidor Node
// (express.static("public")): mesma origem, sem configurar endereço nenhum.
// Em desenvolvimento, o Vite encaminha o Socket.io para o servidor na 3000.
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: "../public",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        painel: "painel.html",
        atendimento: "atendimento.html",
        recepcao: "recepcao.html",
      },
    },
  },
  server: {
    port: 5173,
    proxy: { "/socket.io": { target: "http://localhost:3000", ws: true } },
  },
});
