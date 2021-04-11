import App from "./App.svelte";
import initKeyTrap from "./key_trap";
import { loadApplications, receiveMessage, selectApplication, setFiles } from "./Services/state";


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
import eventbus from "./Services/eventbus";
import { resetModule } from "./Services/module";

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
  resetModule();
});
connection.start();

export default app;

// init the key trapping
initKeyTrap();


// Initialize the application
setTimeout(() => {
  loadApplications();

  // open last application
  var lastOpenedApplication = localStorage.getItem("last opened application");
  if (lastOpenedApplication) {
    selectApplication(lastOpenedApplication);
  }
}, 500);
