<script>
    import { createEventDispatcher } from "svelte";
    import { onMount, onDestroy, afterUpdate } from "svelte";
    import { writable } from "svelte/store";

    const dispatch = createEventDispatcher();

    export let onKeyPress = () => {};
    let id = "editor-" + Math.floor(Math.random() * 1000);
    let editor = null;
    export let text = "";
    export let language = "carlang";
    export let theme = "carlangTheme";
    export let wordWrap = true;
    export let markers = writable([]);

    let editorContainer;

    if (markers) {
        markers.subscribe((m) => {
            if (!editor) return;
            var model = editor.getModel();
            monaco.editor.setModelMarkers(model, "", m);
        });
    }
    let timeout;
    const initEditor = () => {
        editor = monaco.editor.create(document.getElementById(id), {
            value: text || "",
            language: language,
            theme: theme,
            scrollBeyondLastLine: false,
            roundedSelection: true,
            fontSize: "12px",
            wordWrapColumn: 120,
            wordWrap: wordWrap ? "on" : "off",
            minimap: {
                enabled: true,
            },
        });
        editor.dragAndDrop = false;
        window.addEventListener("keydown", keyTrap, true);
        editor.onMouseDown(function (e) {
            if (e.event.ctrlKey && e.event.leftButton) {
                var word = editor
                    .getModel()
                    .getWordAtPosition(e.target.position);
                onKeyPress(word);
            }
        });
        editor.onDidChangeModelContent(function (e) {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                dispatch("change", editor.getValue());
            }, 200);
        });
    };
    onMount(() => {
        initEditor();
        editorContainer.addEventListener("resize", function () {
            if (editor) editor.layout();
        });
    });
    onDestroy(() => {
        window.removeEventListener("keydown", keyTrap, true);
    });

    $: if (language) {
        (() => {
            if (!editor) return;
            monaco.editor.setModelLanguage(editor.getModel(), language);
        })();
    }

    $: if (text) {
        (() => {
            if (!editor) return;

            const model = editor.getModel();
            const position = editor.getPosition();
            if (text != null && text !== model.getValue()) {
                editor.pushUndoStop();
                model.pushEditOperations(
                    [],
                    [
                        {
                            range: model.getFullModelRange(),
                            text: text,
                        },
                    ]
                );
                editor.pushUndoStop();
                editor.setPosition(position);
            }
        })();
    }

    function keyTrap(e) {
        if ((e.ctrlKey === true || e.metaKey == true) && e.key == "s") {
            dispatch("save", editor.getValue());
            onKeyPress(e, editor.getValue());
            e.preventDefault();
            return false;
        }
    }

    // function MyEditor(node) {
    //     debugger;

    // }
</script>

<style>
    .editor {
        height: 100%;
        width: 100%;
    }
</style>

<div class="editor" {id} bind:this={editorContainer} />
