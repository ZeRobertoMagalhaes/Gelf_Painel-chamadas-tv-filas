<script>
  export let online = false;
  export let textoOnline = "conectado";
  export let textoOffline = "sem conexão";
</script>

<div class="conn-status" class:online>
  {online ? textoOnline : textoOffline}
</div>
