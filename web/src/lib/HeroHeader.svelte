<script>
  import heroBg from "../assets/hero-bg.jpg";
  import heroLogo from "../assets/hero-logo.png";

  export let tagline;
  export let subtitle;
</script>

<header class="hero">
  <img class="hero-bg" src={heroBg} alt="" />
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="hero-logo-card">
      <img class="hero-logo" src={heroLogo} alt="GELF Apometria" />
    </div>
    <div class="hero-divider"></div>
    <div class="hero-text">
      <div class="tagline">{tagline}<small>{subtitle}</small></div>
    </div>
  </div>
</header>
