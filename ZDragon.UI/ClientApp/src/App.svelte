<script type="typescript">
  import { Router, Route } from "svelte-routing";

  import EditorPage from "./Pages/EditorPage.svelte";
  import Home from "./Pages/Home.svelte";
  import About from "./Pages/About.svelte";
  import Menu from "./Components/Menu.svelte";

  let url = "";
</script>

<style type="less">
  .root {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: row;

    .page-content {
      flex: 1;
    }
  }
</style>

<Router {url}>
  <div class="root">
    <Menu />
    <div class="page-content">
      <Route path="/editor">
        <EditorPage />
      </Route>
      <Route path="/about" component={About} />
      <Route path="/">
        <Home />
      </Route>
    </div>
  </div>
</Router>
