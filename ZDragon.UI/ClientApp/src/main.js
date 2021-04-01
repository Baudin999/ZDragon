import App from "./App.svelte";

import { loadApplications, receiveMessage, selectApplication, setFiles } from "./Services/state";
import { post } from "./Services/http";

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


import "./../node_modules/@microsoft/signalr/dist/browser/signalr.min.js";

const app = new App({
  target: document.body
});

var connection = new signalR.HubConnectionBuilder().withUrl("/project").withAutomaticReconnect().build();
connection.on("ReceiveMessage", function (data) {
  receiveMessage(data);
});
connection.on("ModuleChanged", function (ns) {
  receiveMessage("Module Changed: " + ns);
  var event = new CustomEvent("module_changed", {});
  window.dispatchEvent(event);
});
connection.on("ProjectChanged", function (result) {
  receiveMessage("Project Changed, updating navigation pane");
  setFiles(result);
});
connection.start();

export default app;


// Initialize the application
setTimeout(() => {
  loadApplications();
}, 500);
