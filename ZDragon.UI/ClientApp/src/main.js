import App from "./App.svelte";

import { receiveMessage, selectApplication, setFiles } from "./Services/state";
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


// json editor
// import "./../node_modules/jsoneditor/dist/jsoneditor.min.js";
import "./../node_modules/jsoneditor/dist/jsoneditor.css";
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
  var applications = localStorage.getItem("applications");
  if (applications != null) {
    applications = JSON.parse(applications);
    if (applications.length > 0) {
      let path = applications[0]
        .replace(/\//g, "__$__")
        .replace(/\\/g, "__$__");

      selectApplication(applications[0]);
      post("/project/init/" + path, {});
    }
  }
}, 500);
