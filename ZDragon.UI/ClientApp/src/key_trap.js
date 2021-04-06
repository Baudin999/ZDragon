import eventbus from "./Services/eventbus";

function init() {
    function keytrap(e) {

        if (e.ctrlKey && 46 < e.which && e.which < 91) {

            if (e.code == "KeyS") {
                eventbus.broadcast("save", {});
                e.preventDefault();
                return false;
            }
            else {
                // do nothing
            }
        }

    }

    window.document.addEventListener("keydown", keytrap, false);
}

export default init;