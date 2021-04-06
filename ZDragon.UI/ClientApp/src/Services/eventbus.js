

class eventbus {


    constructor() {
        this.handlers = {};
        //
    }

    subscribe(event, handler) {

        if (!(handler instanceof Function)) return;

        if (!this.handlers[event]) this.handlers[event] = [handler];
        else this.handlers[event].push(handler);
    }
    broadcast(event, data) {
        (this.handlers[event] || []).forEach(handler => {
            if (handler instanceof Function) {
                handler(data);
            }
        });
    }

}

export default new eventbus();
