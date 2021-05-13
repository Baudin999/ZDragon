import App from "./App.svelte";
import initKeyTrap from "./key_trap";
import { init, log, loadProjects, setDirectoryInterator, loadLastProject, loadLastModule } from "./Services/app";


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
  log(data);
});
connection.on("ModuleChanged", function (ns) {
  log("Module Changed: " + ns);
});

let timeout;
connection.on("ProjectChanged", function (directoryInterator) {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    log("Project Changed, updating navigation pane");
    setDirectoryInterator(directoryInterator);
  }, 500);
});
connection.start().then(() => {
  // init application after connection to hub is established
  loadProjects();
  loadLastProject();
});


export default app;

// init the key trapping
initKeyTrap();
init();

