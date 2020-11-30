import App from "./App.svelte";

// import styling
import "./Styling/settings.css";
import "./Styling/styles.css";
import "./Styling/forms.css";
import "./Styling/buttons.css";
import "./Styling/mermaid.css";
import "./Styling/tables.css";

const app = new App({
  target: document.body
});

export default app;