import App from "./App.svelte";

// import styling
import "./Styling/settings.css";
import "./Styling/styles.css";
import "./Styling/forms.css";
import "./Styling/buttons.css";
import "./Styling/mermaid.css";
import "./Styling/tables.css";
import "./Styling/file-explorer.css";

// INIT MONACO
import { theme, tokenizer } from "./editor-carlang.js";
monaco.languages.register({ id: "carlang" });
monaco.languages.setMonarchTokensProvider("carlang", tokenizer);
monaco.editor.defineTheme("carlangTheme", theme);


// json editor
// import "./../node_modules/jsoneditor/dist/jsoneditor.min.js";
import "./../node_modules/jsoneditor/dist/jsoneditor.css";
import "./../node_modules/@microsoft/signalr/dist/browser/signalr.min.js";

const app = new App({
  target: document.body
});

var connection = new signalR.HubConnectionBuilder().withUrl("/project").build();
connection.on("ReceiveMessage", function (data) {
  // console.log("Ready from SignalR: " + data);
});
connection.on("ModuleChanged", function (ns) {
  console.log("ModuleChanged");
  var event = new CustomEvent("module_changed", {});
  window.dispatchEvent(event);
});
connection.start();

export default app;