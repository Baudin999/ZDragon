<script>
  import { Router, Route } from "svelte-routing";

  import SelectProject from "./Forms/SelectProject.svelte";
  import CreateFile from "./Forms/CreateFile.svelte";
  import CreateApplication from "./Forms/CreateApplication.svelte";
  import Modal from "./Components/Modal.svelte";

  import EditorPage from "./Pages/EditorPage.svelte";
  import Home from "./Pages/Home.svelte";
  import About from "./Pages/About.svelte";
  import Menu from "./Components/Menu.svelte";

  import Toolbar from "./Components/Toolbar.svelte";
  import LogPage from "./Pages/LogPage.svelte";
  import ViewBuilder from "./Pages/ViewBuilder.svelte";
  import DocumentReader from "./Pages/DocumentReader.svelte";
  import Search from "./Forms/Search.svelte";
  import eventbus from "./Services/eventbus";

  import {
    state,
    toggleAddApplicationDialog,
    toggleAddFileDialog,
    toggleAddProjectDialog,
    toggleJsonSchemaDialog,
    toggleRefactoringDialog,
  } from "./Services/app";
  import RefactorDialog from "./Forms/RefactorDialog.svelte";
  import JsonSchemaDialog from "./Forms/JsonSchemaDialog.svelte";

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

  let showAddApplicationDialog = false;
  let showAddFileDialog = false;
  let showAddProjectDialog = false;
  let showRefactoringDialog = false;
  let showJsonSchemaDialog = false;

  state.subscribe((s) => {
    showAddFileDialog = !!s.showAddFileDialog;
    showAddApplicationDialog = !!s.showAddApplicationDialog;
    showAddProjectDialog = !!s.showAddProjectDialog;
    showRefactoringDialog = !!s.showRefactoringDialog;
    showJsonSchemaDialog = !!s.showJsonSchemaDialog;
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
          <EditorPage params />
        </Route>
        <Route path="/about" component={About} />
        <Route path="/">
          <Home />
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

<Modal
  title="Select Directory"
  show={showAddProjectDialog}
  close={toggleAddProjectDialog}>
  <SelectProject close={toggleAddProjectDialog} />
</Modal>

{#if showAddFileDialog}
  <Modal title="Add File" show={showAddFileDialog} close={toggleAddFileDialog}>
    <CreateFile />
  </Modal>
{/if}

<Modal
  title="Add Application"
  show={showAddApplicationDialog}
  close={toggleAddApplicationDialog}>
  <CreateApplication />
</Modal>

{#if showRefactoringDialog}
  <Modal
    title="Refactoring"
    show={showRefactoringDialog}
    close={toggleRefactoringDialog}
    size="wide">
    <RefactorDialog />
  </Modal>
{/if}

{#if showJsonSchemaDialog}
  <Modal
    title="JSON Schema"
    show={showJsonSchemaDialog}
    close={toggleJsonSchemaDialog}
    size="wide">
    <JsonSchemaDialog />
  </Modal>
{/if}

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
