import "./styles.css";
import { App } from "./ui/App";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app mount point in index.html");
}

new App(root).start();
