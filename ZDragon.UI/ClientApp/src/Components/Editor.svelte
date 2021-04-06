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
        //window.addEventListener("keydown", keyTrap, true);
        // editor.onMouseDown(function (e) {
        //     if (e.event.ctrlKey && e.event.leftButton) {
        //         var word = editor
        //             .getModel()
        //             .getWordAtPosition(e.target.position);
        //         onKeyPress(word);
        //     }
        // });
        editor.onDidChangeModelContent(function (e) {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                dispatch("change", editor.getValue());
            }, 200);
        });

        // monaco.languages.registerCompletionItemProvider("carlang", {
        //     //TODO: implement completion provider
        //     // triggerCharacters: [""],
        //     // provideCompletionItems: function (model, position) {
        //     //     let suggestions = [
        //     //         {
        //     //             label: "component",
        //     //             kind: monaco.languages.CompletionItemKind.Keyword,
        //     //             documentation: "Initialize a component",
        //     //             insertText: "component",
        //     //         },
        //     //     ];
        //     //     var foo = context;
        //     //     console.log(suggestions);
        //     //     return suggestions;
        //     // },
        // });
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

    // function keyTrap(e) {
    //     if (editor.hasTextFocus()) {
    //         if ((e.ctrlKey === true || e.metaKey == true) && e.key == "s") {
    //             dispatch("save", editor.getValue());
    //             onKeyPress(e, editor.getValue());
    //             e.preventDefault();
    //             return false;
    //         } else if (language === "carlang" && e.key == "F2") {
    //             var wordUnderCursor = editor
    //                 .getModel()
    //                 .getWordAtPosition(editor.getPosition());
    //             if (wordUnderCursor && wordUnderCursor.word) {
    //                 console.log(wordUnderCursor.word);
    //             }
    //         }
    //     }
    // }
</script>

<div class="editor" {id} bind:this={editorContainer} />

<style>
    .editor {
        height: 100%;
        width: 100%;
    }
</style>
