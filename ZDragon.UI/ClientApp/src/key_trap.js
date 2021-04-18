import eventbus from "./Services/eventbus";

function init() {
    function keytrap(e) {

        if ((e.ctrlKey || e.metaKey) && 46 < e.which && e.which < 91) {

            if (e.code === "KeyS") {
                eventbus.broadcast("save", {});
                e.preventDefault();
                return false;
            }
            else if (e.code === "KeyP") {
                eventbus.broadcast("ctrl-p", {});
                e.preventDefault();
                return false;
            }
            else if (e.code === "KeyB") {
                eventbus.broadcast("back", {});
                e.preventDefault();
                return false;
            }
            else {
                console.log(e);
                // do nothing
            }
        }

        else if (e.code === "F2") {
            var currentWord = window.getCurrentWord();
            if (currentWord) {
                eventbus.broadcast("start refactor", currentWord);
            }
        }

    }

    window.document.addEventListener("keydown", keytrap, false);
}

export default init;