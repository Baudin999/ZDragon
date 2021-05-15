import { keypress } from "./Services/keypress";
import eventbus from "./Services/eventbus";

function init() {
    var listener = new keypress.Listener();
    listener.simple_combo("meta s", function (e) {
        eventbus.broadcast("save", {});
        e.preventDefault();
        return false;
    });

    listener.simple_combo("meta p", function (e) {
        eventbus.broadcast("ctrl-p", {});
        e.preventDefault();
        return false;
    });

    listener.simple_combo("meta /", function (e) {
        eventbus.broadcast("comment", {});
        e.preventDefault();
        return false;
    });

    listener.simple_combo("f2", function (e) {
        var currentWord = window.getCurrentWord();
        if (currentWord) {
            eventbus.broadcast("start refactor", currentWord);
        }
        e.preventDefault();
        return false;
    });

    listener.simple_combo("f4", function (e) {
        var currentWord = window.getCurrentWord();
        if (currentWord) {
            eventbus.broadcast("json_schema", currentWord);
        }
        e.preventDefault();
        return false;
    });
}

export default init;