<script>
  import { Router, Route } from "svelte-routing";

  import EditorPage from "./Pages/EditorPage.svelte";
  import Home from "./Pages/Home.svelte";
  import About from "./Pages/About.svelte";
  import Menu from "./Components/Menu.svelte";

  import Toolbar from "./Components/App/Toolbar.svelte";
  import JsonSchemaDesigner from "./Pages/JsonSchemaDesigner.svelte";
  import LogPage from "./Pages/LogPage.svelte";
  import ViewBuilder from "./Pages/ViewBuilder.svelte";
  import DocumentReader from "./Pages/DocumentReader.svelte";
  import Modal from "./Components/Modal.svelte";
  import Search from "./Forms/Search.svelte";
  import eventbus from "./Services/eventbus";

  let url = "";
  let showSearch = false;

  $: {
    console.log("URL: ", url);
  }

  eventbus.subscribe("ctrl-p", () => {
    showSearch = !showSearch;
  });
  eventbus.subscribe("navigate", () => {
    showSearch = false;
  });
</script>

<Router {url}>
  <div class="app--main">
    <Toolbar />
    <div class="content-container">
      <Menu {url} />
      <div class="panel">
        <Route path="/editor">
          <EditorPage />
        </Route>
        <Route path="/editor/:namespace" let:params>
          <EditorPage namespace={params.namespace} />
        </Route>
        <Route path="/about" component={About} />
        <Route path="/">
          <Home />
        </Route>
        <Route path="/json-designer">
          <JsonSchemaDesigner />
        </Route>
        <Route path="/home">
          <Home />
        </Route>
        <Route path="/logs">
          <LogPage />
        </Route>
        <Route path="/reader">
          <DocumentReader />
        </Route>
        <Route path="view-builder">
          <ViewBuilder />
        </Route>
      </div>
    </div>
  </div>
</Router>

<Modal title="Search" show={showSearch} close={() => (showSearch = false)}>
  <Search show={showSearch} />
</Modal>

<style type="less">
  .app--main {
    height: 100%;
    overflow: hidden;
    background: var(--color-1);
    color: var(--color-1--alt);

    display: flex;
    flex-direction: column;

    .content-container {
      flex: 1;
      display: flex;
      flex-direction: row;
      overflow: hidden;

      .panel {
        flex: 1;
        background-color: var(--color-1--bg);
      }
    }
  }
</style>
