import "../style.css";
import { mount } from "svelte";
import App from "./ControleApp.svelte";

mount(App, { target: document.getElementById("app") });
