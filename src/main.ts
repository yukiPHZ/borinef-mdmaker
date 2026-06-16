import { mountApp } from "./app";
import "./styles/style.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("App root was not found.");
}

mountApp(root);
