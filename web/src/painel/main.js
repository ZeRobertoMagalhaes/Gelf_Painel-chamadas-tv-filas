import "../style.css";
import { mount } from "svelte";
import App from "./PainelApp.svelte";

mount(App, { target: document.getElementById("app") });
