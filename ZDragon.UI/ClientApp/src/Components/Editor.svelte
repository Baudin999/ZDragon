<script>
    import { createEventDispatcher } from "svelte";
    import { onMount, onDestroy } from "svelte";
    import { writable } from "svelte/store";
    import eventbus from "../Services/eventbus";

    const dispatch = createEventDispatcher();

    // export let onKeyPress = () => {};
    let id = "editor-" + Math.floor(Math.random() * 1000);
    let editor = null;
    export let text = "";
    export let language = "carlang";
    export let theme = "carlangTheme";
    export let wordWrap = true;
    export let markers = writable([]);
    export let context = [];

    let f = context;

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
            scrollBeyondLastLine: true,
            roundedSelection: true,
            fontSize: "16px",
            wordWrapColumn: 120,
            wordWrap: wordWrap ? "on" : "off",
            minimap: {
                enabled: false,
            },
            quickSuggestions: {
                other: false,
                comments: false,
                strings: false,
            },
        });
        editor.dragAndDrop = false;

        editor.onDidChangeModelContent(function (e) {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                dispatch("change", editor.getValue());
            }, 200);
        });

        editor.onMouseDown(function (e) {
            if (e.event.ctrlKey && e.event.leftButton) {
                var word = editor
                    .getModel()
                    .getWordAtPosition(e.target.position);
                eventbus.broadcast("navigateTo", word.word);
            }
        });

        window.getCurrentWord = () => {
            var position = editor.getPosition();
            if (position) {
                var token = editor.getModel().getWordAtPosition(position);
                if (token && token.word) return token.word;
            }
        };
    };
    onMount(() => {
        initEditor();
        var ro = new ResizeObserver(() => {
            editor.layout();
        });
        ro.observe(editorContainer);
    });
    onDestroy(() => {
        //window.removeEventListener("keydown", keyTrap, true);
    });

    $: if (language) {
        (() => {
            if (!editor) return;
            monaco.editor.setModelLanguage(editor.getModel(), language);
        })();
    }

    $: if (text || text === "") {
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

    eventbus.subscribe("save", () => {
        if (editor._focusTracker._hasFocus) {
            eventbus.broadcast("saving", editor.getValue());
        }
    });
    eventbus.subscribe("comment", () => {
        editor.getSelection();
        console.log("COMMENTING");
    });
    eventbus.subscribe("navigateToToken", (position) => {
        editor.focus();
        editor.setPosition(position);
        editor.revealLineInCenter(position.lineNumber);
    });
</script>

<div class="editor" {id} bind:this={editorContainer} />

<style>
    .editor {
        height: 100%;
        width: 100%;
    }
</style>
