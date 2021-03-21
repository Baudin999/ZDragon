<script>
  import { Router, Route } from "svelte-routing";

  import EditorPage from "./Pages/EditorPage.svelte";
  import Home from "./Pages/Home.svelte";
  import About from "./Pages/About.svelte";
  import Menu from "./Components/Menu.svelte";

  import Toolbar from "./Components/App/Toolbar.svelte";
  import JsonSchemaDesigner from "./Pages/JsonSchemaDesigner.svelte";
</script>

<Router>
  <div class="app--main">
    <Toolbar />
    <div class="content-container">
      <Menu />
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
      </div>
    </div>
  </div>
</Router>

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

      .panel {
        flex: 1;
        background-color: var(--color-1--bg);
      }
    }
  }
</style>
