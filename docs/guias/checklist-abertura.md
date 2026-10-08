# Checklist de abertura do dia

Antes do primeiro paciente (cerca de 5 minutos).

- [ ] Notebook da TV ligado **na tomada** (e roteador ligado)
- [ ] TV na entrada **HDMI** certa e com **volume** audível
- [ ] O painel aparece em tela cheia (se não, abrir o atalho "Painel GELF - TV")
- [ ] Se aparecer o botão **🔊 Ativar som**, tocar nele uma vez (toca um sinal de teste)
- [ ] Indicador do canto do painel mostra **conectado**
- [ ] Na Recepção, tocar em **Abrir atendimento**
- [ ] Teste: cadastrar um paciente "Teste Teste", chamar pelo celular, conferir **nome, sala e som** na TV,
      e então **Iniciar** e **Concluir** (ou remover com ✕ antes de chamar)
- [ ] Cada equipe abriu **/atendimento** no celular e escolheu o seu tratamento

## No fim do dia

- [ ] Na Recepção, **Fechar atendimento** (apaga as filas e os nomes). Se esquecer, o sistema apaga
      sozinho no dia seguinte.

## Se algo falhar

| Sintoma | O que fazer |
|---|---|
| Painel diz **sem conexão** | Ver se o notebook e o roteador estão ligados; esperar reconectar sozinho |
| Sem som | Tocar em **Ativar som**; conferir volume da TV e do notebook |
| Celular não abre a página | Usar o endereço com IP (`http://192.168.0.10:3000/atendimento`) |
| Notebook reiniciou | Esperar 1–2 min: o servidor volta sozinho e as filas são recuperadas |
| Servidor fora do ar e sem conserto rápido | **Plano B:** voltar à chamada manual com a lista impressa |
