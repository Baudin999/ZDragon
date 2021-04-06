import eventbus from "./eventbus";
import { moduleStore, saveCode } from "./module";


class EventProcessor {
    constructor() {
        //

        eventbus.subscribe("saving", text => {
            // save the module
            saveCode(text);
        });
    }


}

export default new EventProcessor();