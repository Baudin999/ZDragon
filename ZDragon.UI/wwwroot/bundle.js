var zdragon = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element$1(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate: navigate$1 } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /* node_modules\svelte-routing\src\Router.svelte generated by Svelte v3.16.7 */

    function create_fragment(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 32768) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[15], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let $routes;
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, "routes");
    	component_subscribe($$self, routes, value => $$invalidate(8, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false;
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(7, $location = value));

    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(6, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;
    		route._path = path;
    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ["basepath", "url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("$$scope" in $$props) $$invalidate(15, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			basepath,
    			url,
    			hasActiveRoute,
    			$base,
    			$location,
    			$routes
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("hasActiveRoute" in $$props) hasActiveRoute = $$props.hasActiveRoute;
    		if ("$base" in $$props) base.set($base = $$props.$base);
    		if ("$location" in $$props) location.set($location = $$props.$location);
    		if ("$routes" in $$props) routes.set($routes = $$props.$routes);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 64) {
    			 {
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 384) {
    			 {
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		routes,
    		location,
    		base,
    		basepath,
    		url,
    		hasActiveRoute,
    		$base,
    		$location,
    		$routes,
    		locationContext,
    		routerContext,
    		activeRoute,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$$scope,
    		$$slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-routing\src\Route.svelte generated by Svelte v3.16.7 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 2,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[1],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty & /*$$scope, routeParams, $location*/ 4114) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[12], get_default_slot_context), get_slot_changes(default_slot_template, /*$$scope*/ ctx[12], dirty, get_default_slot_changes));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[1],
    		/*routeProps*/ ctx[2]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 22)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && ({ location: /*$location*/ ctx[4] }),
    					dirty & /*routeParams*/ 2 && get_spread_object(/*routeParams*/ ctx[1]),
    					dirty & /*routeProps*/ 4 && get_spread_object(/*routeProps*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[3] !== null && /*$activeRoute*/ ctx[3].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, "activeRoute");
    	component_subscribe($$self, activeRoute, value => $$invalidate(3, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));
    	const route = { path, default: path === "" };
    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate(11, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("path" in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("$$scope" in $$new_props) $$invalidate(12, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			path,
    			component,
    			routeParams,
    			routeProps,
    			$activeRoute,
    			$location
    		};
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(11, $$props = assign(assign({}, $$props), $$new_props));
    		if ("path" in $$props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$props) $$invalidate(0, component = $$new_props.component);
    		if ("routeParams" in $$props) $$invalidate(1, routeParams = $$new_props.routeParams);
    		if ("routeProps" in $$props) $$invalidate(2, routeProps = $$new_props.routeProps);
    		if ("$activeRoute" in $$props) activeRoute.set($activeRoute = $$new_props.$activeRoute);
    		if ("$location" in $$props) location.set($location = $$new_props.$location);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 8) {
    			 if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(1, routeParams = $activeRoute.params);
    			}
    		}

    		 {
    			const { path, component, ...rest } = $$props;
    			$$invalidate(2, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		registerRoute,
    		unregisterRoute,
    		$$props,
    		$$scope,
    		$$slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // import { push } from "svelte-spa-router";

    let fetcher = writable(false);

    let manageResult = (response, isText = false) => {
        // var clone = response.clone();
        return new Promise(async (resolve, reject) => {

            fetcher.set(false);

            response.then(async r => {
                var clone = r.clone();
                if (r.ok) {
                    try {
                        // just simply return the text
                        if (isText) resolve(await r.text());

                        // try to parse the json result
                        return resolve(await r.json());
                    } catch (err) {
                        return resolve(clone.text());
                    }
                }
                else {
                    reject();
                }
            }).catch(error => {
                console.log(error);
                reject();
            });
        });
    };


    const post = async (url, data) => {
        fetcher.set(true);
        try {
            return await manageResult(
                fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: data ? JSON.stringify(data) : null
                })
            );
        } catch (err) {
            fetcher.set(false);
            console.log("ERROR:");
            console.log(err);
        }
    };

    const get = async url => {
        fetcher.set(true);
        try {
            return await manageResult(fetch(url), false);
        } catch (err) {
            fetcher.set(false);
            console.log(err);
        }
    };

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
            console.log("broadcasting: " + event);
            (this.handlers[event] || []).forEach(handler => {
                if (handler instanceof Function) {
                    handler(data);
                }
            });
        }

    }

    var eventbus$1 = new eventbus();

    const state = writable({
        modules: []
    });

    const selectModuleByNamespace = async namespace => {
        try {
            if (!namespace) return;
            let moduleResult = await getModuleFromServer(namespace);

            // set the last module
            localStorage.setItem("lastModule", JSON.stringify({
                namespace: moduleResult.namespace,
                application: moduleResult.applicationName
            }));

            state.update(s => {
                return {
                    ...s,
                    module: { ...moduleResult },
                    application: (s.applications || []).find(a => a.name == moduleResult.applicationName)
                };
            });
        } catch (ex) {

            state.update(s => {
                return {
                    ...s,
                    module: null,
                    application: null
                };
            });
        }
    };

    const saveCode = async (code) => {

        if (code == "") code = " ";

        var ms = get_store_value(state);
        var module = ms.module;

        if (!module || !module.namespace || !code) {
            console.log("Invalid \"Parse Code\"", module, code);
            return;
        }
        // start processing
        state.update(s => ({
            ...s,
            processing: true
        }));

        // get the compilation result and fix the current module
        var compilationResult = await post("/document/" + module.namespace, { code: code });
        state.update(s => {
            return {
                ...s,
                processing: false,
                runId: getTicks(),
                module: {
                    ...s.module,
                    //text: code,
                    compilationResult: compilationResult
                }
            };
        });
    };

    const getTicks = () => {
        var yourDate = new Date();  // for example

        // the number of .net ticks at the unix epoch
        var epochTicks = 621355968000000000;

        // there are 10000 .net ticks per millisecond
        var ticksPerMillisecond = 10000;

        // calculate the total number of .net ticks for your date
        var yourTicks = epochTicks + (yourDate.getTime() * ticksPerMillisecond);

        return yourTicks;
    };

    const compile = async (code) => {
        if (code == "") code = " ";

        var ms = get_store_value(state);
        var module = ms.module;

        if (!module || !module.namespace || !code) {
            console.log("Invalid \"Parse Code\"", module, code);
            return;
        }

        // get the compilation result and fix the current module
        var compilationResult = await post("/document/compile/" + module.namespace, { code: code });
        state.update(s => {

            //

            return {
                ...s,
                module: {
                    ...s.module,
                    compilationResult: compilationResult
                }
            };
        });
    };

    const getModuleFromServer = async (namespace) => {
        if (!namespace) return;
        var encodedURI = encodeURI(namespace);
        var url = `/document/${encodedURI}`;
        var result = await get(url);

        return result;
    };

    /** MODAL TOGGLES */

    const toggleAddFileDialog = () => {
        state.update((s) => ({
            ...s,
            showAddFileDialog: !!!s.showAddFileDialog
        }));
    };


    const toggleAddApplicationDialog = () => {
        state.update((s) => ({
            ...s,
            showAddApplicationDialog: !!!s.showAddApplicationDialog
        }));
    };

    const toggleAddProjectDialog = () => {
        state.update((s) => ({
            ...s,
            showAddProjectDialog: !!!s.showAddProjectDialog
        }));
    };

    const toggleRefactoringDialog = () => {
        state.update((s) => ({
            ...s,
            showRefactoringDialog: !!!s.showRefactoringDialog
        }));
    };

    const toggleJsonSchemaDialog = () => {
        state.update((s) => ({
            ...s,
            showJsonSchemaDialog: !!!s.showJsonSchemaDialog
        }));
    };

    /** PROJECT FUNCTIONS */

    const resetProjects = () => {
        localStorage.removeItem("projects");
        localStorage.removeItem("last opened project");
        state.update(s => ({
            ...s,
            projects: [],
            project: null
        }));
    };

    const loadProjects = () => {
        var projectsJson = localStorage.getItem("projects");
        if (projectsJson != null) {
            var projects = JSON.parse(projectsJson);

            state.update(s => ({
                ...s,

                // all the projects in our project cache
                projects,

                // selected project
                project: null
            }));
        }
    };

    const loadLastProject = () => {
        var lastProject = localStorage.getItem("last opened project");
        if (lastProject != null) {
            console.log(lastProject);
            selectProject(lastProject);
        }
    };

    const loadLastModule = () => {
        var lastModule = localStorage.getItem("lastModule");
        if (lastModule != null) {
            let lm = JSON.parse(lastModule);
            selectModuleByNamespace(lm.namespace);
        }
    };

    const openProject = (projectPath) => {
        console.log("Open Project");
        // open the selected project
        var projectsJson = localStorage.getItem("projects") || "[]";
        if (projectsJson != null) {
            var projects = JSON.parse(projectsJson);
            if (projects.indexOf(projectPath) == -1) {
                projects.push(projectPath);
                localStorage.setItem("projects", JSON.stringify(projects));

                state.update(s => ({
                    ...s,
                    projects
                }));
            }

            selectProject(projectPath);
        }
    };

    const selectProject = projectPath => {

        localStorage.setItem("last opened project", projectPath);

        // if the app is null, we'll want to clear the stateStore.application
        // but do nothing else.
        if (!projectPath) {
            stateStore.update(s => {
                return ({
                    ...s,
                    project: null,
                    module: null,
                    application: null
                });
            });
        }
        else {
            // do something
            var path = projectPath.replace(/\//g, "__$__").replace(/\\/g, "__$__");
            post("/project/init/" + path, {});  //<-- do not await
            state.update(s => {
                return ({
                    ...s,
                    project: projectPath,
                    module: null,
                    application: null
                });
            });
        }
    };

    const setDirectoryInterator = (directoryInteractor) => {
        state.update(s => {
            setTimeout(() => {
                loadLastModule();
            }, 200);

            delete directoryInteractor.namespace;
            return {
                ...s,
                ...directoryInteractor
            };
        });
    };

    const setApplicationInterator = applicationInteractor => {
        state.update(s => {
            return {
                ...s,
                application: applicationInteractor
            };
        });
    };



    /** LOGGING AND MONITORING */

    const log = data => {


        /*
        Gets a message and appends it to the log of messages.
        Use this freely and intensively to monitor and log 
        what is happening in the application.
        */
        state.update(s => {

            var messages = s.messages || [];
            if (!data.message && data) {
                messages.unshift({
                    timestamp: new Date().toLocaleString(),
                    message: data
                });
                console.info(messages[0]);
            }

            return ({
                ...s,
                messages
            });
        });
    };




    /** KEYBOARD EVENT HANDLERS */

    const init$1 = () => {

        eventbus$1.subscribe("saving", text => {
            // save the module
            saveCode(text);
        });


        eventbus$1.subscribe("navigateTo", async term => {
            let store = get_store_value(state);
            if (!store.module || !store.module.namespace) return;

            let namespace = store.module.namespace;
            if (!term || !namespace) return;
            else {
                let fragment = await get("/document/find/" + namespace + "/" + term);
                eventbus$1.broadcast("navigate", fragment);
            }
        });


        const navigationStack = [];
        eventbus$1.subscribe("navigate", (fragment) => {
            let store = get_store_value(state);
            if (!fragment) return;

            let namespace = (store && store.module) ? store.module.namespace : "__UNKNOWN";
            if (fragment.namespace !== namespace && fragment.namespace) {
                if (navigationStack.indexOf(fragment.namespace) == -1) {
                    navigationStack.push(fragment.namespace);
                }
                navigate$1("/editor/" + fragment.namespace);
                selectModuleByNamespace(fragment.namespace);
            }

            if (fragment.position) {
                setTimeout(() => {
                    var pos = {
                        lineNumber: fragment.position.lineStart + 1,
                        column: fragment.position.columnStart + 1,
                    };
                    eventbus$1.broadcast("navigateToToken", pos);
                }, 500);
            }


        });

        eventbus$1.subscribe("back", () => {
            // not working yet...
            if (navigationStack.length > 0) {
                var store = get_store_value(state);
                let namespace = navigationStack.pop();
                while (namespace == store.selectedModule) {
                    namespace = navigationStack.pop();
                }
                if (namespace !== store.selectedModule && namespace) {
                    navigate("/editor/" + namespace);
                }
            }
        });

        eventbus$1.subscribe("start refactor", async (term) => {
            // This is the refactoring of certain terms in our
            // application landscape. Use this function to start
            // the refactoring process.

            var store = get_store_value(state);
            var namespace = (store.module || {}).namespace;

            console.log(term);

            if (namespace) {
                try {
                    var content = await get(`/api/component/info/${namespace}/${term}`);
                    if (!Array.isArray(content)) return;
                    state.update(s => ({
                        ...s,
                        showRefactoringDialog: true,
                        refactoring: {
                            title: term,
                            namespace,
                            content
                        }
                    }));
                }
                catch (ex) {
                    // do nothing with the exception
                }
            }
        });

        eventbus$1.subscribe("json_schema", async term => {
            var store = get_store_value(state);
            var namespace = (store.module || {}).namespace;

            if (namespace) {
                try {
                    var body = {
                        rootNode: term,
                        namespace
                    };
                    var json = await post(`/json`, body);

                    if (json.status && json.status !== 200) return;

                    state.update(s => ({
                        ...s,
                        showJsonSchemaDialog: true,
                        schema: json.schemaText
                    }));
                }
                catch (ex) {
                    console.log(ex);
                }
            }
        });

        eventbus$1.subscribe("publish", async (module) => {
            console.log(module);
            if (!module || !module.namespace) return;

            var result = await post(`/document/publish/${module.namespace}`, {});

        });

    };

    /* src\Forms\SelectProject.svelte generated by Svelte v3.16.7 */

    const { console: console_1 } = globals;
    const file = "src\\Forms\\SelectProject.svelte";

    function create_fragment$2(ctx) {
    	let form;
    	let div0;
    	let t1;
    	let div1;
    	let label;
    	let t3;
    	let input;
    	let t4;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element$1("form");
    			div0 = element$1("div");
    			div0.textContent = "Because of the limitations of the web we cannot select a directory from\r\n        the file system. This is why we will need a full path to open the\r\n        correct directory.";
    			t1 = space();
    			div1 = element$1("div");
    			label = element$1("label");
    			label.textContent = "Project Full Path";
    			t3 = space();
    			input = element$1("input");
    			t4 = space();
    			button = element$1("button");
    			button.textContent = "Submit";
    			attr_dev(div0, "class", "note svelte-1xy6fkm");
    			add_location(div0, file, 30, 4, 730);
    			attr_dev(label, "for", "project_path_001");
    			add_location(label, file, 36, 8, 985);
    			attr_dev(input, "id", "project_path_001");
    			add_location(input, file, 37, 8, 1050);
    			attr_dev(div1, "class", "form--field");
    			add_location(div1, file, 35, 4, 950);
    			attr_dev(button, "type", "button");
    			add_location(button, file, 40, 4, 1133);
    			attr_dev(form, "class", "form");
    			add_location(form, file, 29, 0, 705);

    			dispose = [
    				listen_dev(input, "change", /*changeValue*/ ctx[1]("path"), false, false, false),
    				listen_dev(button, "click", /*submitForm*/ ctx[2], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div0);
    			append_dev(form, t1);
    			append_dev(form, div1);
    			append_dev(div1, label);
    			append_dev(div1, t3);
    			append_dev(div1, input);
    			append_dev(form, t4);
    			append_dev(form, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $app;
    	let { close } = $$props;
    	var app = writable();
    	validate_store(app, "app");
    	component_subscribe($$self, app, value => $$invalidate(4, $app = value));

    	const changeValue = name => e => {
    		set_store_value(app, $app = { ...$app, [name]: e.target.value });
    	};

    	const submitForm = async () => {
    		try {
    			let validateApp = ({ path }) => {
    				return path;
    			};

    			if (validateApp($app)) {
    				let path = $app.path;
    				openProject(path);
    				close();
    			}
    		} catch(err) {
    			console.log(err);
    		}
    	};

    	const writable_props = ["close"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<SelectProject> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("close" in $$props) $$invalidate(3, close = $$props.close);
    	};

    	$$self.$capture_state = () => {
    		return { close, app, $app };
    	};

    	$$self.$inject_state = $$props => {
    		if ("close" in $$props) $$invalidate(3, close = $$props.close);
    		if ("app" in $$props) $$invalidate(0, app = $$props.app);
    		if ("$app" in $$props) app.set($app = $$props.$app);
    	};

    	return [app, changeValue, submitForm, close];
    }

    class SelectProject extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { close: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectProject",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*close*/ ctx[3] === undefined && !("close" in props)) {
    			console_1.warn("<SelectProject> was created without expected prop 'close'");
    		}
    	}

    	get close() {
    		throw new Error("<SelectProject>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set close(value) {
    		throw new Error("<SelectProject>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Forms\CreateFile.svelte generated by Svelte v3.16.7 */
    const file_1 = "src\\Forms\\CreateFile.svelte";

    function create_fragment$3(ctx) {
    	let form;
    	let div0;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let div1;
    	let label1;
    	let t4;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let t13;
    	let div2;
    	let label2;
    	let t15;
    	let input1;
    	let t16;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element$1("form");
    			div0 = element$1("div");
    			label0 = element$1("label");
    			label0.textContent = "File Name";
    			t1 = space();
    			input0 = element$1("input");
    			t2 = space();
    			div1 = element$1("div");
    			label1 = element$1("label");
    			label1.textContent = "Type";
    			t4 = space();
    			select = element$1("select");
    			option0 = element$1("option");
    			option1 = element$1("option");
    			option1.textContent = "Component";
    			option2 = element$1("option");
    			option2.textContent = "Feature";
    			option3 = element$1("option");
    			option3.textContent = "Database";
    			option4 = element$1("option");
    			option4.textContent = "Endpoint";
    			option5 = element$1("option");
    			option5.textContent = "Model";
    			option6 = element$1("option");
    			option6.textContent = "Story";
    			option7 = element$1("option");
    			option7.textContent = "Documentation";
    			option8 = element$1("option");
    			option8.textContent = "Empty";
    			t13 = space();
    			div2 = element$1("div");
    			label2 = element$1("label");
    			label2.textContent = "Application Name";
    			t15 = space();
    			input1 = element$1("input");
    			t16 = space();
    			button = element$1("button");
    			button.textContent = "Submit";
    			attr_dev(label0, "for", "cf_001");
    			add_location(label0, file_1, 37, 8, 972);
    			attr_dev(input0, "id", "cf_001");
    			add_location(input0, file_1, 38, 8, 1019);
    			attr_dev(div0, "class", "form--field");
    			add_location(div0, file_1, 36, 4, 937);
    			attr_dev(label1, "for", "cf_002");
    			add_location(label1, file_1, 42, 8, 1119);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file_1, 44, 12, 1219);
    			option1.__value = "Component";
    			option1.value = option1.__value;
    			add_location(option1, file_1, 45, 12, 1243);
    			option2.__value = "Feature";
    			option2.value = option2.__value;
    			add_location(option2, file_1, 46, 12, 1283);
    			option3.__value = "Database";
    			option3.value = option3.__value;
    			add_location(option3, file_1, 47, 12, 1321);
    			option4.__value = "Endpoint";
    			option4.value = option4.__value;
    			add_location(option4, file_1, 48, 12, 1360);
    			option5.__value = "Model";
    			option5.value = option5.__value;
    			add_location(option5, file_1, 49, 12, 1399);
    			option6.__value = "Story";
    			option6.value = option6.__value;
    			add_location(option6, file_1, 50, 12, 1435);
    			option7.__value = "Documentation";
    			option7.value = option7.__value;
    			add_location(option7, file_1, 51, 12, 1471);
    			option8.__value = "Empty";
    			option8.value = option8.__value;
    			add_location(option8, file_1, 52, 12, 1515);
    			attr_dev(select, "id", "cf_002");
    			if (/*$file*/ ctx[0].type === void 0) add_render_callback(() => /*select_change_handler*/ ctx[4].call(select));
    			add_location(select, file_1, 43, 8, 1161);
    			attr_dev(div1, "class", "form--field");
    			add_location(div1, file_1, 41, 4, 1084);
    			attr_dev(label2, "for", "cf_003");
    			add_location(label2, file_1, 57, 8, 1611);
    			attr_dev(input1, "id", "cf_003");
    			add_location(input1, file_1, 58, 8, 1665);
    			attr_dev(div2, "class", "form--field");
    			add_location(div2, file_1, 56, 4, 1576);
    			attr_dev(button, "type", "button");
    			add_location(button, file_1, 62, 4, 1789);
    			attr_dev(form, "class", "form");
    			add_location(form, file_1, 35, 0, 912);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    				listen_dev(select, "change", /*select_change_handler*/ ctx[4]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    				listen_dev(button, "click", /*submitForm*/ ctx[2], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*$file*/ ctx[0].name);
    			append_dev(form, t2);
    			append_dev(form, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t4);
    			append_dev(div1, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(select, option4);
    			append_dev(select, option5);
    			append_dev(select, option6);
    			append_dev(select, option7);
    			append_dev(select, option8);
    			select_option(select, /*$file*/ ctx[0].type);
    			append_dev(form, t13);
    			append_dev(form, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t15);
    			append_dev(div2, input1);
    			set_input_value(input1, /*$file*/ ctx[0].appName);
    			append_dev(form, t16);
    			append_dev(form, button);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$file*/ 1 && input0.value !== /*$file*/ ctx[0].name) {
    				set_input_value(input0, /*$file*/ ctx[0].name);
    			}

    			if (dirty & /*$file*/ 1) {
    				select_option(select, /*$file*/ ctx[0].type);
    			}

    			if (dirty & /*$file*/ 1 && input1.value !== /*$file*/ ctx[0].appName) {
    				set_input_value(input1, /*$file*/ ctx[0].appName);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $file;
    	var file = writable({ type: "Component" });
    	validate_store(file, "file");
    	component_subscribe($$self, file, value => $$invalidate(0, $file = value));

    	const submitForm = async () => {
    		try {
    			let validateFile = ({ name, type, appName }) => {
    				return name && type && appName;
    			};

    			let isValid = validateFile($file);

    			if (isValid) {
    				await post("/file/.", $file);
    				toggleAddFileDialog();
    			}
    		} catch(err) {
    			console.log(err);
    		}
    	};

    	state.subscribe(s => {
    		if (!s.application) return;

    		file.update(f => {
    			return { ...f, appName: s.application.name };
    		});
    	});

    	function input0_input_handler() {
    		$file.name = this.value;
    		file.set($file);
    	}

    	function select_change_handler() {
    		$file.type = select_value(this);
    		file.set($file);
    	}

    	function input1_input_handler() {
    		$file.appName = this.value;
    		file.set($file);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("file" in $$props) $$invalidate(1, file = $$props.file);
    		if ("$file" in $$props) file.set($file = $$props.$file);
    	};

    	return [
    		$file,
    		file,
    		submitForm,
    		input0_input_handler,
    		select_change_handler,
    		input1_input_handler
    	];
    }

    class CreateFile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateFile",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Forms\CreateApplication.svelte generated by Svelte v3.16.7 */
    const file$1 = "src\\Forms\\CreateApplication.svelte";

    function create_fragment$4(ctx) {
    	let form;
    	let div;
    	let label;
    	let t1;
    	let input;
    	let t2;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element$1("form");
    			div = element$1("div");
    			label = element$1("label");
    			label.textContent = "Application Name";
    			t1 = space();
    			input = element$1("input");
    			t2 = space();
    			button = element$1("button");
    			button.textContent = "Submit";
    			attr_dev(label, "for", "ca_001");
    			add_location(label, file$1, 28, 8, 786);
    			attr_dev(input, "id", "ca_001");
    			add_location(input, file$1, 29, 8, 840);
    			attr_dev(div, "class", "form--field");
    			add_location(div, file$1, 27, 4, 751);
    			attr_dev(button, "type", "button");
    			add_location(button, file$1, 32, 4, 913);
    			attr_dev(form, "class", "form");
    			add_location(form, file$1, 26, 0, 726);

    			dispose = [
    				listen_dev(input, "change", /*changeValue*/ ctx[1]("name"), false, false, false),
    				listen_dev(button, "click", /*submitForm*/ ctx[2], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div);
    			append_dev(div, label);
    			append_dev(div, t1);
    			append_dev(div, input);
    			append_dev(form, t2);
    			append_dev(form, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $app;
    	var app = writable();
    	validate_store(app, "app");
    	component_subscribe($$self, app, value => $$invalidate(3, $app = value));

    	const changeValue = name => e => {
    		set_store_value(app, $app = { ...$app, [name]: e.target.value });
    	};

    	const submitForm = async () => {
    		try {
    			let validateApp = ({ name }) => {
    				return name;
    			};

    			let isValid = validateApp($app);

    			if (isValid) {
    				await post("/application", $app);
    				toggleAddApplicationDialog();
    			}
    		} catch(err) {
    			console.log(err);
    		}
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("app" in $$props) $$invalidate(0, app = $$props.app);
    		if ("$app" in $$props) app.set($app = $$props.$app);
    	};

    	return [app, changeValue, submitForm];
    }

    class CreateApplication extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateApplication",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Components\Modal.svelte generated by Svelte v3.16.7 */
    const file$2 = "src\\Components\\Modal.svelte";

    function create_fragment$5(ctx) {
    	let div0;
    	let t0;
    	let div3;
    	let div1;
    	let t1;
    	let t2;
    	let i;
    	let t3;
    	let div2;
    	let div3_class_value;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div0 = element$1("div");
    			t0 = space();
    			div3 = element$1("div");
    			div1 = element$1("div");
    			t1 = text(/*title*/ ctx[0]);
    			t2 = space();
    			i = element$1("i");
    			t3 = space();
    			div2 = element$1("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div0, "class", "background svelte-17bqteb");
    			toggle_class(div0, "show", /*show*/ ctx[1]);
    			add_location(div0, file$2, 8, 0, 214);
    			attr_dev(i, "class", "fa fa-times svelte-17bqteb");
    			add_location(i, file$2, 13, 8, 344);
    			attr_dev(div1, "class", "title svelte-17bqteb");
    			add_location(div1, file$2, 11, 4, 298);
    			attr_dev(div2, "class", "content svelte-17bqteb");
    			add_location(div2, file$2, 16, 4, 422);
    			attr_dev(div3, "class", div3_class_value = "modal " + /*size*/ ctx[3] + " svelte-17bqteb");
    			toggle_class(div3, "show", /*show*/ ctx[1]);
    			add_location(div3, file$2, 10, 0, 255);
    			dispose = listen_dev(i, "click", stop_propagation(/*close*/ ctx[2]), false, false, true);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			append_dev(div1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, i);
    			append_dev(div3, t3);
    			append_dev(div3, div2);

    			if (default_slot) {
    				default_slot.m(div2, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*show*/ 2) {
    				toggle_class(div0, "show", /*show*/ ctx[1]);
    			}

    			if (!current || dirty & /*title*/ 1) set_data_dev(t1, /*title*/ ctx[0]);

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 16) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[4], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null));
    			}

    			if (!current || dirty & /*size*/ 8 && div3_class_value !== (div3_class_value = "modal " + /*size*/ ctx[3] + " svelte-17bqteb")) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (dirty & /*size, show*/ 10) {
    				toggle_class(div3, "show", /*show*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { title = "Unknown Modal" } = $$props;
    	let { show = false } = $$props;

    	let { close = () => {
    		
    	} } = $$props;

    	let { size = "normal" } = $$props;
    	const writable_props = ["title", "show", "close", "size"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("show" in $$props) $$invalidate(1, show = $$props.show);
    		if ("close" in $$props) $$invalidate(2, close = $$props.close);
    		if ("size" in $$props) $$invalidate(3, size = $$props.size);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { title, show, close, size };
    	};

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("show" in $$props) $$invalidate(1, show = $$props.show);
    		if ("close" in $$props) $$invalidate(2, close = $$props.close);
    		if ("size" in $$props) $$invalidate(3, size = $$props.size);
    	};

    	return [title, show, close, size, $$scope, $$slots];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { title: 0, show: 1, close: 2, size: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get title() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get show() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get close() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set close(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\TabControl\Tabs.svelte generated by Svelte v3.16.7 */
    const file$3 = "src\\Components\\TabControl\\Tabs.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "tabs svelte-8bxw33");
    			add_location(div, file$3, 60, 0, 1580);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 16) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[4], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const TABS = {};

    function instance$6($$self, $$props, $$invalidate) {
    	const tabs = [];
    	const panels = [];
    	const selectedTab = writable(null);
    	const selectedPanel = writable(null);

    	setContext(TABS, {
    		registerTab: tab => {
    			tabs.push(tab);
    			selectedTab.update(current => current || tab);

    			onDestroy(() => {
    				const i = tabs.indexOf(tab);
    				tabs.splice(i, 1);

    				selectedTab.update(current => current === tab
    				? tabs[i] || tabs[tabs.length - 1]
    				: current);
    			});
    		},
    		registerPanel: panel => {
    			panels.push(panel);
    			selectedPanel.update(current => current || panel);

    			onDestroy(() => {
    				const i = panels.indexOf(panel);
    				panels.splice(i, 1);

    				selectedPanel.update(current => current === panel
    				? panels[i] || panels[panels.length - 1]
    				: current);
    			});
    		},
    		selectTab: tab => {
    			const i = tabs.indexOf(tab);
    			selectedTab.set(tab);
    			selectedPanel.set(panels[i]);
    		},
    		selectedTab,
    		selectedPanel
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [tabs, panels, selectedTab, selectedPanel, $$scope, $$slots];
    }

    class Tabs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\Components\TabControl\TabList.svelte generated by Svelte v3.16.7 */

    const file$4 = "src\\Components\\TabControl\\TabList.svelte";

    function create_fragment$7(ctx) {
    	let div0;
    	let t;
    	let div1;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div0 = element$1("div");
    			if (default_slot) default_slot.c();
    			t = space();
    			div1 = element$1("div");
    			attr_dev(div0, "class", "tab-list svelte-zvi86r");
    			add_location(div0, file$4, 0, 0, 0);
    			attr_dev(div1, "class", "tab-list--sep svelte-zvi86r");
    			add_location(div1, file$4, 4, 0, 48);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			insert_dev(target, t, anchor);
    			insert_dev(target, div1, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 1) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[0], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [$$scope, $$slots];
    }

    class TabList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TabList",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\Components\TabControl\TabPanel.svelte generated by Svelte v3.16.7 */

    // (11:0) {#if $selectedPanel === panel}
    function create_if_block$1(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 16) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[4], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(11:0) {#if $selectedPanel === panel}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$selectedPanel*/ ctx[0] === /*panel*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$selectedPanel*/ ctx[0] === /*panel*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $selectedPanel;
    	const panel = {};
    	const { registerPanel, selectedPanel } = getContext(TABS);
    	validate_store(selectedPanel, "selectedPanel");
    	component_subscribe($$self, selectedPanel, value => $$invalidate(0, $selectedPanel = value));
    	registerPanel(panel);
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$selectedPanel" in $$props) selectedPanel.set($selectedPanel = $$props.$selectedPanel);
    	};

    	return [$selectedPanel, panel, selectedPanel, registerPanel, $$scope, $$slots];
    }

    class TabPanel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TabPanel",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\Components\TabControl\Tab.svelte generated by Svelte v3.16.7 */
    const file$5 = "src\\Components\\TabControl\\Tab.svelte";

    function create_fragment$9(ctx) {
    	let button;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			button = element$1("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", "svelte-faqw6y");
    			toggle_class(button, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
    			add_location(button, file$5, 10, 0, 212);
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 32) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[5], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null));
    			}

    			if (dirty & /*$selectedTab, tab*/ 3) {
    				toggle_class(button, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $selectedTab;
    	const tab = {};
    	const { registerTab, selectTab, selectedTab } = getContext(TABS);
    	validate_store(selectedTab, "selectedTab");
    	component_subscribe($$self, selectedTab, value => $$invalidate(0, $selectedTab = value));
    	registerTab(tab);
    	let { $$slots = {}, $$scope } = $$props;
    	const click_handler = () => selectTab(tab);

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$selectedTab" in $$props) selectedTab.set($selectedTab = $$props.$selectedTab);
    	};

    	return [
    		$selectedTab,
    		tab,
    		selectTab,
    		selectedTab,
    		registerTab,
    		$$scope,
    		$$slots,
    		click_handler
    	];
    }

    class Tab extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tab",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\Components\Panel.svelte generated by Svelte v3.16.7 */

    const file$6 = "src\\Components\\Panel.svelte";

    function create_fragment$a(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "panel svelte-5yb82o");
    			attr_dev(div, "style", /*style*/ ctx[0]);
    			add_location(div, file$6, 3, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 2) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    			}

    			if (!current || dirty & /*style*/ 1) {
    				attr_dev(div, "style", /*style*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { style = "" } = $$props;
    	const writable_props = ["style"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Panel> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { style };
    	};

    	$$self.$inject_state = $$props => {
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    	};

    	return [style, $$scope, $$slots];
    }

    class Panel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { style: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Panel",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get style() {
    		throw new Error("<Panel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Panel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\PageViewer.svelte generated by Svelte v3.16.7 */
    const file$7 = "src\\Components\\PageViewer.svelte";

    function create_fragment$b(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "page-wrapper svelte-1gvqsf5");
    			add_location(div, file$7, 34, 0, 1011);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			/*div_binding*/ ctx[5](div);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 8) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[3], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			/*div_binding*/ ctx[5](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let pageWrapper;

    	function resize() {
    		if (!pageWrapper) return;
    		var scaleX = pageWrapper.clientWidth / 900;
    		var height = pageWrapper.parentElement.clientHeight;

    		if (scaleX < 1.3) {
    			height = height / scaleX;
    			pageWrapper.setAttribute("style", `transform: scale(${scaleX});`);
    		}

    		if (pageWrapper.firstElementChild) {
    			var value = "calc(" + height + "px - 5rem)";
    			$$invalidate(0, pageWrapper.firstElementChild.style.height = value, pageWrapper);
    			$$invalidate(0, pageWrapper.firstElementChild.style.minHeight = value, pageWrapper);
    			$$invalidate(0, pageWrapper.firstElementChild.style.maxHeight = value, pageWrapper);
    		}
    	}

    	function watch() {
    		var ro = new ResizeObserver(resize);
    		ro.observe(document.body);
    	}

    	onMount(() => {
    		watch();

    		setTimeout(() => {
    			resize();
    		});
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, pageWrapper = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("pageWrapper" in $$props) $$invalidate(0, pageWrapper = $$props.pageWrapper);
    	};

    	return [pageWrapper, resize, watch, $$scope, $$slots, div_binding];
    }

    class PageViewer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PageViewer",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src\Components\ImageViewer.svelte generated by Svelte v3.16.7 */
    const file$8 = "src\\Components\\ImageViewer.svelte";

    function create_fragment$c(ctx) {
    	let div5;
    	let div0;
    	let div0_style_value;
    	let t0;
    	let div1;
    	let a;
    	let i0;
    	let t1;
    	let div2;
    	let i1;
    	let t2;
    	let div3;
    	let i2;
    	let t3;
    	let div4;
    	let dispose;

    	const block = {
    		c: function create() {
    			div5 = element$1("div");
    			div0 = element$1("div");
    			t0 = space();
    			div1 = element$1("div");
    			a = element$1("a");
    			i0 = element$1("i");
    			t1 = space();
    			div2 = element$1("div");
    			i1 = element$1("i");
    			t2 = space();
    			div3 = element$1("div");
    			i2 = element$1("i");
    			t3 = space();
    			div4 = element$1("div");
    			attr_dev(div0, "class", "content svelte-f17q0g");
    			attr_dev(div0, "style", div0_style_value = `transform: scale(${/*scale*/ ctx[3]}) translate(${/*imgH*/ ctx[5]}px, ${/*imgV*/ ctx[6]}px);z-index:-1;`);
    			add_location(div0, file$8, 84, 4, 2302);
    			attr_dev(i0, "class", "fa fa-external-link");
    			add_location(i0, file$8, 96, 13, 2693);
    			attr_dev(a, "href", /*url*/ ctx[0]);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "class", "svelte-f17q0g");
    			add_location(a, file$8, 95, 8, 2649);
    			attr_dev(div1, "class", "popout svelte-f17q0g");
    			add_location(div1, file$8, 94, 4, 2619);
    			attr_dev(i1, "class", "fa fa-plus");
    			add_location(i1, file$8, 99, 8, 2830);
    			attr_dev(div2, "class", "scale--inc svelte-f17q0g");
    			add_location(div2, file$8, 98, 4, 2764);
    			attr_dev(i2, "class", "fa fa-minus");
    			add_location(i2, file$8, 102, 8, 2938);
    			attr_dev(div3, "class", "scale--dec svelte-f17q0g");
    			add_location(div3, file$8, 101, 4, 2872);
    			attr_dev(div4, "class", "overlay");
    			add_location(div4, file$8, 104, 4, 2981);
    			add_location(div5, file$8, 83, 0, 2266);

    			dispose = [
    				listen_dev(div0, "mousedown", /*startDrag*/ ctx[7], false, false, false),
    				listen_dev(div0, "mousemove", /*drag*/ ctx[8], false, false, false),
    				listen_dev(div0, "mouseup", /*stopDrag*/ ctx[9], false, false, false),
    				listen_dev(div0, "mouseleave", /*stopDrag*/ ctx[9], false, false, false),
    				listen_dev(div0, "mousewheel", /*zoom*/ ctx[10], false, false, false),
    				listen_dev(div2, "click", /*click_handler*/ ctx[20], false, false, false),
    				listen_dev(div3, "click", /*click_handler_1*/ ctx[21], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			/*div0_binding*/ ctx[18](div0);
    			append_dev(div5, t0);
    			append_dev(div5, div1);
    			append_dev(div1, a);
    			append_dev(a, i0);
    			/*i0_binding*/ ctx[19](i0);
    			append_dev(div5, t1);
    			append_dev(div5, div2);
    			append_dev(div2, i1);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div3, i2);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			/*div5_binding*/ ctx[22](div5);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*scale, imgH, imgV*/ 104 && div0_style_value !== (div0_style_value = `transform: scale(${/*scale*/ ctx[3]}) translate(${/*imgH*/ ctx[5]}px, ${/*imgV*/ ctx[6]}px);z-index:-1;`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (dirty & /*url*/ 1) {
    				attr_dev(a, "href", /*url*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			/*div0_binding*/ ctx[18](null);
    			/*i0_binding*/ ctx[19](null);
    			/*div5_binding*/ ctx[22](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { url = null } = $$props;
    	let oldUrl;
    	let namespace;
    	let imgContainer;
    	let content;
    	let parsed = false;
    	let svgDocument;
    	let scale = 1;
    	let draging = false;
    	let img;
    	let initialX = 0;
    	let initialY = 0;
    	let imgH = 0;
    	let imgV = 0;

    	function startDrag(e) {
    		initialX = e.clientX - imgH;
    		initialY = e.clientY - imgV;
    		draging = true;
    		e.preventDefault();
    	}

    	function drag(e) {
    		if (!draging) return;
    		$$invalidate(5, imgH = e.clientX - initialX);
    		$$invalidate(6, imgV = e.clientY - initialY);
    		e.preventDefault();
    	}

    	function stopDrag(e) {
    		draging = false;
    		e.preventDefault();
    	}

    	function zoom(e) {
    		if (e.deltaY < 0) $$invalidate(3, scale += 0.05); else $$invalidate(3, scale -= 0.05);
    		e.preventDefault();
    	}

    	state.subscribe(s => {
    		$$invalidate(12, namespace = (s.module || ({})).namespace);
    	});

    	const writable_props = ["url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ImageViewer> was created with unknown prop '${key}'`);
    	});

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, content = $$value);
    		});
    	}

    	function i0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, img = $$value);
    		});
    	}

    	const click_handler = () => $$invalidate(3, scale += 0.1);
    	const click_handler_1 = () => $$invalidate(3, scale -= 0.1);

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, imgContainer = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	$$self.$capture_state = () => {
    		return {
    			url,
    			oldUrl,
    			namespace,
    			imgContainer,
    			content,
    			parsed,
    			svgDocument,
    			scale,
    			draging,
    			img,
    			initialX,
    			initialY,
    			imgH,
    			imgV
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    		if ("oldUrl" in $$props) $$invalidate(11, oldUrl = $$props.oldUrl);
    		if ("namespace" in $$props) $$invalidate(12, namespace = $$props.namespace);
    		if ("imgContainer" in $$props) $$invalidate(1, imgContainer = $$props.imgContainer);
    		if ("content" in $$props) $$invalidate(2, content = $$props.content);
    		if ("parsed" in $$props) parsed = $$props.parsed;
    		if ("svgDocument" in $$props) svgDocument = $$props.svgDocument;
    		if ("scale" in $$props) $$invalidate(3, scale = $$props.scale);
    		if ("draging" in $$props) draging = $$props.draging;
    		if ("img" in $$props) $$invalidate(4, img = $$props.img);
    		if ("initialX" in $$props) initialX = $$props.initialX;
    		if ("initialY" in $$props) initialY = $$props.initialY;
    		if ("imgH" in $$props) $$invalidate(5, imgH = $$props.imgH);
    		if ("imgV" in $$props) $$invalidate(6, imgV = $$props.imgV);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*url, oldUrl, content, namespace*/ 6149) {
    			 {
    				if (url && url != oldUrl) {
    					$$invalidate(11, oldUrl = url);

    					setTimeout(async () => {
    						var r = await get(url);
    						$$invalidate(2, content.innerHTML = r, content);

    						setTimeout(() => {
    							var text = [...content.getElementsByTagName("text")];

    							text.forEach(item => {
    								item.addEventListener("click", async event => {
    									if (event.ctrlKey) {
    										var fragment = await get(`/document/find/${namespace}/${event.target.textContent}`);
    										eventbus$1.broadcast("navigate", fragment);
    									} else {
    										eventbus$1.broadcast("start refactor", event.target.textContent);
    									}
    								});
    							});
    						});
    					});
    				}
    			}
    		}
    	};

    	return [
    		url,
    		imgContainer,
    		content,
    		scale,
    		img,
    		imgH,
    		imgV,
    		startDrag,
    		drag,
    		stopDrag,
    		zoom,
    		oldUrl,
    		namespace,
    		draging,
    		initialX,
    		initialY,
    		parsed,
    		svgDocument,
    		div0_binding,
    		i0_binding,
    		click_handler,
    		click_handler_1,
    		div5_binding
    	];
    }

    class ImageViewer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { url: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ImageViewer",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get url() {
    		throw new Error("<ImageViewer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<ImageViewer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\FileExplorer_Application_Module.svelte generated by Svelte v3.16.7 */
    const file$9 = "src\\Components\\FileExplorer_Application_Module.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (14:0) {#if modules.length > 0}
    function create_if_block$2(ctx) {
    	let h2;
    	let t0;
    	let t1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value = /*modules*/ ctx[0];
    	const get_key = ctx => /*module*/ ctx[5].name;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			h2 = element$1("h2");
    			t0 = text(/*title*/ ctx[1]);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h2, "class", "svelte-36b3ta");
    			add_location(h2, file$9, 14, 4, 337);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, t0);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title*/ 2) set_data_dev(t0, /*title*/ ctx[1]);
    			const each_value = /*modules*/ ctx[0];
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block, each_1_anchor, get_each_context);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(14:0) {#if modules.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (24:12) {#if selectedModule && selectedModule.namespace == module.namespace && false}
    function create_if_block_1$1(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element$1("i");
    			attr_dev(i, "class", "edit-module fa fa-pencil svelte-36b3ta");
    			add_location(i, file$9, 24, 16, 789);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(24:12) {#if selectedModule && selectedModule.namespace == module.namespace && false}",
    		ctx
    	});

    	return block;
    }

    // (16:4) {#each modules as module (module.name)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let i;
    	let i_class_value;
    	let t0_value = /*module*/ ctx[5].name + "";
    	let t0;
    	let t1;
    	let t2;
    	let dispose;
    	let if_block = /*selectedModule*/ ctx[3] && /*selectedModule*/ ctx[3].namespace == /*module*/ ctx[5].namespace && false && create_if_block_1$1(ctx);

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[4](/*module*/ ctx[5], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element$1("div");
    			i = element$1("i");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			attr_dev(i, "class", i_class_value = "" + (null_to_empty(/*icon*/ ctx[2]) + " svelte-36b3ta"));
    			add_location(i, file$9, 21, 12, 647);
    			attr_dev(div, "class", "item item--node svelte-36b3ta");
    			toggle_class(div, "selected", /*selectedModule*/ ctx[3] && /*selectedModule*/ ctx[3].namespace === /*module*/ ctx[5].namespace);
    			add_location(div, file$9, 16, 8, 408);
    			dispose = listen_dev(div, "click", click_handler, false, false, false);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t2);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*icon*/ 4 && i_class_value !== (i_class_value = "" + (null_to_empty(/*icon*/ ctx[2]) + " svelte-36b3ta"))) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (dirty & /*modules*/ 1 && t0_value !== (t0_value = /*module*/ ctx[5].name + "")) set_data_dev(t0, t0_value);

    			if (/*selectedModule*/ ctx[3] && /*selectedModule*/ ctx[3].namespace == /*module*/ ctx[5].namespace && false) {
    				if (!if_block) {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(div, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*selectedModule, modules*/ 9) {
    				toggle_class(div, "selected", /*selectedModule*/ ctx[3] && /*selectedModule*/ ctx[3].namespace === /*module*/ ctx[5].namespace);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(16:4) {#each modules as module (module.name)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let if_block_anchor;
    	let if_block = /*modules*/ ctx[0].length > 0 && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*modules*/ ctx[0].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { modules = [] } = $$props;
    	let { title = "Modules" } = $$props;
    	let { icon = "fa fa-cogs" } = $$props;
    	let selectedModule = null;

    	state.subscribe(s => {
    		$$invalidate(3, selectedModule = s.module);
    	});

    	const writable_props = ["modules", "title", "icon"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FileExplorer_Application_Module> was created with unknown prop '${key}'`);
    	});

    	const click_handler = module => selectModuleByNamespace(module.namespace);

    	$$self.$set = $$props => {
    		if ("modules" in $$props) $$invalidate(0, modules = $$props.modules);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("icon" in $$props) $$invalidate(2, icon = $$props.icon);
    	};

    	$$self.$capture_state = () => {
    		return { modules, title, icon, selectedModule };
    	};

    	$$self.$inject_state = $$props => {
    		if ("modules" in $$props) $$invalidate(0, modules = $$props.modules);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("icon" in $$props) $$invalidate(2, icon = $$props.icon);
    		if ("selectedModule" in $$props) $$invalidate(3, selectedModule = $$props.selectedModule);
    	};

    	return [modules, title, icon, selectedModule, click_handler];
    }

    class FileExplorer_Application_Module extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { modules: 0, title: 1, icon: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FileExplorer_Application_Module",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get modules() {
    		throw new Error("<FileExplorer_Application_Module>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set modules(value) {
    		throw new Error("<FileExplorer_Application_Module>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<FileExplorer_Application_Module>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<FileExplorer_Application_Module>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<FileExplorer_Application_Module>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<FileExplorer_Application_Module>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\FileExplorer_Application.svelte generated by Svelte v3.16.7 */
    const file$a = "src\\Components\\FileExplorer_Application.svelte";

    // (34:0) {#if application}
    function create_if_block$3(ctx) {
    	let div;
    	let title;
    	let i;
    	let t0_value = /*application*/ ctx[0].name + "";
    	let t0;
    	let t1;
    	let current;
    	let dispose;
    	let if_block = /*selected*/ ctx[1] && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			title = element$1("title");
    			i = element$1("i");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(i, "class", "fa fa-institution svelte-xoeloe");
    			add_location(i, file$a, 36, 13, 1087);
    			attr_dev(title, "class", "svelte-xoeloe");
    			add_location(title, file$a, 35, 8, 1012);
    			attr_dev(div, "class", "application svelte-xoeloe");
    			add_location(div, file$a, 34, 4, 977);
    			dispose = listen_dev(title, "click", /*click_handler*/ ctx[10], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, title);
    			append_dev(title, i);
    			append_dev(title, t0);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*application*/ 1) && t0_value !== (t0_value = /*application*/ ctx[0].name + "")) set_data_dev(t0, t0_value);

    			if (/*selected*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(34:0) {#if application}",
    		ctx
    	});

    	return block;
    }

    // (39:8) {#if selected}
    function create_if_block_1$2(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let current;

    	const fileexplorerapplicationmodule0 = new FileExplorer_Application_Module({
    			props: {
    				modules: /*components*/ ctx[5],
    				title: "Components",
    				icon: "fa fa-cogs"
    			},
    			$$inline: true
    		});

    	const fileexplorerapplicationmodule1 = new FileExplorer_Application_Module({
    			props: {
    				modules: /*endpoints*/ ctx[4],
    				title: "Endpoints",
    				icon: "fa fa-envelope"
    			},
    			$$inline: true
    		});

    	const fileexplorerapplicationmodule2 = new FileExplorer_Application_Module({
    			props: {
    				modules: /*features*/ ctx[2],
    				title: "Features",
    				icon: "fa fa-diamond"
    			},
    			$$inline: true
    		});

    	const fileexplorerapplicationmodule3 = new FileExplorer_Application_Module({
    			props: {
    				modules: /*models*/ ctx[6],
    				title: "Models",
    				icon: "fa fa-cubes"
    			},
    			$$inline: true
    		});

    	const fileexplorerapplicationmodule4 = new FileExplorer_Application_Module({
    			props: {
    				modules: /*databases*/ ctx[3],
    				title: "Databases",
    				icon: "fa fa-database"
    			},
    			$$inline: true
    		});

    	const fileexplorerapplicationmodule5 = new FileExplorer_Application_Module({
    			props: {
    				modules: /*documents*/ ctx[7],
    				title: "Documents",
    				icon: "fa fa-file-text-o"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			create_component(fileexplorerapplicationmodule0.$$.fragment);
    			t0 = space();
    			create_component(fileexplorerapplicationmodule1.$$.fragment);
    			t1 = space();
    			create_component(fileexplorerapplicationmodule2.$$.fragment);
    			t2 = space();
    			create_component(fileexplorerapplicationmodule3.$$.fragment);
    			t3 = space();
    			create_component(fileexplorerapplicationmodule4.$$.fragment);
    			t4 = space();
    			create_component(fileexplorerapplicationmodule5.$$.fragment);
    			attr_dev(div, "class", "application--details svelte-xoeloe");
    			add_location(div, file$a, 39, 12, 1192);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(fileexplorerapplicationmodule0, div, null);
    			append_dev(div, t0);
    			mount_component(fileexplorerapplicationmodule1, div, null);
    			append_dev(div, t1);
    			mount_component(fileexplorerapplicationmodule2, div, null);
    			append_dev(div, t2);
    			mount_component(fileexplorerapplicationmodule3, div, null);
    			append_dev(div, t3);
    			mount_component(fileexplorerapplicationmodule4, div, null);
    			append_dev(div, t4);
    			mount_component(fileexplorerapplicationmodule5, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fileexplorerapplicationmodule0_changes = {};
    			if (dirty & /*components*/ 32) fileexplorerapplicationmodule0_changes.modules = /*components*/ ctx[5];
    			fileexplorerapplicationmodule0.$set(fileexplorerapplicationmodule0_changes);
    			const fileexplorerapplicationmodule1_changes = {};
    			if (dirty & /*endpoints*/ 16) fileexplorerapplicationmodule1_changes.modules = /*endpoints*/ ctx[4];
    			fileexplorerapplicationmodule1.$set(fileexplorerapplicationmodule1_changes);
    			const fileexplorerapplicationmodule2_changes = {};
    			if (dirty & /*features*/ 4) fileexplorerapplicationmodule2_changes.modules = /*features*/ ctx[2];
    			fileexplorerapplicationmodule2.$set(fileexplorerapplicationmodule2_changes);
    			const fileexplorerapplicationmodule3_changes = {};
    			if (dirty & /*models*/ 64) fileexplorerapplicationmodule3_changes.modules = /*models*/ ctx[6];
    			fileexplorerapplicationmodule3.$set(fileexplorerapplicationmodule3_changes);
    			const fileexplorerapplicationmodule4_changes = {};
    			if (dirty & /*databases*/ 8) fileexplorerapplicationmodule4_changes.modules = /*databases*/ ctx[3];
    			fileexplorerapplicationmodule4.$set(fileexplorerapplicationmodule4_changes);
    			const fileexplorerapplicationmodule5_changes = {};
    			if (dirty & /*documents*/ 128) fileexplorerapplicationmodule5_changes.modules = /*documents*/ ctx[7];
    			fileexplorerapplicationmodule5.$set(fileexplorerapplicationmodule5_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fileexplorerapplicationmodule0.$$.fragment, local);
    			transition_in(fileexplorerapplicationmodule1.$$.fragment, local);
    			transition_in(fileexplorerapplicationmodule2.$$.fragment, local);
    			transition_in(fileexplorerapplicationmodule3.$$.fragment, local);
    			transition_in(fileexplorerapplicationmodule4.$$.fragment, local);
    			transition_in(fileexplorerapplicationmodule5.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fileexplorerapplicationmodule0.$$.fragment, local);
    			transition_out(fileexplorerapplicationmodule1.$$.fragment, local);
    			transition_out(fileexplorerapplicationmodule2.$$.fragment, local);
    			transition_out(fileexplorerapplicationmodule3.$$.fragment, local);
    			transition_out(fileexplorerapplicationmodule4.$$.fragment, local);
    			transition_out(fileexplorerapplicationmodule5.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(fileexplorerapplicationmodule0);
    			destroy_component(fileexplorerapplicationmodule1);
    			destroy_component(fileexplorerapplicationmodule2);
    			destroy_component(fileexplorerapplicationmodule3);
    			destroy_component(fileexplorerapplicationmodule4);
    			destroy_component(fileexplorerapplicationmodule5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(39:8) {#if selected}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*application*/ ctx[0] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*application*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { application = null } = $$props;
    	let { selected = false } = $$props;
    	let modules = [];
    	let f = n => (modules || []).filter(m => m.fileType === n);
    	let features = [];
    	let databases = [];
    	let endpoints = [];
    	let components = [];
    	let models = [];
    	let documents = [];
    	const writable_props = ["application", "selected"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FileExplorer_Application> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setApplicationInterator(application);

    	$$self.$set = $$props => {
    		if ("application" in $$props) $$invalidate(0, application = $$props.application);
    		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
    	};

    	$$self.$capture_state = () => {
    		return {
    			application,
    			selected,
    			modules,
    			f,
    			features,
    			databases,
    			endpoints,
    			components,
    			models,
    			documents
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("application" in $$props) $$invalidate(0, application = $$props.application);
    		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
    		if ("modules" in $$props) $$invalidate(8, modules = $$props.modules);
    		if ("f" in $$props) $$invalidate(9, f = $$props.f);
    		if ("features" in $$props) $$invalidate(2, features = $$props.features);
    		if ("databases" in $$props) $$invalidate(3, databases = $$props.databases);
    		if ("endpoints" in $$props) $$invalidate(4, endpoints = $$props.endpoints);
    		if ("components" in $$props) $$invalidate(5, components = $$props.components);
    		if ("models" in $$props) $$invalidate(6, models = $$props.models);
    		if ("documents" in $$props) $$invalidate(7, documents = $$props.documents);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*application, modules*/ 257) {
    			 {
    				if (application.modules.length !== modules.length) {
    					$$invalidate(8, modules = application.modules);
    					$$invalidate(2, features = f("Feature"));
    					$$invalidate(3, databases = f("Database"));
    					$$invalidate(4, endpoints = f("Endpoint"));
    					$$invalidate(5, components = f("Component"));
    					$$invalidate(6, models = f("Model"));
    					$$invalidate(7, documents = f("Documentation"));
    				}
    			}
    		}
    	};

    	return [
    		application,
    		selected,
    		features,
    		databases,
    		endpoints,
    		components,
    		models,
    		documents,
    		modules,
    		f,
    		click_handler
    	];
    }

    class FileExplorer_Application extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { application: 0, selected: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FileExplorer_Application",
    			options,
    			id: create_fragment$e.name
    		});
    	}

    	get application() {
    		throw new Error("<FileExplorer_Application>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set application(value) {
    		throw new Error("<FileExplorer_Application>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selected() {
    		throw new Error("<FileExplorer_Application>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected(value) {
    		throw new Error("<FileExplorer_Application>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\FileExplorer.svelte generated by Svelte v3.16.7 */
    const file$b = "src\\Components\\FileExplorer.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (14:4) {#each applications as application (new Date())}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let current;

    	const application = new FileExplorer_Application({
    			props: {
    				application: /*application*/ ctx[2],
    				selected: /*application*/ ctx[2].namespace === /*selectedApplication*/ ctx[1].namespace
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(application.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(application, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const application_changes = {};
    			if (dirty & /*applications*/ 1) application_changes.application = /*application*/ ctx[2];
    			if (dirty & /*applications, selectedApplication*/ 3) application_changes.selected = /*application*/ ctx[2].namespace === /*selectedApplication*/ ctx[1].namespace;
    			application.$set(application_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(application.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(application.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(application, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(14:4) {#each applications as application (new Date())}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*applications*/ ctx[0];
    	const get_key = ctx => new Date();

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key();
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element$1("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "file-explorer svelte-8ayjsy");
    			add_location(div, file$b, 12, 0, 339);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const each_value = /*applications*/ ctx[0];
    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    			check_outros();
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	var applications = [];
    	var selectedApplication = null;

    	state.subscribe(s => {
    		$$invalidate(0, applications = s.applications || []);
    		$$invalidate(1, selectedApplication = s.application || ({}));
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("applications" in $$props) $$invalidate(0, applications = $$props.applications);
    		if ("selectedApplication" in $$props) $$invalidate(1, selectedApplication = $$props.selectedApplication);
    	};

    	return [applications, selectedApplication];
    }

    class FileExplorer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FileExplorer",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src\Components\Editor.svelte generated by Svelte v3.16.7 */

    const { console: console_1$1 } = globals;
    const file$c = "src\\Components\\Editor.svelte";

    function create_fragment$g(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			attr_dev(div, "class", "editor svelte-1dng18m");
    			attr_dev(div, "id", /*id*/ ctx[1]);
    			add_location(div, file$c, 132, 0, 4038);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[13](div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[13](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let id = "editor-" + Math.floor(Math.random() * 1000);
    	let editor = null;
    	let { text = "" } = $$props;
    	let { language = "carlang" } = $$props;
    	let { theme = "carlangTheme" } = $$props;
    	let { wordWrap = true } = $$props;
    	let { markers = writable([]) } = $$props;
    	let { context = [] } = $$props;
    	let f = context;
    	let editorContainer;

    	if (markers) {
    		markers.subscribe(m => {
    			if (!editor) return;
    			var model = editor.getModel();
    			monaco.editor.setModelMarkers(model, "", m);
    		});
    	}

    	let timeout;

    	const initEditor = () => {
    		$$invalidate(8, editor = monaco.editor.create(document.getElementById(id), {
    			value: text || "",
    			language,
    			theme,
    			scrollBeyondLastLine: true,
    			roundedSelection: true,
    			fontSize: "16px",
    			wordWrapColumn: 120,
    			wordWrap: wordWrap ? "on" : "off",
    			minimap: { enabled: false },
    			quickSuggestions: {
    				other: false,
    				comments: false,
    				strings: false
    			}
    		}));

    		$$invalidate(8, editor.dragAndDrop = false, editor);

    		editor.onDidChangeModelContent(function (e) {
    			if (timeout) clearTimeout(timeout);

    			timeout = setTimeout(
    				() => {
    					dispatch("change", editor.getValue());
    				},
    				200
    			);
    		});

    		editor.onMouseDown(function (e) {
    			if (e.event.ctrlKey && e.event.leftButton) {
    				var word = editor.getModel().getWordAtPosition(e.target.position);
    				eventbus$1.broadcast("navigateTo", word.word);
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
    		
    	});

    	eventbus$1.subscribe("save", () => {
    		if (editor._focusTracker._hasFocus) {
    			eventbus$1.broadcast("saving", editor.getValue());
    		}
    	});

    	eventbus$1.subscribe("comment", () => {
    		editor.getSelection();
    		console.log("COMMENTING");
    	});

    	eventbus$1.subscribe("navigateToToken", position => {
    		editor.focus();
    		editor.setPosition(position);
    		editor.revealLineInCenter(position.lineNumber);
    	});

    	const writable_props = ["text", "language", "theme", "wordWrap", "markers", "context"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, editorContainer = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("text" in $$props) $$invalidate(2, text = $$props.text);
    		if ("language" in $$props) $$invalidate(3, language = $$props.language);
    		if ("theme" in $$props) $$invalidate(4, theme = $$props.theme);
    		if ("wordWrap" in $$props) $$invalidate(5, wordWrap = $$props.wordWrap);
    		if ("markers" in $$props) $$invalidate(6, markers = $$props.markers);
    		if ("context" in $$props) $$invalidate(7, context = $$props.context);
    	};

    	$$self.$capture_state = () => {
    		return {
    			id,
    			editor,
    			text,
    			language,
    			theme,
    			wordWrap,
    			markers,
    			context,
    			f,
    			editorContainer,
    			timeout
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("editor" in $$props) $$invalidate(8, editor = $$props.editor);
    		if ("text" in $$props) $$invalidate(2, text = $$props.text);
    		if ("language" in $$props) $$invalidate(3, language = $$props.language);
    		if ("theme" in $$props) $$invalidate(4, theme = $$props.theme);
    		if ("wordWrap" in $$props) $$invalidate(5, wordWrap = $$props.wordWrap);
    		if ("markers" in $$props) $$invalidate(6, markers = $$props.markers);
    		if ("context" in $$props) $$invalidate(7, context = $$props.context);
    		if ("f" in $$props) f = $$props.f;
    		if ("editorContainer" in $$props) $$invalidate(0, editorContainer = $$props.editorContainer);
    		if ("timeout" in $$props) timeout = $$props.timeout;
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*language, editor*/ 264) {
    			 if (language) {
    				(() => {
    					if (!editor) return;
    					monaco.editor.setModelLanguage(editor.getModel(), language);
    				})();
    			}
    		}

    		if ($$self.$$.dirty & /*text, editor*/ 260) {
    			 if (text || text === "") {
    				(() => {
    					if (!editor) return;
    					const model = editor.getModel();
    					const position = editor.getPosition();

    					if (text != null && text !== model.getValue()) {
    						editor.pushUndoStop();
    						model.pushEditOperations([], [{ range: model.getFullModelRange(), text }]);
    						editor.pushUndoStop();
    						editor.setPosition(position);
    					}
    				})();
    			}
    		}
    	};

    	return [
    		editorContainer,
    		id,
    		text,
    		language,
    		theme,
    		wordWrap,
    		markers,
    		context,
    		editor,
    		timeout,
    		dispatch,
    		f,
    		initEditor,
    		div_binding
    	];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {
    			text: 2,
    			language: 3,
    			theme: 4,
    			wordWrap: 5,
    			markers: 6,
    			context: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$g.name
    		});
    	}

    	get text() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get language() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set language(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get theme() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set theme(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get wordWrap() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set wordWrap(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get markers() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set markers(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get context() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set context(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\DocumentEditor.svelte generated by Svelte v3.16.7 */
    const file$d = "src\\Components\\DocumentEditor.svelte";

    // (45:4) {#if module}
    function create_if_block$4(ctx) {
    	let div0;

    	let t0_value = (/*module*/ ctx[1]
    	? /*module*/ ctx[1].namespace || /*module*/ ctx[1].path
    	: "unknown file") + "";

    	let t0;
    	let t1;
    	let div1;
    	let current;

    	const editor = new Editor({
    			props: {
    				context: /*context*/ ctx[0],
    				text: /*text*/ ctx[2],
    				markers: /*markers*/ ctx[4],
    				language: /*type*/ ctx[3]
    			},
    			$$inline: true
    		});

    	editor.$on("change", /*textChanged*/ ctx[5]);

    	const block = {
    		c: function create() {
    			div0 = element$1("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element$1("div");
    			create_component(editor.$$.fragment);
    			attr_dev(div0, "class", "header svelte-16kv4ro");
    			add_location(div0, file$d, 45, 8, 1210);
    			attr_dev(div1, "class", "editor svelte-16kv4ro");
    			add_location(div1, file$d, 49, 8, 1331);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(editor, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*module*/ 2) && t0_value !== (t0_value = (/*module*/ ctx[1]
    			? /*module*/ ctx[1].namespace || /*module*/ ctx[1].path
    			: "unknown file") + "")) set_data_dev(t0, t0_value);

    			const editor_changes = {};
    			if (dirty & /*context*/ 1) editor_changes.context = /*context*/ ctx[0];
    			if (dirty & /*text*/ 4) editor_changes.text = /*text*/ ctx[2];
    			editor.$set(editor_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editor.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editor.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_component(editor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(45:4) {#if module}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$h(ctx) {
    	let div;
    	let current;
    	let if_block = /*module*/ ctx[1] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "container svelte-16kv4ro");
    			add_location(div, file$d, 43, 0, 1159);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*module*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { context = [] } = $$props;
    	let module;
    	let text = "";
    	let type = "carlang";
    	let markers = writable([]);

    	let mapErrorToken = e => {
    		return {
    			startLineNumber: e.sourceSegment.lineStart + 1,
    			endLineNumber: e.sourceSegment.lineEnd + 1,
    			startColumn: e.sourceSegment.columnStart + 1,
    			endColumn: e.sourceSegment.columnEnd + 1,
    			message: e.message
    		};
    	};

    	state.subscribe(s => {
    		if (s.module) {
    			$$invalidate(1, module = s.module);
    			$$invalidate(2, text = module.text);
    			markers.set(module.compilationResult.errors.map(mapErrorToken));
    		} else {
    			$$invalidate(1, module = null);
    			$$invalidate(2, text = "");
    			markers.set([]);
    		}
    	});

    	let timeout;

    	let textChanged = event => {
    		if (timeout) clearTimeout(timeout);

    		timeout = setTimeout(
    			() => {
    				compile(event.detail);
    			},
    			1000
    		);
    	};

    	const writable_props = ["context"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DocumentEditor> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("context" in $$props) $$invalidate(0, context = $$props.context);
    	};

    	$$self.$capture_state = () => {
    		return {
    			context,
    			module,
    			text,
    			type,
    			markers,
    			mapErrorToken,
    			timeout,
    			textChanged
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("context" in $$props) $$invalidate(0, context = $$props.context);
    		if ("module" in $$props) $$invalidate(1, module = $$props.module);
    		if ("text" in $$props) $$invalidate(2, text = $$props.text);
    		if ("type" in $$props) $$invalidate(3, type = $$props.type);
    		if ("markers" in $$props) $$invalidate(4, markers = $$props.markers);
    		if ("mapErrorToken" in $$props) mapErrorToken = $$props.mapErrorToken;
    		if ("timeout" in $$props) timeout = $$props.timeout;
    		if ("textChanged" in $$props) $$invalidate(5, textChanged = $$props.textChanged);
    	};

    	return [context, module, text, type, markers, textChanged];
    }

    class DocumentEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, { context: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DocumentEditor",
    			options,
    			id: create_fragment$h.name
    		});
    	}

    	get context() {
    		throw new Error("<DocumentEditor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set context(value) {
    		throw new Error("<DocumentEditor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Pages\EditorPage.svelte generated by Svelte v3.16.7 */
    const file$e = "src\\Pages\\EditorPage.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (105:4) {#if namespace}
    function create_if_block$5(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let div4;
    	let t1;
    	let t2;
    	let div2;
    	let i0;
    	let t3;
    	let div3;
    	let i1;
    	let current;
    	let dispose;

    	const documenteditor = new DocumentEditor({
    			props: { context: /*context*/ ctx[8] },
    			$$inline: true
    		});

    	let if_block = /*processing*/ ctx[6] && create_if_block_4(ctx);

    	const tabs = new Tabs({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element$1("div");
    			div0 = element$1("div");
    			create_component(documenteditor.$$.fragment);
    			t0 = space();
    			div4 = element$1("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			create_component(tabs.$$.fragment);
    			t2 = space();
    			div2 = element$1("div");
    			i0 = element$1("i");
    			t3 = space();
    			div3 = element$1("div");
    			i1 = element$1("i");
    			attr_dev(div0, "class", "svelte-cjxo98");
    			add_location(div0, file$e, 106, 12, 3740);
    			attr_dev(div1, "class", "document-editor svelte-cjxo98");
    			add_location(div1, file$e, 105, 8, 3697);
    			attr_dev(i0, "class", "fa fa-print svelte-cjxo98");
    			add_location(i0, file$e, 174, 16, 6522);
    			attr_dev(div2, "class", "print-button svelte-cjxo98");
    			add_location(div2, file$e, 173, 12, 6461);
    			attr_dev(i1, "class", "fa fa-cloud svelte-cjxo98");
    			add_location(i1, file$e, 177, 16, 6646);
    			attr_dev(div3, "class", "publish-button svelte-cjxo98");
    			add_location(div3, file$e, 176, 12, 6581);
    			attr_dev(div4, "class", "page-viewer svelte-cjxo98");
    			add_location(div4, file$e, 110, 8, 3837);

    			dispose = [
    				listen_dev(div2, "click", /*print*/ ctx[9], false, false, false),
    				listen_dev(div3, "click", /*publish*/ ctx[10], false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(documenteditor, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			if (if_block) if_block.m(div4, null);
    			append_dev(div4, t1);
    			mount_component(tabs, div4, null);
    			append_dev(div4, t2);
    			append_dev(div4, div2);
    			append_dev(div2, i0);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, i1);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*processing*/ ctx[6]) {
    				if (!if_block) {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					if_block.m(div4, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const tabs_changes = {};

    			if (dirty & /*$$scope, planningSvgUrl, svgUrl, versionUrls, componentUrl, htmlUrl, iframe*/ 4194494) {
    				tabs_changes.$$scope = { dirty, ctx };
    			}

    			tabs.$set(tabs_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(documenteditor.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(documenteditor.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(documenteditor);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    			destroy_component(tabs);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(105:4) {#if namespace}",
    		ctx
    	});

    	return block;
    }

    // (112:12) {#if processing}
    function create_if_block_4(ctx) {
    	let div;
    	let i;

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			i = element$1("i");
    			attr_dev(i, "class", "fa fa-spinner fa-spin fa-3x fa-fw svelte-cjxo98");
    			add_location(i, file$e, 113, 20, 3956);
    			attr_dev(div, "class", "processing svelte-cjxo98");
    			add_location(div, file$e, 112, 16, 3910);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(112:12) {#if processing}",
    		ctx
    	});

    	return block;
    }

    // (119:20) <Tab>
    function create_default_slot_14(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Document");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_14.name,
    		type: "slot",
    		source: "(119:20) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (120:20) <Tab>
    function create_default_slot_13(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Architecture");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_13.name,
    		type: "slot",
    		source: "(120:20) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (121:20) <Tab>
    function create_default_slot_12(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Data Model");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_12.name,
    		type: "slot",
    		source: "(121:20) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (122:20) <Tab>
    function create_default_slot_11(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Planning");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_11.name,
    		type: "slot",
    		source: "(122:20) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (118:16) <TabList>
    function create_default_slot_10(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let current;

    	const tab0 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_14] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab1 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_13] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab2 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_12] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab3 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_11] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tab0.$$.fragment);
    			t0 = space();
    			create_component(tab1.$$.fragment);
    			t1 = space();
    			create_component(tab2.$$.fragment);
    			t2 = space();
    			create_component(tab3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tab0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tab1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tab2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(tab3, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab0_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab0_changes.$$scope = { dirty, ctx };
    			}

    			tab0.$set(tab0_changes);
    			const tab1_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab1_changes.$$scope = { dirty, ctx };
    			}

    			tab1.$set(tab1_changes);
    			const tab2_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab2_changes.$$scope = { dirty, ctx };
    			}

    			tab2.$set(tab2_changes);
    			const tab3_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tab3_changes.$$scope = { dirty, ctx };
    			}

    			tab3.$set(tab3_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab0.$$.fragment, local);
    			transition_in(tab1.$$.fragment, local);
    			transition_in(tab2.$$.fragment, local);
    			transition_in(tab3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab0.$$.fragment, local);
    			transition_out(tab1.$$.fragment, local);
    			transition_out(tab2.$$.fragment, local);
    			transition_out(tab3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tab0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tab1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tab2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(tab3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(118:16) <TabList>",
    		ctx
    	});

    	return block;
    }

    // (128:24) <PageViewer>
    function create_default_slot_9(ctx) {
    	let iframe_1;
    	let iframe_1_src_value;

    	const block = {
    		c: function create() {
    			iframe_1 = element$1("iframe");
    			attr_dev(iframe_1, "class", "html-iframe svelte-cjxo98");
    			if (iframe_1.src !== (iframe_1_src_value = /*htmlUrl*/ ctx[5])) attr_dev(iframe_1, "src", iframe_1_src_value);
    			attr_dev(iframe_1, "title", "Page");
    			add_location(iframe_1, file$e, 129, 28, 4643);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, iframe_1, anchor);
    			/*iframe_1_binding*/ ctx[16](iframe_1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*htmlUrl*/ 32 && iframe_1.src !== (iframe_1_src_value = /*htmlUrl*/ ctx[5])) {
    				attr_dev(iframe_1, "src", iframe_1_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(iframe_1);
    			/*iframe_1_binding*/ ctx[16](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(128:24) <PageViewer>",
    		ctx
    	});

    	return block;
    }

    // (126:20) <Panel                          style="background:var(--color-1); overflow:hidden!important; height: calc(100% - 3rem); margin-top: 2.5rem; padding: 2rem 0 2rem 0;">
    function create_default_slot_8(ctx) {
    	let current;

    	const pageviewer = new PageViewer({
    			props: {
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(pageviewer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(pageviewer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const pageviewer_changes = {};

    			if (dirty & /*$$scope, htmlUrl, iframe*/ 4194338) {
    				pageviewer_changes.$$scope = { dirty, ctx };
    			}

    			pageviewer.$set(pageviewer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pageviewer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pageviewer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(pageviewer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(126:20) <Panel                          style=\\\"background:var(--color-1); overflow:hidden!important; height: calc(100% - 3rem); margin-top: 2.5rem; padding: 2rem 0 2rem 0;\\\">",
    		ctx
    	});

    	return block;
    }

    // (125:16) <TabPanel>
    function create_default_slot_7(ctx) {
    	let current;

    	const panel = new Panel({
    			props: {
    				style: "background:var(--color-1); overflow:hidden!important; height: calc(100% - 3rem); margin-top: 2.5rem; padding: 2rem 0 2rem 0;",
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(panel.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(panel, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const panel_changes = {};

    			if (dirty & /*$$scope, htmlUrl, iframe*/ 4194338) {
    				panel_changes.$$scope = { dirty, ctx };
    			}

    			panel.$set(panel_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(panel.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(panel.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(panel, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(125:16) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (141:24) {#if componentUrl}
    function create_if_block_3(ctx) {
    	let current;

    	const imageviewer = new ImageViewer({
    			props: { url: /*componentUrl*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(imageviewer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(imageviewer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const imageviewer_changes = {};
    			if (dirty & /*componentUrl*/ 8) imageviewer_changes.url = /*componentUrl*/ ctx[3];
    			imageviewer.$set(imageviewer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(imageviewer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(imageviewer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(imageviewer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(141:24) {#if componentUrl}",
    		ctx
    	});

    	return block;
    }

    // (146:28) {#each versionUrls as versionUrl (versionUrl.version)}
    function create_each_block$2(key_1, ctx) {
    	let div;
    	let t0_value = /*versionUrl*/ ctx[19].version + "";
    	let t0;
    	let t1;
    	let dispose;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[18](/*versionUrl*/ ctx[19], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element$1("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "svelte-cjxo98");
    			add_location(div, file$e, 146, 32, 5453);
    			dispose = listen_dev(div, "click", click_handler_1, false, false, false);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*versionUrls*/ 128 && t0_value !== (t0_value = /*versionUrl*/ ctx[19].version + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(146:28) {#each versionUrls as versionUrl (versionUrl.version)}",
    		ctx
    	});

    	return block;
    }

    // (140:20) <Panel style="height: calc(100% - 3rem); overflow:auto;">
    function create_default_slot_6(ctx) {
    	let t0;
    	let div1;
    	let div0;
    	let t2;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let dispose;
    	let if_block = /*componentUrl*/ ctx[3] && create_if_block_3(ctx);
    	let each_value = /*versionUrls*/ ctx[7];
    	const get_key = ctx => /*versionUrl*/ ctx[19].version;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			div1 = element$1("div");
    			div0 = element$1("div");
    			div0.textContent = "current";
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "svelte-cjxo98");
    			add_location(div0, file$e, 144, 28, 5284);
    			attr_dev(div1, "class", "version-container svelte-cjxo98");
    			add_location(div1, file$e, 143, 24, 5223);
    			dispose = listen_dev(div0, "click", /*click_handler*/ ctx[17], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*componentUrl*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const each_value = /*versionUrls*/ ctx[7];
    			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, destroy_block, create_each_block$2, null, get_each_context$2);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(140:20) <Panel style=\\\"height: calc(100% - 3rem); overflow:auto;\\\">",
    		ctx
    	});

    	return block;
    }

    // (139:16) <TabPanel>
    function create_default_slot_5(ctx) {
    	let current;

    	const panel = new Panel({
    			props: {
    				style: "height: calc(100% - 3rem); overflow:auto;",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(panel.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(panel, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const panel_changes = {};

    			if (dirty & /*$$scope, versionUrls, componentUrl*/ 4194440) {
    				panel_changes.$$scope = { dirty, ctx };
    			}

    			panel.$set(panel_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(panel.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(panel.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(panel, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(139:16) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (159:24) {#if svgUrl}
    function create_if_block_2(ctx) {
    	let current;

    	const imageviewer = new ImageViewer({
    			props: { url: /*svgUrl*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(imageviewer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(imageviewer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const imageviewer_changes = {};
    			if (dirty & /*svgUrl*/ 4) imageviewer_changes.url = /*svgUrl*/ ctx[2];
    			imageviewer.$set(imageviewer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(imageviewer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(imageviewer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(imageviewer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(159:24) {#if svgUrl}",
    		ctx
    	});

    	return block;
    }

    // (158:20) <Panel style="height: calc(100% - 3rem); overflow:auto;">
    function create_default_slot_4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*svgUrl*/ ctx[2] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*svgUrl*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(158:20) <Panel style=\\\"height: calc(100% - 3rem); overflow:auto;\\\">",
    		ctx
    	});

    	return block;
    }

    // (157:16) <TabPanel>
    function create_default_slot_3(ctx) {
    	let current;

    	const panel = new Panel({
    			props: {
    				style: "height: calc(100% - 3rem); overflow:auto;",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(panel.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(panel, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const panel_changes = {};

    			if (dirty & /*$$scope, svgUrl*/ 4194308) {
    				panel_changes.$$scope = { dirty, ctx };
    			}

    			panel.$set(panel_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(panel.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(panel.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(panel, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(157:16) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (167:24) {#if planningSvgUrl}
    function create_if_block_1$3(ctx) {
    	let current;

    	const imageviewer = new ImageViewer({
    			props: { url: /*planningSvgUrl*/ ctx[4] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(imageviewer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(imageviewer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const imageviewer_changes = {};
    			if (dirty & /*planningSvgUrl*/ 16) imageviewer_changes.url = /*planningSvgUrl*/ ctx[4];
    			imageviewer.$set(imageviewer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(imageviewer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(imageviewer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(imageviewer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(167:24) {#if planningSvgUrl}",
    		ctx
    	});

    	return block;
    }

    // (166:20) <Panel style="height: calc(100% - 3rem); overflow:auto;">
    function create_default_slot_2(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*planningSvgUrl*/ ctx[4] && create_if_block_1$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*planningSvgUrl*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(166:20) <Panel style=\\\"height: calc(100% - 3rem); overflow:auto;\\\">",
    		ctx
    	});

    	return block;
    }

    // (165:16) <TabPanel>
    function create_default_slot_1(ctx) {
    	let current;

    	const panel = new Panel({
    			props: {
    				style: "height: calc(100% - 3rem); overflow:auto;",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(panel.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(panel, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const panel_changes = {};

    			if (dirty & /*$$scope, planningSvgUrl*/ 4194320) {
    				panel_changes.$$scope = { dirty, ctx };
    			}

    			panel.$set(panel_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(panel.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(panel.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(panel, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(165:16) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (117:12) <Tabs>
    function create_default_slot(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let current;

    	const tablist = new TabList({
    			props: {
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel0 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel1 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel2 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel3 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tablist.$$.fragment);
    			t0 = space();
    			create_component(tabpanel0.$$.fragment);
    			t1 = space();
    			create_component(tabpanel1.$$.fragment);
    			t2 = space();
    			create_component(tabpanel2.$$.fragment);
    			t3 = space();
    			create_component(tabpanel3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tablist, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tabpanel0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tabpanel1, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(tabpanel2, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(tabpanel3, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tablist_changes = {};

    			if (dirty & /*$$scope*/ 4194304) {
    				tablist_changes.$$scope = { dirty, ctx };
    			}

    			tablist.$set(tablist_changes);
    			const tabpanel0_changes = {};

    			if (dirty & /*$$scope, htmlUrl, iframe*/ 4194338) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};

    			if (dirty & /*$$scope, versionUrls, componentUrl*/ 4194440) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    			const tabpanel2_changes = {};

    			if (dirty & /*$$scope, svgUrl*/ 4194308) {
    				tabpanel2_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel2.$set(tabpanel2_changes);
    			const tabpanel3_changes = {};

    			if (dirty & /*$$scope, planningSvgUrl*/ 4194320) {
    				tabpanel3_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel3.$set(tabpanel3_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tablist.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			transition_in(tabpanel2.$$.fragment, local);
    			transition_in(tabpanel3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tablist.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			transition_out(tabpanel2.$$.fragment, local);
    			transition_out(tabpanel3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tablist, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tabpanel0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tabpanel1, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(tabpanel2, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(tabpanel3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(117:12) <Tabs>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$i(ctx) {
    	let div1;
    	let div0;
    	let t;
    	let current;
    	const fileexplorer = new FileExplorer({ $$inline: true });
    	let if_block = /*namespace*/ ctx[0] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			div1 = element$1("div");
    			div0 = element$1("div");
    			create_component(fileexplorer.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "file-explorer--container svelte-cjxo98");
    			add_location(div0, file$e, 101, 4, 3590);
    			attr_dev(div1, "class", "container svelte-cjxo98");
    			add_location(div1, file$e, 100, 0, 3561);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(fileexplorer, div0, null);
    			append_dev(div1, t);
    			if (if_block) if_block.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*namespace*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fileexplorer.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fileexplorer.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(fileexplorer);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let namespace;
    	let iframe;
    	let svgUrl;
    	let componentUrl;
    	let planningSvgUrl;
    	let htmlUrl;
    	let scrollY = 0;
    	let processing = false;
    	let context = [];
    	let module;
    	let versionUrls = [];

    	const generateUrls = namespace => {
    		log("Generating URLS");

    		scrollY = iframe && iframe.contentWindow
    		? iframe.contentWindow.scrollY
    		: 0;

    		if (!namespace) return;
    		$$invalidate(2, svgUrl = `/documents/${namespace}/data.svg?timestamp=${new Date().getMilliseconds()}`);
    		$$invalidate(3, componentUrl = `/documents/${namespace}/components.svg?timestamp=${new Date().getMilliseconds()}`);
    		$$invalidate(4, planningSvgUrl = `/documents/${namespace}/roadmap.svg?timestamp=${new Date().getMilliseconds()}`);
    		$$invalidate(5, htmlUrl = `/documents/${namespace}/page.html?timestamp=${new Date().getMilliseconds()}`);
    	};

    	let print = () => {
    		iframe.contentWindow.focus();
    		iframe.contentWindow.print();
    	};

    	let publish = () => {
    		if (module) eventbus$1.broadcast("publish", module);

    		setTimeout(
    			async () => {
    				$$invalidate(7, versionUrls = await get(`/document/versions/${module.namespace}`));
    			},
    			1000
    		);
    	};

    	let changeVersion = url => {
    		console.log(url);
    		if (!url) $$invalidate(3, componentUrl = `/documents/${namespace}/components.svg?timestamp=${new Date().getMilliseconds()}`); else $$invalidate(3, componentUrl = `/file?name=${url}`);
    	};

    	let runId;

    	state.subscribe(s => {
    		if (s && s.module) {
    			if (!module || module.namespace !== s.module.namespace) {
    				module = s.module;

    				(async () => {
    					$$invalidate(7, versionUrls = await get(`/document/versions/${module.namespace}`));
    				})();
    			}

    			if (processing && !s.processing) {
    				if (iframe && !iframe.onload) {
    					$$invalidate(
    						1,
    						iframe.onload = function () {
    							setTimeout(() => {
    								if (iframe && iframe.contentWindow) iframe.contentWindow.scroll(0, scrollY);
    							});
    						},
    						iframe
    					);
    				}

    				setTimeout(() => {
    					if (runId !== s.runId) {
    						generateUrls(s.module.namespace);
    						runId = s.runId;
    					}
    				});
    			}

    			if (s.module.namespace && s.module.namespace !== namespace) {
    				$$invalidate(0, namespace = s.module.namespace);
    				generateUrls(s.module.namespace);
    			}
    		}

    		if (!processing && s.processing) {
    			$$invalidate(6, processing = true);
    		}

    		if (processing && !s.processing) {
    			setTimeout(
    				() => {
    					$$invalidate(6, processing = s.processing);
    				},
    				300
    			);
    		}
    	});

    	function iframe_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, iframe = $$value);
    		});
    	}

    	const click_handler = () => changeVersion();
    	const click_handler_1 = versionUrl => changeVersion(versionUrl.componentUrl);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("namespace" in $$props) $$invalidate(0, namespace = $$props.namespace);
    		if ("iframe" in $$props) $$invalidate(1, iframe = $$props.iframe);
    		if ("svgUrl" in $$props) $$invalidate(2, svgUrl = $$props.svgUrl);
    		if ("componentUrl" in $$props) $$invalidate(3, componentUrl = $$props.componentUrl);
    		if ("planningSvgUrl" in $$props) $$invalidate(4, planningSvgUrl = $$props.planningSvgUrl);
    		if ("htmlUrl" in $$props) $$invalidate(5, htmlUrl = $$props.htmlUrl);
    		if ("scrollY" in $$props) scrollY = $$props.scrollY;
    		if ("processing" in $$props) $$invalidate(6, processing = $$props.processing);
    		if ("context" in $$props) $$invalidate(8, context = $$props.context);
    		if ("module" in $$props) module = $$props.module;
    		if ("versionUrls" in $$props) $$invalidate(7, versionUrls = $$props.versionUrls);
    		if ("print" in $$props) $$invalidate(9, print = $$props.print);
    		if ("publish" in $$props) $$invalidate(10, publish = $$props.publish);
    		if ("changeVersion" in $$props) $$invalidate(11, changeVersion = $$props.changeVersion);
    		if ("runId" in $$props) runId = $$props.runId;
    	};

    	return [
    		namespace,
    		iframe,
    		svgUrl,
    		componentUrl,
    		planningSvgUrl,
    		htmlUrl,
    		processing,
    		versionUrls,
    		context,
    		print,
    		publish,
    		changeVersion,
    		scrollY,
    		module,
    		runId,
    		generateUrls,
    		iframe_1_binding,
    		click_handler,
    		click_handler_1
    	];
    }

    class EditorPage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditorPage",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src\Pages\Home.svelte generated by Svelte v3.16.7 */
    const file$f = "src\\Pages\\Home.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (20:12) {#if selectedProject == project}
    function create_if_block$6(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element$1("i");
    			attr_dev(i, "class", "fa fa-check svelte-1xz53c9");
    			add_location(i, file$f, 20, 16, 597);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(20:12) {#if selectedProject == project}",
    		ctx
    	});

    	return block;
    }

    // (15:4) {#each projects as project}
    function create_each_block$3(ctx) {
    	let div;
    	let t0;
    	let span;
    	let t1_value = /*project*/ ctx[3] + "";
    	let t1;
    	let t2;
    	let dispose;
    	let if_block = /*selectedProject*/ ctx[1] == /*project*/ ctx[3] && create_if_block$6(ctx);

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[2](/*project*/ ctx[3], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			span = element$1("span");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(span, "class", "svelte-1xz53c9");
    			add_location(span, file$f, 22, 12, 655);
    			attr_dev(div, "class", "application svelte-1xz53c9");
    			toggle_class(div, "selected", /*selectedProject*/ ctx[1] === /*project*/ ctx[3]);
    			add_location(div, file$f, 15, 8, 384);
    			dispose = listen_dev(div, "click", click_handler, false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, t1);
    			append_dev(div, t2);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*selectedProject*/ ctx[1] == /*project*/ ctx[3]) {
    				if (!if_block) {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*projects*/ 1 && t1_value !== (t1_value = /*project*/ ctx[3] + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*selectedProject, projects*/ 3) {
    				toggle_class(div, "selected", /*selectedProject*/ ctx[1] === /*project*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(15:4) {#each projects as project}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$j(ctx) {
    	let div0;
    	let t;
    	let div1;
    	let i;
    	let dispose;
    	let each_value = /*projects*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element$1("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			div1 = element$1("div");
    			i = element$1("i");
    			attr_dev(div0, "class", "home svelte-1xz53c9");
    			add_location(div0, file$f, 13, 0, 323);
    			attr_dev(i, "class", "fa fa-times svelte-1xz53c9");
    			add_location(i, file$f, 27, 4, 766);
    			attr_dev(div1, "class", "clear svelte-1xz53c9");
    			add_location(div1, file$f, 26, 0, 716);
    			dispose = listen_dev(div1, "click", resetProjects, false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			insert_dev(target, t, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, i);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*selectedProject, projects, selectProject*/ 3) {
    				each_value = /*projects*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let projects = [];
    	let selectedProject = null;

    	state.subscribe(s => {
    		$$invalidate(0, projects = s.projects || []);
    		$$invalidate(1, selectedProject = s.project);
    	});

    	const click_handler = project => selectProject(project);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("projects" in $$props) $$invalidate(0, projects = $$props.projects);
    		if ("selectedProject" in $$props) $$invalidate(1, selectedProject = $$props.selectedProject);
    	};

    	return [projects, selectedProject, click_handler];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src\Pages\About.svelte generated by Svelte v3.16.7 */

    const file$g = "src\\Pages\\About.svelte";

    function create_fragment$k(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			div.textContent = "About";
    			add_location(div, file$g, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src\Components\NavButton.svelte generated by Svelte v3.16.7 */
    const file$h = "src\\Components\\NavButton.svelte";

    // (25:0) {:else}
    function create_else_block$1(ctx) {
    	let span;
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element$1("span");
    			t = text(/*title*/ ctx[0]);
    			attr_dev(span, "class", "nav-button svelte-fxv6js");
    			toggle_class(span, "selected", /*selected*/ ctx[1]);
    			toggle_class(span, "link", /*link*/ ctx[3]);
    			add_location(span, file$h, 25, 4, 690);
    			dispose = listen_dev(span, "click", /*click*/ ctx[4], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data_dev(t, /*title*/ ctx[0]);

    			if (dirty & /*selected*/ 2) {
    				toggle_class(span, "selected", /*selected*/ ctx[1]);
    			}

    			if (dirty & /*link*/ 8) {
    				toggle_class(span, "link", /*link*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(25:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (19:0) {#if icon}
    function create_if_block$7(ctx) {
    	let span;
    	let i;
    	let i_class_value;
    	let t0;
    	let br;
    	let t1;
    	let dispose;
    	let if_block = /*title*/ ctx[0] && /*title*/ ctx[0].length > 0 && create_if_block_1$4(ctx);

    	const block = {
    		c: function create() {
    			span = element$1("span");
    			i = element$1("i");
    			t0 = space();
    			br = element$1("br");
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(i, "class", i_class_value = "" + (null_to_empty(/*icon*/ ctx[2]) + " svelte-fxv6js"));
    			add_location(i, file$h, 20, 8, 548);
    			add_location(br, file$h, 21, 8, 576);
    			attr_dev(span, "class", "nav-button icon svelte-fxv6js");
    			toggle_class(span, "selected", /*selected*/ ctx[1]);
    			toggle_class(span, "link", /*link*/ ctx[3]);
    			add_location(span, file$h, 19, 4, 465);
    			dispose = listen_dev(span, "click", /*click*/ ctx[4], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, i);
    			append_dev(span, t0);
    			append_dev(span, br);
    			append_dev(span, t1);
    			if (if_block) if_block.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*icon*/ 4 && i_class_value !== (i_class_value = "" + (null_to_empty(/*icon*/ ctx[2]) + " svelte-fxv6js"))) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (/*title*/ ctx[0] && /*title*/ ctx[0].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$4(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*selected*/ 2) {
    				toggle_class(span, "selected", /*selected*/ ctx[1]);
    			}

    			if (dirty & /*link*/ 8) {
    				toggle_class(span, "link", /*link*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(19:0) {#if icon}",
    		ctx
    	});

    	return block;
    }

    // (23:8) {#if title && title.length > 0}
    function create_if_block_1$4(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element$1("span");
    			t = text(/*title*/ ctx[0]);
    			attr_dev(span, "class", "title");
    			add_location(span, file$h, 22, 39, 623);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data_dev(t, /*title*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(23:8) {#if title && title.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$l(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*icon*/ ctx[2]) return create_if_block$7;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { href = undefined } = $$props;
    	let { title = "" } = $$props;

    	let { onClick = () => {
    		
    	} } = $$props;

    	let { selected = false } = $$props;
    	let { icon = undefined } = $$props;
    	let { restricted = false } = $$props;
    	let { link = false } = $$props;

    	const click = () => {
    		if (onClick) onClick();

    		if (href && !restricted) {
    			navigate$1(href);
    		}
    	};

    	const writable_props = ["href", "title", "onClick", "selected", "icon", "restricted", "link"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NavButton> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("href" in $$props) $$invalidate(5, href = $$props.href);
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("onClick" in $$props) $$invalidate(6, onClick = $$props.onClick);
    		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
    		if ("icon" in $$props) $$invalidate(2, icon = $$props.icon);
    		if ("restricted" in $$props) $$invalidate(7, restricted = $$props.restricted);
    		if ("link" in $$props) $$invalidate(3, link = $$props.link);
    	};

    	$$self.$capture_state = () => {
    		return {
    			href,
    			title,
    			onClick,
    			selected,
    			icon,
    			restricted,
    			link
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("href" in $$props) $$invalidate(5, href = $$props.href);
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("onClick" in $$props) $$invalidate(6, onClick = $$props.onClick);
    		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
    		if ("icon" in $$props) $$invalidate(2, icon = $$props.icon);
    		if ("restricted" in $$props) $$invalidate(7, restricted = $$props.restricted);
    		if ("link" in $$props) $$invalidate(3, link = $$props.link);
    	};

    	return [title, selected, icon, link, click, href, onClick, restricted];
    }

    class NavButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$k, create_fragment$l, safe_not_equal, {
    			href: 5,
    			title: 0,
    			onClick: 6,
    			selected: 1,
    			icon: 2,
    			restricted: 7,
    			link: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NavButton",
    			options,
    			id: create_fragment$l.name
    		});
    	}

    	get href() {
    		throw new Error("<NavButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<NavButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<NavButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<NavButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onClick() {
    		throw new Error("<NavButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onClick(value) {
    		throw new Error("<NavButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selected() {
    		throw new Error("<NavButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected(value) {
    		throw new Error("<NavButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<NavButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<NavButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restricted() {
    		throw new Error("<NavButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restricted(value) {
    		throw new Error("<NavButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get link() {
    		throw new Error("<NavButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set link(value) {
    		throw new Error("<NavButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\Menu.svelte generated by Svelte v3.16.7 */
    const file$i = "src\\Components\\Menu.svelte";

    // (27:4) {#if selectedProject}
    function create_if_block$8(ctx) {
    	let t;
    	let current;

    	const navbutton0 = new NavButton({
    			props: {
    				href: "/editor",
    				icon: "fa fa-file",
    				title: "Editor",
    				selected: /*url*/ ctx[0].indexOf("/editor") == 0
    			},
    			$$inline: true
    		});

    	const navbutton1 = new NavButton({
    			props: {
    				href: "/reader",
    				icon: "fa fa-book",
    				title: "Reader",
    				selected: /*url*/ ctx[0].indexOf("/reader") == 0
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(navbutton0.$$.fragment);
    			t = space();
    			create_component(navbutton1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(navbutton0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(navbutton1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const navbutton0_changes = {};
    			if (dirty & /*url*/ 1) navbutton0_changes.selected = /*url*/ ctx[0].indexOf("/editor") == 0;
    			navbutton0.$set(navbutton0_changes);
    			const navbutton1_changes = {};
    			if (dirty & /*url*/ 1) navbutton1_changes.selected = /*url*/ ctx[0].indexOf("/reader") == 0;
    			navbutton1.$set(navbutton1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbutton0.$$.fragment, local);
    			transition_in(navbutton1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbutton0.$$.fragment, local);
    			transition_out(navbutton1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navbutton0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(navbutton1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$8.name,
    		type: "if",
    		source: "(27:4) {#if selectedProject}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$m(ctx) {
    	let nav;
    	let t0;
    	let t1;
    	let current;

    	const navbutton0 = new NavButton({
    			props: {
    				href: "/",
    				icon: "fa fa-home",
    				title: "Home",
    				selected: /*url*/ ctx[0] == "/" || /*url*/ ctx[0] == "/home"
    			},
    			$$inline: true
    		});

    	let if_block = /*selectedProject*/ ctx[1] && create_if_block$8(ctx);

    	const navbutton1 = new NavButton({
    			props: {
    				href: "/logs",
    				icon: "fa fa-tasks",
    				title: "Logs",
    				selected: /*url*/ ctx[0].indexOf("/logs") == 0
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			nav = element$1("nav");
    			create_component(navbutton0.$$.fragment);
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			create_component(navbutton1.$$.fragment);
    			attr_dev(nav, "class", "svelte-pd3pwj");
    			add_location(nav, file$i, 20, 0, 494);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			mount_component(navbutton0, nav, null);
    			append_dev(nav, t0);
    			if (if_block) if_block.m(nav, null);
    			append_dev(nav, t1);
    			mount_component(navbutton1, nav, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const navbutton0_changes = {};
    			if (dirty & /*url*/ 1) navbutton0_changes.selected = /*url*/ ctx[0] == "/" || /*url*/ ctx[0] == "/home";
    			navbutton0.$set(navbutton0_changes);

    			if (/*selectedProject*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(nav, t1);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const navbutton1_changes = {};
    			if (dirty & /*url*/ 1) navbutton1_changes.selected = /*url*/ ctx[0].indexOf("/logs") == 0;
    			navbutton1.$set(navbutton1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbutton0.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(navbutton1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbutton0.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(navbutton1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_component(navbutton0);
    			if (if_block) if_block.d();
    			destroy_component(navbutton1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	var { activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, "activeRoute");
    	component_subscribe($$self, activeRoute, value => $$invalidate(3, $activeRoute = value));
    	let { url } = $$props;
    	let selectedProject;

    	state.subscribe(s => {
    		$$invalidate(1, selectedProject = s.project);
    	});

    	const writable_props = ["url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	$$self.$capture_state = () => {
    		return {
    			activeRoute,
    			url,
    			selectedProject,
    			$activeRoute
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("activeRoute" in $$props) $$invalidate(2, activeRoute = $$props.activeRoute);
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    		if ("selectedProject" in $$props) $$invalidate(1, selectedProject = $$props.selectedProject);
    		if ("$activeRoute" in $$props) activeRoute.set($activeRoute = $$props.$activeRoute);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 8) {
    			 {
    				if ($activeRoute) $$invalidate(0, url = $activeRoute.uri);
    			}
    		}
    	};

    	return [url, selectedProject, activeRoute];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$m, safe_not_equal, { url: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$m.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*url*/ ctx[0] === undefined && !("url" in props)) {
    			console.warn("<Menu> was created without expected prop 'url'");
    		}
    	}

    	get url() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\ToolbarItem.svelte generated by Svelte v3.16.7 */
    const file$j = "src\\Components\\ToolbarItem.svelte";

    function create_fragment$n(ctx) {
    	let div1;
    	let div0;
    	let i;
    	let i_class_value;
    	let t0;
    	let span;
    	let t1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element$1("div");
    			div0 = element$1("div");
    			i = element$1("i");
    			t0 = space();
    			span = element$1("span");
    			t1 = text(/*title*/ ctx[1]);
    			attr_dev(i, "class", i_class_value = "" + (null_to_empty(/*icon*/ ctx[0]) + " svelte-suzuev"));
    			add_location(i, file$j, 14, 8, 332);
    			attr_dev(span, "class", "svelte-suzuev");
    			add_location(span, file$j, 15, 8, 360);
    			attr_dev(div0, "class", "inner svelte-suzuev");
    			add_location(div0, file$j, 13, 4, 303);
    			attr_dev(div1, "class", "app--toole-bar--item svelte-suzuev");
    			add_location(div1, file$j, 12, 0, 244);
    			dispose = listen_dev(div1, "click", /*clicked*/ ctx[2], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, i);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*icon*/ 1 && i_class_value !== (i_class_value = "" + (null_to_empty(/*icon*/ ctx[0]) + " svelte-suzuev"))) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (dirty & /*title*/ 2) set_data_dev(t1, /*title*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let { icon } = $$props;
    	let { title } = $$props;
    	const dispatch = createEventDispatcher();

    	const clicked = () => {
    		dispatch("click", title);
    	};

    	const writable_props = ["icon", "title"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ToolbarItem> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("icon" in $$props) $$invalidate(0, icon = $$props.icon);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    	};

    	$$self.$capture_state = () => {
    		return { icon, title };
    	};

    	$$self.$inject_state = $$props => {
    		if ("icon" in $$props) $$invalidate(0, icon = $$props.icon);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    	};

    	return [icon, title, clicked];
    }

    class ToolbarItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$n, safe_not_equal, { icon: 0, title: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ToolbarItem",
    			options,
    			id: create_fragment$n.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*icon*/ ctx[0] === undefined && !("icon" in props)) {
    			console.warn("<ToolbarItem> was created without expected prop 'icon'");
    		}

    		if (/*title*/ ctx[1] === undefined && !("title" in props)) {
    			console.warn("<ToolbarItem> was created without expected prop 'title'");
    		}
    	}

    	get icon() {
    		throw new Error("<ToolbarItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<ToolbarItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<ToolbarItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<ToolbarItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\Toolbar.svelte generated by Svelte v3.16.7 */

    const file$k = "src\\Components\\Toolbar.svelte";

    // (22:4) {#if hasProjectSelected}
    function create_if_block$9(ctx) {
    	let t;
    	let current;

    	const toolbaritem0 = new ToolbarItem({
    			props: { icon: "fa fa-plus", title: "New App" },
    			$$inline: true
    		});

    	toolbaritem0.$on("click", toggleAddApplicationDialog);

    	const toolbaritem1 = new ToolbarItem({
    			props: { icon: "fa fa-plus", title: "New File" },
    			$$inline: true
    		});

    	toolbaritem1.$on("click", toggleAddFileDialog);

    	const block = {
    		c: function create() {
    			create_component(toolbaritem0.$$.fragment);
    			t = space();
    			create_component(toolbaritem1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(toolbaritem0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(toolbaritem1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(toolbaritem0.$$.fragment, local);
    			transition_in(toolbaritem1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(toolbaritem0.$$.fragment, local);
    			transition_out(toolbaritem1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(toolbaritem0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(toolbaritem1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$9.name,
    		type: "if",
    		source: "(22:4) {#if hasProjectSelected}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$o(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let div1;
    	let i;
    	let current;
    	let if_block = /*hasProjectSelected*/ ctx[0] && create_if_block$9(ctx);

    	const toolbaritem = new ToolbarItem({
    			props: { icon: "fa fa-folder", title: "Open" },
    			$$inline: true
    		});

    	toolbaritem.$on("click", toggleAddProjectDialog);

    	const block = {
    		c: function create() {
    			div2 = element$1("div");
    			div0 = element$1("div");
    			img = element$1("img");
    			t0 = text("\r\n        ZDragon");
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			create_component(toolbaritem.$$.fragment);
    			t3 = space();
    			div1 = element$1("div");
    			i = element$1("i");
    			set_style(img, "height", "1.5rem");
    			if (img.src !== (img_src_value = "favicon.ico")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "fav");
    			attr_dev(img, "class", "svelte-10hr968");
    			add_location(img, file$k, 18, 8, 414);
    			attr_dev(div0, "class", "filler svelte-10hr968");
    			add_location(div0, file$k, 17, 4, 384);
    			attr_dev(i, "class", "fa fa-times");
    			add_location(i, file$k, 38, 8, 1039);
    			attr_dev(div1, "class", "app--toolbar--close svelte-10hr968");
    			add_location(div1, file$k, 37, 4, 996);
    			attr_dev(div2, "class", "app--toolbar svelte-10hr968");
    			add_location(div2, file$k, 16, 0, 352);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			if (if_block) if_block.m(div2, null);
    			append_dev(div2, t2);
    			mount_component(toolbaritem, div2, null);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, i);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*hasProjectSelected*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$9(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div2, t2);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(toolbaritem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(toolbaritem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			destroy_component(toolbaritem);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let hasProjectSelected;

    	state.subscribe(s => {
    		$$invalidate(0, hasProjectSelected = !!s.project);
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("hasProjectSelected" in $$props) $$invalidate(0, hasProjectSelected = $$props.hasProjectSelected);
    	};

    	return [hasProjectSelected];
    }

    class Toolbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$o, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toolbar",
    			options,
    			id: create_fragment$o.name
    		});
    	}
    }

    /* src\Pages\LogPage.svelte generated by Svelte v3.16.7 */
    const file$l = "src\\Pages\\LogPage.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (14:8) {#each messages as message}
    function create_each_block$4(ctx) {
    	let div;
    	let t0_value = /*message*/ ctx[1].timestamp + "";
    	let t0;
    	let t1;
    	let t2_value = /*message*/ ctx[1].message + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			t3 = space();
    			attr_dev(div, "class", "message");
    			add_location(div, file$l, 14, 12, 291);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*messages*/ 1 && t0_value !== (t0_value = /*message*/ ctx[1].timestamp + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*messages*/ 1 && t2_value !== (t2_value = /*message*/ ctx[1].message + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(14:8) {#each messages as message}",
    		ctx
    	});

    	return block;
    }

    // (13:4) <Panel>
    function create_default_slot$1(ctx) {
    	let each_1_anchor;
    	let each_value = /*messages*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*messages*/ 1) {
    				each_value = /*messages*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(13:4) <Panel>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$p(ctx) {
    	let div;
    	let current;

    	const panel = new Panel({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			create_component(panel.$$.fragment);
    			add_location(div, file$l, 11, 0, 222);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(panel, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const panel_changes = {};

    			if (dirty & /*$$scope, messages*/ 17) {
    				panel_changes.$$scope = { dirty, ctx };
    			}

    			panel.$set(panel_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(panel.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(panel.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(panel);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let messages;

    	state.subscribe(s => {
    		$$invalidate(0, messages = s.messages || []);
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("messages" in $$props) $$invalidate(0, messages = $$props.messages);
    	};

    	return [messages];
    }

    class LogPage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$o, create_fragment$p, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LogPage",
    			options,
    			id: create_fragment$p.name
    		});
    	}
    }

    /* src\Components\Toggle.svelte generated by Svelte v3.16.7 */
    const file$m = "src\\Components\\Toggle.svelte";

    function create_fragment$q(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let label;
    	let input;
    	let t;
    	let span1;
    	let span0;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element$1("div");
    			div1 = element$1("div");
    			div0 = element$1("div");
    			label = element$1("label");
    			input = element$1("input");
    			t = space();
    			span1 = element$1("span");
    			span0 = element$1("span");
    			attr_dev(input, "class", "toggle-input svelte-nca252");
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$m, 11, 16, 296);
    			attr_dev(span0, "class", "toggle-switch svelte-nca252");
    			add_location(span0, file$m, 17, 20, 516);
    			attr_dev(span1, "class", "toggle-track svelte-nca252");
    			add_location(span1, file$m, 16, 16, 467);
    			attr_dev(label, "class", "toggle-label svelte-nca252");
    			add_location(label, file$m, 10, 12, 250);
    			attr_dev(div0, "class", "toggle svelte-nca252");
    			add_location(div0, file$m, 9, 8, 216);
    			attr_dev(div1, "class", "controls");
    			add_location(div1, file$m, 8, 4, 184);
    			attr_dev(div2, "class", "toggle svelte-nca252");
    			add_location(div2, file$m, 7, 0, 158);

    			dispose = [
    				listen_dev(input, "change", /*input_change_handler*/ ctx[3]),
    				listen_dev(input, "change", /*change_handler*/ ctx[2], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, label);
    			append_dev(label, input);
    			input.checked = /*checked*/ ctx[0];
    			append_dev(label, t);
    			append_dev(label, span1);
    			append_dev(span1, span0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*checked*/ 1) {
    				input.checked = /*checked*/ ctx[0];
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$p($$self, $$props, $$invalidate) {
    	let { checked = false } = $$props;
    	var dispatcher = createEventDispatcher();
    	const writable_props = ["checked"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Toggle> was created with unknown prop '${key}'`);
    	});

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function input_change_handler() {
    		checked = this.checked;
    		$$invalidate(0, checked);
    	}

    	$$self.$set = $$props => {
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    	};

    	$$self.$capture_state = () => {
    		return { checked, dispatcher };
    	};

    	$$self.$inject_state = $$props => {
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("dispatcher" in $$props) dispatcher = $$props.dispatcher;
    	};

    	return [checked, dispatcher, change_handler, input_change_handler];
    }

    class Toggle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$p, create_fragment$q, safe_not_equal, { checked: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toggle",
    			options,
    			id: create_fragment$q.name
    		});
    	}

    	get checked() {
    		throw new Error("<Toggle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set checked(value) {
    		throw new Error("<Toggle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Pages\ViewBuilder.svelte generated by Svelte v3.16.7 */
    const file$n = "src\\Pages\\ViewBuilder.svelte";

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (20:4) {#each index as item}
    function create_each_block$5(ctx) {
    	let div;
    	let t0;
    	let span;
    	let t1_value = /*item*/ ctx[1].name + "";
    	let t1;
    	let t2;
    	let current;
    	const toggle = new Toggle({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			create_component(toggle.$$.fragment);
    			t0 = space();
    			span = element$1("span");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(span, "class", "name svelte-1exv20h");
    			add_location(span, file$n, 21, 23, 630);
    			attr_dev(div, "class", "index--item svelte-1exv20h");
    			add_location(div, file$n, 20, 8, 580);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(toggle, div, null);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, t1);
    			append_dev(div, t2);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*index*/ 1) && t1_value !== (t1_value = /*item*/ ctx[1].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(toggle.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(toggle.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(toggle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(20:4) {#each index as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$r(ctx) {
    	let div;
    	let current;
    	let each_value = /*index*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element$1("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_style(div, "max-height", "100%");
    			set_style(div, "overflow", "auto");
    			add_location(div, file$n, 18, 0, 496);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*index*/ 1) {
    				each_value = /*index*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props, $$invalidate) {
    	let index = [];

    	setTimeout(async () => {
    		var result = await get("/project/index");

    		result.sort((a, b) => {
    			var x = a.name.toLowerCase();
    			var y = b.name.toLowerCase();
    			return x < y ? -1 : x > y ? 1 : 0;
    		});

    		$$invalidate(0, index = result);
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("index" in $$props) $$invalidate(0, index = $$props.index);
    	};

    	return [index];
    }

    class ViewBuilder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$q, create_fragment$r, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ViewBuilder",
    			options,
    			id: create_fragment$r.name
    		});
    	}
    }

    /* src\Pages\DocumentReader.svelte generated by Svelte v3.16.7 */
    const file$o = "src\\Pages\\DocumentReader.svelte";

    // (18:0) <Panel>
    function create_default_slot$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			add_location(div, file$o, 18, 4, 306);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[2](div);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[2](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(18:0) <Panel>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$s(ctx) {
    	let current;

    	const panel = new Panel({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(panel.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(panel, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const panel_changes = {};

    			if (dirty & /*$$scope, graphContainer*/ 9) {
    				panel_changes.$$scope = { dirty, ctx };
    			}

    			panel.$set(panel_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(panel.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(panel.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(panel, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props, $$invalidate) {
    	let graphContainer;
    	let s;

    	state.subscribe(s => {
    		
    	});

    	onMount(() => {
    		
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, graphContainer = $$value);
    		});
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("graphContainer" in $$props) $$invalidate(0, graphContainer = $$props.graphContainer);
    		if ("s" in $$props) s = $$props.s;
    	};

    	return [graphContainer, s, div_binding];
    }

    class DocumentReader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$r, create_fragment$s, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DocumentReader",
    			options,
    			id: create_fragment$s.name
    		});
    	}
    }

    /* src\Forms\Search.svelte generated by Svelte v3.16.7 */

    const { console: console_1$2 } = globals;
    const file$p = "src\\Forms\\Search.svelte";

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (44:8) {#each queryResult as node}
    function create_each_block$6(ctx) {
    	let div;
    	let span0;
    	let t0_value = /*node*/ ctx[6].id + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2;
    	let t3_value = /*node*/ ctx[6].score + "";
    	let t3;
    	let t4;
    	let t5_value = /*node*/ ctx[6].namespace + "";
    	let t5;
    	let t6;
    	let span2;
    	let t8;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			span0 = element$1("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element$1("span");
    			t2 = text("(");
    			t3 = text(t3_value);
    			t4 = text(") ");
    			t5 = text(t5_value);
    			t6 = space();
    			span2 = element$1("span");
    			span2.textContent = "node.fileName";
    			t8 = space();
    			attr_dev(span0, "class", "item--id svelte-1grt242");
    			add_location(span0, file$p, 45, 16, 1217);
    			attr_dev(span1, "class", "item--namespace svelte-1grt242");
    			add_location(span1, file$p, 46, 16, 1274);
    			attr_dev(span2, "class", "item--fileName svelte-1grt242");
    			add_location(span2, file$p, 48, 16, 1382);
    			attr_dev(div, "class", "result-list--item svelte-1grt242");
    			add_location(div, file$p, 44, 12, 1142);

    			dispose = listen_dev(
    				div,
    				"click",
    				function () {
    					if (is_function(/*navigate*/ ctx[2](/*node*/ ctx[6]))) /*navigate*/ ctx[2](/*node*/ ctx[6]).apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, t0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    			append_dev(span1, t3);
    			append_dev(span1, t4);
    			append_dev(span1, t5);
    			append_dev(div, t6);
    			append_dev(div, span2);
    			append_dev(div, t8);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*queryResult*/ 1 && t0_value !== (t0_value = /*node*/ ctx[6].id + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*queryResult*/ 1 && t3_value !== (t3_value = /*node*/ ctx[6].score + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*queryResult*/ 1 && t5_value !== (t5_value = /*node*/ ctx[6].namespace + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$6.name,
    		type: "each",
    		source: "(44:8) {#each queryResult as node}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$t(ctx) {
    	let div3;
    	let div1;
    	let div0;
    	let label;
    	let t1;
    	let input;
    	let t2;
    	let div2;
    	let dispose;
    	let each_value = /*queryResult*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element$1("div");
    			div1 = element$1("div");
    			div0 = element$1("div");
    			label = element$1("label");
    			label.textContent = "Query";
    			t1 = space();
    			input = element$1("input");
    			t2 = space();
    			div2 = element$1("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(label, "for", "query");
    			add_location(label, file$p, 38, 12, 941);
    			attr_dev(input, "id", "query");
    			add_location(input, file$p, 39, 12, 987);
    			attr_dev(div0, "class", "form--field");
    			add_location(div0, file$p, 37, 8, 902);
    			attr_dev(div1, "class", "form");
    			add_location(div1, file$p, 36, 4, 874);
    			attr_dev(div2, "class", "result-list svelte-1grt242");
    			add_location(div2, file$p, 42, 4, 1066);
    			attr_dev(div3, "class", "container svelte-1grt242");
    			add_location(div3, file$p, 35, 0, 845);
    			dispose = listen_dev(input, "keypress", /*keypressed*/ ctx[1], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div0, label);
    			append_dev(div0, t1);
    			append_dev(div0, input);
    			append_dev(div3, t2);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*navigate, queryResult*/ 5) {
    				each_value = /*queryResult*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$6(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$6(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$t.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props, $$invalidate) {
    	let { show } = $$props;

    	const keypressed = e => {
    		if (e.key == "Enter") {
    			search(e.target.value);
    		}
    	};

    	let queryResult = [];

    	const search = async query => {
    		console.log(query);

    		try {
    			var result = await get("/project/search/" + query);
    			$$invalidate(0, queryResult = result);
    		} catch(ex) {
    			$$invalidate(0, queryResult = []);
    		}
    	};

    	const navigate = node => {
    		eventbus$1.broadcast("navigate", node);
    	};

    	const writable_props = ["show"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("show" in $$props) $$invalidate(3, show = $$props.show);
    	};

    	$$self.$capture_state = () => {
    		return { show, queryResult, element };
    	};

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(3, show = $$props.show);
    		if ("queryResult" in $$props) $$invalidate(0, queryResult = $$props.queryResult);
    		if ("element" in $$props) $$invalidate(4, element = $$props.element);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*show, element*/ 24) {
    			 {
    				if (show) {
    					$$invalidate(0, queryResult = []);
    					var element = document.getElementById("query");
    					$$invalidate(4, element.value = "", element);
    					element.focus();
    				}
    			}
    		}
    	};

    	return [queryResult, keypressed, navigate, show];
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$s, create_fragment$t, safe_not_equal, { show: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Search",
    			options,
    			id: create_fragment$t.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*show*/ ctx[3] === undefined && !("show" in props)) {
    			console_1$2.warn("<Search> was created without expected prop 'show'");
    		}
    	}

    	get show() {
    		throw new Error("<Search>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<Search>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Forms\RefactorDialog.svelte generated by Svelte v3.16.7 */
    const file_1$1 = "src\\Forms\\RefactorDialog.svelte";

    function get_each_context$7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (49:16) {:else}
    function create_else_block$2(ctx) {
    	let pre;
    	let t_value = /*c*/ ctx[10].literal + "";
    	let t;

    	const block = {
    		c: function create() {
    			pre = element$1("pre");
    			t = text(t_value);
    			attr_dev(pre, "class", "svelte-rftw6z");
    			add_location(pre, file_1$1, 49, 20, 1505);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*content*/ 1 && t_value !== (t_value = /*c*/ ctx[10].literal + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(49:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (47:16) {#if c.isImage}
    function create_if_block$a(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element$1("img");
    			attr_dev(img, "alt", "svg");
    			if (img.src !== (img_src_value = /*c*/ ctx[10].url)) attr_dev(img, "src", img_src_value);
    			add_location(img, file_1$1, 47, 20, 1429);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*content*/ 1 && img.src !== (img_src_value = /*c*/ ctx[10].url)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$a.name,
    		type: "if",
    		source: "(47:16) {#if c.isImage}",
    		ctx
    	});

    	return block;
    }

    // (38:8) {#each content as c}
    function create_each_block$7(ctx) {
    	let div;
    	let t0;
    	let p;
    	let t1_value = /*c*/ ctx[10].namespace + "";
    	let t1;
    	let t2;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*c*/ ctx[10].isImage) return create_if_block$a;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[6](/*c*/ ctx[10], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			if_block.c();
    			t0 = space();
    			p = element$1("p");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(p, "class", "namespace svelte-rftw6z");
    			add_location(p, file_1$1, 53, 16, 1608);
    			attr_dev(div, "class", "item svelte-rftw6z");
    			add_location(div, file_1$1, 38, 12, 1071);
    			dispose = listen_dev(div, "click", click_handler, false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, p);
    			append_dev(p, t1);
    			append_dev(div, t2);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			}

    			if (dirty & /*content*/ 1 && t1_value !== (t1_value = /*c*/ ctx[10].namespace + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$7.name,
    		type: "each",
    		source: "(38:8) {#each content as c}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$u(ctx) {
    	let div5;
    	let div0;
    	let t0;
    	let div4;
    	let form;
    	let div1;
    	let label0;
    	let t2;
    	let input0;
    	let t3;
    	let div2;
    	let label1;
    	let t5;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let t14;
    	let div3;
    	let label2;
    	let t16;
    	let input1;
    	let t17;
    	let button;
    	let dispose;
    	let each_value = /*content*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$7(get_each_context$7(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div5 = element$1("div");
    			div0 = element$1("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div4 = element$1("div");
    			form = element$1("form");
    			div1 = element$1("div");
    			label0 = element$1("label");
    			label0.textContent = "File Name";
    			t2 = space();
    			input0 = element$1("input");
    			t3 = space();
    			div2 = element$1("div");
    			label1 = element$1("label");
    			label1.textContent = "Type";
    			t5 = space();
    			select = element$1("select");
    			option0 = element$1("option");
    			option1 = element$1("option");
    			option1.textContent = "Component";
    			option2 = element$1("option");
    			option2.textContent = "Feature";
    			option3 = element$1("option");
    			option3.textContent = "Database";
    			option4 = element$1("option");
    			option4.textContent = "Endpoint";
    			option5 = element$1("option");
    			option5.textContent = "Model";
    			option6 = element$1("option");
    			option6.textContent = "Story";
    			option7 = element$1("option");
    			option7.textContent = "Documentation";
    			option8 = element$1("option");
    			option8.textContent = "Empty";
    			t14 = space();
    			div3 = element$1("div");
    			label2 = element$1("label");
    			label2.textContent = "Application Name";
    			t16 = space();
    			input1 = element$1("input");
    			t17 = space();
    			button = element$1("button");
    			button.textContent = "Submit";
    			attr_dev(div0, "class", "items svelte-rftw6z");
    			add_location(div0, file_1$1, 36, 4, 1008);
    			attr_dev(label0, "for", "cf_001");
    			add_location(label0, file_1$1, 61, 16, 1810);
    			attr_dev(input0, "id", "cf_001");
    			add_location(input0, file_1$1, 62, 16, 1865);
    			attr_dev(div1, "class", "form--field");
    			add_location(div1, file_1$1, 60, 12, 1767);
    			attr_dev(label1, "for", "cf_002");
    			add_location(label1, file_1$1, 66, 16, 1989);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file_1$1, 68, 20, 2105);
    			option1.__value = "Component";
    			option1.value = option1.__value;
    			add_location(option1, file_1$1, 69, 20, 2137);
    			option2.__value = "Feature";
    			option2.value = option2.__value;
    			add_location(option2, file_1$1, 70, 20, 2185);
    			option3.__value = "Database";
    			option3.value = option3.__value;
    			add_location(option3, file_1$1, 71, 20, 2231);
    			option4.__value = "Endpoint";
    			option4.value = option4.__value;
    			add_location(option4, file_1$1, 72, 20, 2278);
    			option5.__value = "Model";
    			option5.value = option5.__value;
    			add_location(option5, file_1$1, 73, 20, 2325);
    			option6.__value = "Story";
    			option6.value = option6.__value;
    			add_location(option6, file_1$1, 74, 20, 2369);
    			option7.__value = "Documentation";
    			option7.value = option7.__value;
    			add_location(option7, file_1$1, 75, 20, 2413);
    			option8.__value = "Empty";
    			option8.value = option8.__value;
    			add_location(option8, file_1$1, 76, 20, 2465);
    			attr_dev(select, "id", "cf_002");
    			if (/*$file*/ ctx[1].type === void 0) add_render_callback(() => /*select_change_handler*/ ctx[8].call(select));
    			add_location(select, file_1$1, 67, 16, 2039);
    			attr_dev(div2, "class", "form--field");
    			add_location(div2, file_1$1, 65, 12, 1946);
    			attr_dev(label2, "for", "cf_003");
    			add_location(label2, file_1$1, 81, 16, 2593);
    			attr_dev(input1, "id", "cf_003");
    			add_location(input1, file_1$1, 82, 16, 2655);
    			attr_dev(div3, "class", "form--field");
    			add_location(div3, file_1$1, 80, 12, 2550);
    			attr_dev(button, "type", "button");
    			add_location(button, file_1$1, 86, 12, 2803);
    			attr_dev(form, "class", "form");
    			add_location(form, file_1$1, 59, 8, 1734);
    			attr_dev(div4, "class", "details svelte-rftw6z");
    			add_location(div4, file_1$1, 58, 4, 1703);
    			attr_dev(div5, "class", "refactor-content svelte-rftw6z");
    			add_location(div5, file_1$1, 35, 0, 972);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    				listen_dev(select, "change", /*select_change_handler*/ ctx[8]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    				listen_dev(button, "click", /*submitForm*/ ctx[3], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div5, t0);
    			append_dev(div5, div4);
    			append_dev(div4, form);
    			append_dev(form, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t2);
    			append_dev(div1, input0);
    			set_input_value(input0, /*$file*/ ctx[1].name);
    			append_dev(form, t3);
    			append_dev(form, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t5);
    			append_dev(div2, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(select, option4);
    			append_dev(select, option5);
    			append_dev(select, option6);
    			append_dev(select, option7);
    			append_dev(select, option8);
    			select_option(select, /*$file*/ ctx[1].type);
    			append_dev(form, t14);
    			append_dev(form, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t16);
    			append_dev(div3, input1);
    			set_input_value(input1, /*$file*/ ctx[1].appName);
    			append_dev(form, t17);
    			append_dev(form, button);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*toggleRefactoringDialog, eventbus, content*/ 1) {
    				each_value = /*content*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$7(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$7(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*$file*/ 2 && input0.value !== /*$file*/ ctx[1].name) {
    				set_input_value(input0, /*$file*/ ctx[1].name);
    			}

    			if (dirty & /*$file*/ 2) {
    				select_option(select, /*$file*/ ctx[1].type);
    			}

    			if (dirty & /*$file*/ 2 && input1.value !== /*$file*/ ctx[1].appName) {
    				set_input_value(input1, /*$file*/ ctx[1].appName);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$u.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$t($$self, $$props, $$invalidate) {
    	let $file;
    	let file = writable({});
    	validate_store(file, "file");
    	component_subscribe($$self, file, value => $$invalidate(1, $file = value));
    	let content = [];
    	let namespace = "";
    	let title = "";

    	const submitForm = () => {
    		console.log($file);
    	};

    	state.subscribe(s => {
    		if (!s || !s.refactoring || !s.module || !s.module.namespace) return;
    		$$invalidate(0, content = s.refactoring.content || []);
    		namespace = s.refactoring.namespace;
    		title = s.refactoring.title;
    		let [appName, _type, ...rest] = s.module.namespace.split(".");
    		let type = _type.slice(0, _type.length - 1);

    		file.update(f => {
    			return {
    				...f,
    				name: s.refactoring.title,
    				appName,
    				type
    			};
    		});
    	});

    	const click_handler = c => {
    		toggleRefactoringDialog();
    		eventbus$1.broadcast("navigate", c);
    	};

    	function input0_input_handler() {
    		$file.name = this.value;
    		file.set($file);
    	}

    	function select_change_handler() {
    		$file.type = select_value(this);
    		file.set($file);
    	}

    	function input1_input_handler() {
    		$file.appName = this.value;
    		file.set($file);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("file" in $$props) $$invalidate(2, file = $$props.file);
    		if ("content" in $$props) $$invalidate(0, content = $$props.content);
    		if ("namespace" in $$props) namespace = $$props.namespace;
    		if ("title" in $$props) title = $$props.title;
    		if ("$file" in $$props) file.set($file = $$props.$file);
    	};

    	return [
    		content,
    		$file,
    		file,
    		submitForm,
    		namespace,
    		title,
    		click_handler,
    		input0_input_handler,
    		select_change_handler,
    		input1_input_handler
    	];
    }

    class RefactorDialog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$t, create_fragment$u, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RefactorDialog",
    			options,
    			id: create_fragment$u.name
    		});
    	}
    }

    /* src\Forms\JsonSchemaDialog.svelte generated by Svelte v3.16.7 */
    const file$q = "src\\Forms\\JsonSchemaDialog.svelte";

    // (15:4) {#if schema}
    function create_if_block$b(ctx) {
    	let pre;
    	let t;

    	const block = {
    		c: function create() {
    			pre = element$1("pre");
    			t = text(/*schema*/ ctx[0]);
    			add_location(pre, file$q, 15, 8, 351);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*schema*/ 1) set_data_dev(t, /*schema*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$b.name,
    		type: "if",
    		source: "(15:4) {#if schema}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$v(ctx) {
    	let div;
    	let if_block = /*schema*/ ctx[0] && create_if_block$b(ctx);

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "jsonschema-content svelte-qzkoef");
    			add_location(div, file$q, 13, 0, 291);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*schema*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$b(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$v.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$u($$self, $$props, $$invalidate) {
    	let schema = "";

    	state.subscribe(s => {
    		$$invalidate(0, schema = s.schema);
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("schema" in $$props) $$invalidate(0, schema = $$props.schema);
    	};

    	return [schema];
    }

    class JsonSchemaDialog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$u, create_fragment$v, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JsonSchemaDialog",
    			options,
    			id: create_fragment$v.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.16.7 */
    const file$r = "src\\App.svelte";

    // (67:8) <Route path="/editor">
    function create_default_slot_13$1(ctx) {
    	let current;
    	const editorpage = new EditorPage({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(editorpage.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editorpage, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editorpage.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editorpage.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editorpage, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_13$1.name,
    		type: "slot",
    		source: "(67:8) <Route path=\\\"/editor\\\">",
    		ctx
    	});

    	return block;
    }

    // (70:8) <Route path="/editor/:namespace" let:params>
    function create_default_slot_12$1(ctx) {
    	let current;
    	const editorpage = new EditorPage({ props: { params: true }, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(editorpage.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editorpage, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editorpage.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editorpage.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editorpage, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_12$1.name,
    		type: "slot",
    		source: "(70:8) <Route path=\\\"/editor/:namespace\\\" let:params>",
    		ctx
    	});

    	return block;
    }

    // (74:8) <Route path="/">
    function create_default_slot_11$1(ctx) {
    	let current;
    	const home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_11$1.name,
    		type: "slot",
    		source: "(74:8) <Route path=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (77:8) <Route path="/home">
    function create_default_slot_10$1(ctx) {
    	let current;
    	const home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10$1.name,
    		type: "slot",
    		source: "(77:8) <Route path=\\\"/home\\\">",
    		ctx
    	});

    	return block;
    }

    // (80:8) <Route path="/logs">
    function create_default_slot_9$1(ctx) {
    	let current;
    	const logpage = new LogPage({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(logpage.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(logpage, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(logpage.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(logpage.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(logpage, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9$1.name,
    		type: "slot",
    		source: "(80:8) <Route path=\\\"/logs\\\">",
    		ctx
    	});

    	return block;
    }

    // (83:8) <Route path="/reader">
    function create_default_slot_8$1(ctx) {
    	let current;
    	const documentreader = new DocumentReader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(documentreader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(documentreader, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(documentreader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(documentreader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(documentreader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8$1.name,
    		type: "slot",
    		source: "(83:8) <Route path=\\\"/reader\\\">",
    		ctx
    	});

    	return block;
    }

    // (86:8) <Route path="view-builder">
    function create_default_slot_7$1(ctx) {
    	let current;
    	const viewbuilder = new ViewBuilder({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(viewbuilder.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(viewbuilder, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(viewbuilder.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(viewbuilder.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(viewbuilder, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7$1.name,
    		type: "slot",
    		source: "(86:8) <Route path=\\\"view-builder\\\">",
    		ctx
    	});

    	return block;
    }

    // (61:0) <Router {url}>
    function create_default_slot_6$1(ctx) {
    	let div2;
    	let t0;
    	let div1;
    	let t1;
    	let div0;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let current;
    	const toolbar = new Toolbar({ $$inline: true });

    	const menu = new Menu({
    			props: { url: /*url*/ ctx[6] },
    			$$inline: true
    		});

    	const route0 = new Route({
    			props: {
    				path: "/editor",
    				$$slots: { default: [create_default_slot_13$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route1 = new Route({
    			props: {
    				path: "/editor/:namespace",
    				$$slots: {
    					default: [
    						create_default_slot_12$1,
    						({ params }) => ({ 8: params }),
    						({ params }) => params ? 256 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route2 = new Route({
    			props: { path: "/about", component: About },
    			$$inline: true
    		});

    	const route3 = new Route({
    			props: {
    				path: "/",
    				$$slots: { default: [create_default_slot_11$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route4 = new Route({
    			props: {
    				path: "/home",
    				$$slots: { default: [create_default_slot_10$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route5 = new Route({
    			props: {
    				path: "/logs",
    				$$slots: { default: [create_default_slot_9$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route6 = new Route({
    			props: {
    				path: "/reader",
    				$$slots: { default: [create_default_slot_8$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route7 = new Route({
    			props: {
    				path: "view-builder",
    				$$slots: { default: [create_default_slot_7$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element$1("div");
    			create_component(toolbar.$$.fragment);
    			t0 = space();
    			div1 = element$1("div");
    			create_component(menu.$$.fragment);
    			t1 = space();
    			div0 = element$1("div");
    			create_component(route0.$$.fragment);
    			t2 = space();
    			create_component(route1.$$.fragment);
    			t3 = space();
    			create_component(route2.$$.fragment);
    			t4 = space();
    			create_component(route3.$$.fragment);
    			t5 = space();
    			create_component(route4.$$.fragment);
    			t6 = space();
    			create_component(route5.$$.fragment);
    			t7 = space();
    			create_component(route6.$$.fragment);
    			t8 = space();
    			create_component(route7.$$.fragment);
    			attr_dev(div0, "class", "panel svelte-12cvq5i");
    			add_location(div0, file$r, 65, 6, 2026);
    			attr_dev(div1, "class", "content-container svelte-12cvq5i");
    			add_location(div1, file$r, 63, 4, 1965);
    			attr_dev(div2, "class", "app--main svelte-12cvq5i");
    			add_location(div2, file$r, 61, 2, 1919);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			mount_component(toolbar, div2, null);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			mount_component(menu, div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(route0, div0, null);
    			append_dev(div0, t2);
    			mount_component(route1, div0, null);
    			append_dev(div0, t3);
    			mount_component(route2, div0, null);
    			append_dev(div0, t4);
    			mount_component(route3, div0, null);
    			append_dev(div0, t5);
    			mount_component(route4, div0, null);
    			append_dev(div0, t6);
    			mount_component(route5, div0, null);
    			append_dev(div0, t7);
    			mount_component(route6, div0, null);
    			append_dev(div0, t8);
    			mount_component(route7, div0, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const route0_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				route0_changes.$$scope = { dirty, ctx };
    			}

    			route0.$set(route0_changes);
    			const route1_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				route1_changes.$$scope = { dirty, ctx };
    			}

    			route1.$set(route1_changes);
    			const route3_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				route3_changes.$$scope = { dirty, ctx };
    			}

    			route3.$set(route3_changes);
    			const route4_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				route4_changes.$$scope = { dirty, ctx };
    			}

    			route4.$set(route4_changes);
    			const route5_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				route5_changes.$$scope = { dirty, ctx };
    			}

    			route5.$set(route5_changes);
    			const route6_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				route6_changes.$$scope = { dirty, ctx };
    			}

    			route6.$set(route6_changes);
    			const route7_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				route7_changes.$$scope = { dirty, ctx };
    			}

    			route7.$set(route7_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(toolbar.$$.fragment, local);
    			transition_in(menu.$$.fragment, local);
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			transition_in(route3.$$.fragment, local);
    			transition_in(route4.$$.fragment, local);
    			transition_in(route5.$$.fragment, local);
    			transition_in(route6.$$.fragment, local);
    			transition_in(route7.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(toolbar.$$.fragment, local);
    			transition_out(menu.$$.fragment, local);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			transition_out(route5.$$.fragment, local);
    			transition_out(route6.$$.fragment, local);
    			transition_out(route7.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(toolbar);
    			destroy_component(menu);
    			destroy_component(route0);
    			destroy_component(route1);
    			destroy_component(route2);
    			destroy_component(route3);
    			destroy_component(route4);
    			destroy_component(route5);
    			destroy_component(route6);
    			destroy_component(route7);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6$1.name,
    		type: "slot",
    		source: "(61:0) <Router {url}>",
    		ctx
    	});

    	return block;
    }

    // (94:0) <Modal title="Search" show={showSearch} close={() => (showSearch = false)}>
    function create_default_slot_5$1(ctx) {
    	let current;

    	const search = new Search({
    			props: { show: /*showSearch*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(search.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(search, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const search_changes = {};
    			if (dirty & /*showSearch*/ 1) search_changes.show = /*showSearch*/ ctx[0];
    			search.$set(search_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(search.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(search.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(search, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5$1.name,
    		type: "slot",
    		source: "(94:0) <Modal title=\\\"Search\\\" show={showSearch} close={() => (showSearch = false)}>",
    		ctx
    	});

    	return block;
    }

    // (98:0) <Modal    title="Select Directory"    show={showAddProjectDialog}    close={toggleAddProjectDialog}>
    function create_default_slot_4$1(ctx) {
    	let current;

    	const selectproject = new SelectProject({
    			props: { close: toggleAddProjectDialog },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(selectproject.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(selectproject, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(selectproject.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(selectproject.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(selectproject, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(98:0) <Modal    title=\\\"Select Directory\\\"    show={showAddProjectDialog}    close={toggleAddProjectDialog}>",
    		ctx
    	});

    	return block;
    }

    // (105:0) {#if showAddFileDialog}
    function create_if_block_2$1(ctx) {
    	let current;

    	const modal = new Modal({
    			props: {
    				title: "Add File",
    				show: /*showAddFileDialog*/ ctx[2],
    				close: toggleAddFileDialog,
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};
    			if (dirty & /*showAddFileDialog*/ 4) modal_changes.show = /*showAddFileDialog*/ ctx[2];

    			if (dirty & /*$$scope*/ 512) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(105:0) {#if showAddFileDialog}",
    		ctx
    	});

    	return block;
    }

    // (106:2) <Modal title="Add File" show={showAddFileDialog} close={toggleAddFileDialog}>
    function create_default_slot_3$1(ctx) {
    	let current;
    	const createfile = new CreateFile({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(createfile.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(createfile, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(createfile.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(createfile.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(createfile, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(106:2) <Modal title=\\\"Add File\\\" show={showAddFileDialog} close={toggleAddFileDialog}>",
    		ctx
    	});

    	return block;
    }

    // (111:0) <Modal    title="Add Application"    show={showAddApplicationDialog}    close={toggleAddApplicationDialog}>
    function create_default_slot_2$1(ctx) {
    	let current;
    	const createapplication = new CreateApplication({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(createapplication.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(createapplication, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(createapplication.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(createapplication.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(createapplication, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(111:0) <Modal    title=\\\"Add Application\\\"    show={showAddApplicationDialog}    close={toggleAddApplicationDialog}>",
    		ctx
    	});

    	return block;
    }

    // (118:0) {#if showRefactoringDialog}
    function create_if_block_1$5(ctx) {
    	let current;

    	const modal = new Modal({
    			props: {
    				title: "Refactoring",
    				show: /*showRefactoringDialog*/ ctx[4],
    				close: toggleRefactoringDialog,
    				size: "wide",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};
    			if (dirty & /*showRefactoringDialog*/ 16) modal_changes.show = /*showRefactoringDialog*/ ctx[4];

    			if (dirty & /*$$scope*/ 512) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(118:0) {#if showRefactoringDialog}",
    		ctx
    	});

    	return block;
    }

    // (119:2) <Modal      title="Refactoring"      show={showRefactoringDialog}      close={toggleRefactoringDialog}      size="wide">
    function create_default_slot_1$1(ctx) {
    	let current;
    	const refactordialog = new RefactorDialog({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(refactordialog.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(refactordialog, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(refactordialog.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(refactordialog.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(refactordialog, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(119:2) <Modal      title=\\\"Refactoring\\\"      show={showRefactoringDialog}      close={toggleRefactoringDialog}      size=\\\"wide\\\">",
    		ctx
    	});

    	return block;
    }

    // (128:0) {#if showJsonSchemaDialog}
    function create_if_block$c(ctx) {
    	let current;

    	const modal = new Modal({
    			props: {
    				title: "JSON Schema",
    				show: /*showJsonSchemaDialog*/ ctx[5],
    				close: toggleJsonSchemaDialog,
    				size: "wide",
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};
    			if (dirty & /*showJsonSchemaDialog*/ 32) modal_changes.show = /*showJsonSchemaDialog*/ ctx[5];

    			if (dirty & /*$$scope*/ 512) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$c.name,
    		type: "if",
    		source: "(128:0) {#if showJsonSchemaDialog}",
    		ctx
    	});

    	return block;
    }

    // (129:2) <Modal      title="JSON Schema"      show={showJsonSchemaDialog}      close={toggleJsonSchemaDialog}      size="wide">
    function create_default_slot$3(ctx) {
    	let current;
    	const jsonschemadialog = new JsonSchemaDialog({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(jsonschemadialog.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonschemadialog, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonschemadialog.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonschemadialog.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonschemadialog, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(129:2) <Modal      title=\\\"JSON Schema\\\"      show={showJsonSchemaDialog}      close={toggleJsonSchemaDialog}      size=\\\"wide\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$w(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let if_block2_anchor;
    	let current;

    	const router = new Router({
    			props: {
    				url: /*url*/ ctx[6],
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const modal0 = new Modal({
    			props: {
    				title: "Search",
    				show: /*showSearch*/ ctx[0],
    				close: /*func*/ ctx[7],
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const modal1 = new Modal({
    			props: {
    				title: "Select Directory",
    				show: /*showAddProjectDialog*/ ctx[3],
    				close: toggleAddProjectDialog,
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block0 = /*showAddFileDialog*/ ctx[2] && create_if_block_2$1(ctx);

    	const modal2 = new Modal({
    			props: {
    				title: "Add Application",
    				show: /*showAddApplicationDialog*/ ctx[1],
    				close: toggleAddApplicationDialog,
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block1 = /*showRefactoringDialog*/ ctx[4] && create_if_block_1$5(ctx);
    	let if_block2 = /*showJsonSchemaDialog*/ ctx[5] && create_if_block$c(ctx);

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    			t0 = space();
    			create_component(modal0.$$.fragment);
    			t1 = space();
    			create_component(modal1.$$.fragment);
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			create_component(modal2.$$.fragment);
    			t4 = space();
    			if (if_block1) if_block1.c();
    			t5 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(modal0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(modal1, target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(modal2, target, anchor);
    			insert_dev(target, t4, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t5, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};

    			if (dirty & /*$$scope*/ 512) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    			const modal0_changes = {};
    			if (dirty & /*showSearch*/ 1) modal0_changes.show = /*showSearch*/ ctx[0];
    			if (dirty & /*showSearch*/ 1) modal0_changes.close = /*func*/ ctx[7];

    			if (dirty & /*$$scope, showSearch*/ 513) {
    				modal0_changes.$$scope = { dirty, ctx };
    			}

    			modal0.$set(modal0_changes);
    			const modal1_changes = {};
    			if (dirty & /*showAddProjectDialog*/ 8) modal1_changes.show = /*showAddProjectDialog*/ ctx[3];

    			if (dirty & /*$$scope*/ 512) {
    				modal1_changes.$$scope = { dirty, ctx };
    			}

    			modal1.$set(modal1_changes);

    			if (/*showAddFileDialog*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t3.parentNode, t3);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const modal2_changes = {};
    			if (dirty & /*showAddApplicationDialog*/ 2) modal2_changes.show = /*showAddApplicationDialog*/ ctx[1];

    			if (dirty & /*$$scope*/ 512) {
    				modal2_changes.$$scope = { dirty, ctx };
    			}

    			modal2.$set(modal2_changes);

    			if (/*showRefactoringDialog*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block_1$5(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t5.parentNode, t5);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*showJsonSchemaDialog*/ ctx[5]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block$c(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			transition_in(modal0.$$.fragment, local);
    			transition_in(modal1.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(modal2.$$.fragment, local);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			transition_out(modal0.$$.fragment, local);
    			transition_out(modal1.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(modal2.$$.fragment, local);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(modal0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(modal1, detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(modal2, detaching);
    			if (detaching) detach_dev(t4);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t5);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$w.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$v($$self, $$props, $$invalidate) {
    	let url = "";
    	let showSearch = false;

    	eventbus$1.subscribe("ctrl-p", () => {
    		$$invalidate(0, showSearch = !showSearch);
    	});

    	eventbus$1.subscribe("navigate", () => {
    		$$invalidate(0, showSearch = false);
    	});

    	let showAddApplicationDialog = false;
    	let showAddFileDialog = false;
    	let showAddProjectDialog = false;
    	let showRefactoringDialog = false;
    	let showJsonSchemaDialog = false;

    	state.subscribe(s => {
    		$$invalidate(2, showAddFileDialog = !!s.showAddFileDialog);
    		$$invalidate(1, showAddApplicationDialog = !!s.showAddApplicationDialog);
    		$$invalidate(3, showAddProjectDialog = !!s.showAddProjectDialog);
    		$$invalidate(4, showRefactoringDialog = !!s.showRefactoringDialog);
    		$$invalidate(5, showJsonSchemaDialog = !!s.showJsonSchemaDialog);
    	});

    	const func = () => $$invalidate(0, showSearch = false);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(6, url = $$props.url);
    		if ("showSearch" in $$props) $$invalidate(0, showSearch = $$props.showSearch);
    		if ("showAddApplicationDialog" in $$props) $$invalidate(1, showAddApplicationDialog = $$props.showAddApplicationDialog);
    		if ("showAddFileDialog" in $$props) $$invalidate(2, showAddFileDialog = $$props.showAddFileDialog);
    		if ("showAddProjectDialog" in $$props) $$invalidate(3, showAddProjectDialog = $$props.showAddProjectDialog);
    		if ("showRefactoringDialog" in $$props) $$invalidate(4, showRefactoringDialog = $$props.showRefactoringDialog);
    		if ("showJsonSchemaDialog" in $$props) $$invalidate(5, showJsonSchemaDialog = $$props.showJsonSchemaDialog);
    	};

    	 {
    		console.log("URL: ", url);
    	}

    	return [
    		showSearch,
    		showAddApplicationDialog,
    		showAddFileDialog,
    		showAddProjectDialog,
    		showRefactoringDialog,
    		showJsonSchemaDialog,
    		url,
    		func
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$v, create_fragment$w, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$w.name
    		});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
    }

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var keypress = createCommonjsModule(function (module, exports) {
    // Generated by CoffeeScript 1.8.0

    /*
    Copyright 2014 David Mauro
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
    Keypress is a robust keyboard input capturing Javascript utility
    focused on input for games.
    version 2.1.5
     */


    /*
    Combo options available and their defaults:
        keys                  : []            - An array of the keys pressed together to activate combo.
        count                 : 0             - The number of times a counting combo has been pressed. Reset on release.
        is_unordered          : false         - Unless this is set to true, the keys can be pressed down in any order.
        is_counting           : false         - Makes this a counting combo (see documentation).
        is_exclusive          : false         - This combo will replace other exclusive combos when true.
        is_solitary           : false         - This combo will only fire if ONLY it's keys are pressed down.
        is_sequence           : false         - Rather than a key combo, this is an ordered key sequence.
        prevent_default       : false         - Prevent default behavior for all component key keypresses.
        prevent_repeat        : false         - Prevent the combo from repeating when keydown is held.
        normalize_caps_lock   : false         - Do not allow turning caps lock on to prevent combos from being activated.
        on_keydown            : null          - A function that is called when the combo is pressed.
        on_keyup              : null          - A function that is called when the combo is released.
        on_release            : null          - A function that is called when all keys in the combo are released.
        this                  : undefined     - Defines the scope for your callback functions.
     */

    (function () {
        var Combo, keypress, _change_keycodes_by_browser, _compare_arrays, _compare_arrays_sorted, _convert_key_to_readable, _convert_to_shifted_key, _decide_meta_key, _factory_defaults, _filter_array, _index_of_in_array, _is_array_in_array, _is_array_in_array_sorted, _key_is_valid, _keycode_alternate_names, _keycode_dictionary, _keycode_shifted_keys, _log_error, _metakey, _modifier_event_mapping, _modifier_keys, _validate_combo,
            __hasProp = {}.hasOwnProperty,
            __indexOf = [].indexOf || function (item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

        _factory_defaults = {
            is_unordered: false,
            is_counting: false,
            is_exclusive: false,
            is_solitary: false,
            prevent_default: false,
            prevent_repeat: false,
            normalize_caps_lock: false
        };

        _modifier_keys = ["meta", "alt", "option", "ctrl", "shift", "cmd"];

        _metakey = "ctrl";

        keypress = {};

        keypress.debug = false;

        Combo = (function () {
            function Combo(dictionary) {
                var property, value;
                for (property in dictionary) {
                    if (!__hasProp.call(dictionary, property)) continue;
                    value = dictionary[property];
                    if (value !== false) {
                        this[property] = value;
                    }
                }
                this.keys = this.keys || [];
                this.count = this.count || 0;
            }

            Combo.prototype.allows_key_repeat = function () {
                return !this.prevent_repeat && typeof this.on_keydown === "function";
            };

            Combo.prototype.reset = function () {
                this.count = 0;
                return this.keyup_fired = null;
            };

            return Combo;

        })();

        keypress.Listener = (function () {
            function Listener(element, defaults) {
                var attach_handler, property, value;
                if ((typeof jQuery !== "undefined" && jQuery !== null) && element instanceof jQuery) {
                    if (element.length !== 1) {
                        _log_error("Warning: your jQuery selector should have exactly one object.");
                    }
                    element = element[0];
                }
                this.should_suppress_event_defaults = false;
                this.should_force_event_defaults = false;
                this.sequence_delay = 800;
                this._registered_combos = [];
                this._keys_down = [];
                this._active_combos = [];
                this._sequence = [];
                this._sequence_timer = null;
                this._prevent_capture = false;
                this._defaults = defaults || {};
                for (property in _factory_defaults) {
                    if (!__hasProp.call(_factory_defaults, property)) continue;
                    value = _factory_defaults[property];
                    this._defaults[property] = this._defaults[property] || value;
                }
                this.element = element || document.body;
                attach_handler = function (target, event, handler) {
                    if (target.addEventListener) {
                        target.addEventListener(event, handler);
                    } else if (target.attachEvent) {
                        target.attachEvent("on" + event, handler);
                    }
                    return handler;
                };
                this.keydown_event = attach_handler(this.element, "keydown", (function (_this) {
                    return function (e) {
                        e = e || window.event;
                        _this._receive_input(e, true);
                        return _this._bug_catcher(e);
                    };
                })(this));
                this.keyup_event = attach_handler(this.element, "keyup", (function (_this) {
                    return function (e) {
                        e = e || window.event;
                        return _this._receive_input(e, false);
                    };
                })(this));
                this.blur_event = attach_handler(window, "blur", (function (_this) {
                    return function () {
                        var key, _i, _len, _ref;
                        _ref = _this._keys_down;
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            key = _ref[_i];
                            _this._key_up(key, {});
                        }
                        return _this._keys_down = [];
                    };
                })(this));
            }

            Listener.prototype.destroy = function () {
                var remove_handler;
                remove_handler = function (target, event, handler) {
                    if (target.removeEventListener != null) {
                        return target.removeEventListener(event, handler);
                    } else if (target.removeEvent != null) {
                        return target.removeEvent("on" + event, handler);
                    }
                };
                remove_handler(this.element, "keydown", this.keydown_event);
                remove_handler(this.element, "keyup", this.keyup_event);
                return remove_handler(window, "blur", this.blur_event);
            };

            Listener.prototype._bug_catcher = function (e) {
                var _ref, _ref1;
                if (_metakey === "cmd" && __indexOf.call(this._keys_down, "cmd") >= 0 && ((_ref = _convert_key_to_readable((_ref1 = e.keyCode) != null ? _ref1 : e.key)) !== "cmd" && _ref !== "shift" && _ref !== "alt" && _ref !== "caps" && _ref !== "tab")) {
                    return this._receive_input(e, false);
                }
            };

            Listener.prototype._cmd_bug_check = function (combo_keys) {
                if (_metakey === "cmd" && __indexOf.call(this._keys_down, "cmd") >= 0 && __indexOf.call(combo_keys, "cmd") < 0) {
                    return false;
                }
                return true;
            };

            Listener.prototype._prevent_default = function (e, should_prevent) {
                if ((should_prevent || this.should_suppress_event_defaults) && !this.should_force_event_defaults) {
                    if (e.preventDefault) {
                        e.preventDefault();
                    } else {
                        e.returnValue = false;
                    }
                    if (e.stopPropagation) {
                        return e.stopPropagation();
                    }
                }
            };

            Listener.prototype._get_active_combos = function (key) {
                var active_combos, keys_down;
                active_combos = [];
                keys_down = _filter_array(this._keys_down, function (down_key) {
                    return down_key !== key;
                });
                keys_down.push(key);
                this._match_combo_arrays(keys_down, (function (_this) {
                    return function (match) {
                        if (_this._cmd_bug_check(match.keys)) {
                            return active_combos.push(match);
                        }
                    };
                })(this));
                this._fuzzy_match_combo_arrays(keys_down, (function (_this) {
                    return function (match) {
                        if (__indexOf.call(active_combos, match) >= 0) {
                            return;
                        }
                        if (!(match.is_solitary || !_this._cmd_bug_check(match.keys))) {
                            return active_combos.push(match);
                        }
                    };
                })(this));
                return active_combos;
            };

            Listener.prototype._get_potential_combos = function (key) {
                var combo, potentials, _i, _len, _ref;
                potentials = [];
                _ref = this._registered_combos;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    combo = _ref[_i];
                    if (combo.is_sequence) {
                        continue;
                    }
                    if (__indexOf.call(combo.keys, key) >= 0 && this._cmd_bug_check(combo.keys)) {
                        potentials.push(combo);
                    }
                }
                return potentials;
            };

            Listener.prototype._add_to_active_combos = function (combo) {
                var active_combo, active_key, active_keys, already_replaced, combo_key, i, should_prepend, should_replace, _i, _j, _k, _len, _len1, _ref, _ref1;
                should_replace = false;
                should_prepend = true;
                already_replaced = false;
                if (__indexOf.call(this._active_combos, combo) >= 0) {
                    return true;
                } else if (this._active_combos.length) {
                    for (i = _i = 0, _ref = this._active_combos.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                        active_combo = this._active_combos[i];
                        if (!(active_combo && active_combo.is_exclusive && combo.is_exclusive)) {
                            continue;
                        }
                        active_keys = active_combo.keys;
                        if (!should_replace) {
                            for (_j = 0, _len = active_keys.length; _j < _len; _j++) {
                                active_key = active_keys[_j];
                                should_replace = true;
                                if (__indexOf.call(combo.keys, active_key) < 0) {
                                    should_replace = false;
                                    break;
                                }
                            }
                        }
                        if (should_prepend && !should_replace) {
                            _ref1 = combo.keys;
                            for (_k = 0, _len1 = _ref1.length; _k < _len1; _k++) {
                                combo_key = _ref1[_k];
                                should_prepend = false;
                                if (__indexOf.call(active_keys, combo_key) < 0) {
                                    should_prepend = true;
                                    break;
                                }
                            }
                        }
                        if (should_replace) {
                            if (already_replaced) {
                                active_combo = this._active_combos.splice(i, 1)[0];
                                if (active_combo != null) {
                                    active_combo.reset();
                                }
                            } else {
                                active_combo = this._active_combos.splice(i, 1, combo)[0];
                                if (active_combo != null) {
                                    active_combo.reset();
                                }
                                already_replaced = true;
                            }
                            should_prepend = false;
                        }
                    }
                }
                if (should_prepend) {
                    this._active_combos.unshift(combo);
                }
                return should_replace || should_prepend;
            };

            Listener.prototype._remove_from_active_combos = function (combo) {
                var active_combo, i, _i, _ref;
                for (i = _i = 0, _ref = this._active_combos.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                    active_combo = this._active_combos[i];
                    if (active_combo === combo) {
                        combo = this._active_combos.splice(i, 1)[0];
                        combo.reset();
                        break;
                    }
                }
            };

            Listener.prototype._get_possible_sequences = function () {
                var combo, i, j, match, matches, sequence, _i, _j, _k, _len, _ref, _ref1, _ref2;
                matches = [];
                _ref = this._registered_combos;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    combo = _ref[_i];
                    for (j = _j = 1, _ref1 = this._sequence.length; 1 <= _ref1 ? _j <= _ref1 : _j >= _ref1; j = 1 <= _ref1 ? ++_j : --_j) {
                        sequence = this._sequence.slice(-j);
                        if (!combo.is_sequence) {
                            continue;
                        }
                        if (__indexOf.call(combo.keys, "shift") < 0) {
                            sequence = _filter_array(sequence, function (key) {
                                return key !== "shift";
                            });
                            if (!sequence.length) {
                                continue;
                            }
                        }
                        for (i = _k = 0, _ref2 = sequence.length; 0 <= _ref2 ? _k < _ref2 : _k > _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
                            if (combo.keys[i] === sequence[i]) {
                                match = true;
                            } else {
                                match = false;
                                break;
                            }
                        }
                        if (match) {
                            matches.push(combo);
                        }
                    }
                }
                return matches;
            };

            Listener.prototype._add_key_to_sequence = function (key, e) {
                var combo, sequence_combos, _i, _len;
                this._sequence.push(key);
                sequence_combos = this._get_possible_sequences();
                if (sequence_combos.length) {
                    for (_i = 0, _len = sequence_combos.length; _i < _len; _i++) {
                        combo = sequence_combos[_i];
                        this._prevent_default(e, combo.prevent_default);
                    }
                    if (this._sequence_timer) {
                        clearTimeout(this._sequence_timer);
                    }
                    if (this.sequence_delay > -1) {
                        this._sequence_timer = setTimeout((function (_this) {
                            return function () {
                                return _this._sequence = [];
                            };
                        })(this), this.sequence_delay);
                    }
                } else {
                    this._sequence = [];
                }
            };

            Listener.prototype._get_sequence = function (key) {
                var combo, i, j, match, seq_key, sequence, _i, _j, _k, _len, _ref, _ref1, _ref2;
                _ref = this._registered_combos;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    combo = _ref[_i];
                    if (!combo.is_sequence) {
                        continue;
                    }
                    for (j = _j = 1, _ref1 = this._sequence.length; 1 <= _ref1 ? _j <= _ref1 : _j >= _ref1; j = 1 <= _ref1 ? ++_j : --_j) {
                        sequence = (_filter_array(this._sequence, function (seq_key) {
                            if (__indexOf.call(combo.keys, "shift") >= 0) {
                                return true;
                            }
                            return seq_key !== "shift";
                        })).slice(-j);
                        if (combo.keys.length !== sequence.length) {
                            continue;
                        }
                        for (i = _k = 0, _ref2 = sequence.length; 0 <= _ref2 ? _k < _ref2 : _k > _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
                            seq_key = sequence[i];
                            if (__indexOf.call(combo.keys, "shift") < 0) {
                                if (seq_key === "shift") {
                                    continue;
                                }
                            }
                            if (key === "shift" && __indexOf.call(combo.keys, "shift") < 0) {
                                continue;
                            }
                            if (combo.keys[i] === seq_key) {
                                match = true;
                            } else {
                                match = false;
                                break;
                            }
                        }
                    }
                    if (match) {
                        if (combo.is_exclusive) {
                            this._sequence = [];
                        }
                        return combo;
                    }
                }
                return false;
            };

            Listener.prototype._receive_input = function (e, is_keydown) {
                var key, _ref;
                if (this._prevent_capture) {
                    if (this._keys_down.length) {
                        this._keys_down = [];
                    }
                    return;
                }
                key = _convert_key_to_readable((_ref = e.keyCode) != null ? _ref : e.key);
                if (!is_keydown && !this._keys_down.length && (key === "alt" || key === _metakey)) {
                    return;
                }
                if (!key) {
                    return;
                }
                if (is_keydown) {
                    return this._key_down(key, e);
                } else {
                    return this._key_up(key, e);
                }
            };

            Listener.prototype._fire = function (event, combo, key_event, is_autorepeat) {
                if (typeof combo["on_" + event] === "function") {
                    this._prevent_default(key_event, combo["on_" + event].call(combo["this"], key_event, combo.count, is_autorepeat) !== true);
                }
                if (event === "release") {
                    combo.count = 0;
                }
                if (event === "keyup") {
                    return combo.keyup_fired = true;
                }
            };

            Listener.prototype._match_combo_arrays = function (potential_match, match_handler) {
                var combo_potential_match, source_combo, _i, _len, _ref;
                _ref = this._registered_combos;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    source_combo = _ref[_i];
                    combo_potential_match = potential_match.slice(0);
                    if (source_combo.normalize_caps_lock && __indexOf.call(combo_potential_match, "caps") >= 0) {
                        combo_potential_match.splice(combo_potential_match.indexOf("caps"), 1);
                    }
                    if ((!source_combo.is_unordered && _compare_arrays_sorted(combo_potential_match, source_combo.keys)) || (source_combo.is_unordered && _compare_arrays(combo_potential_match, source_combo.keys))) {
                        match_handler(source_combo);
                    }
                }
            };

            Listener.prototype._fuzzy_match_combo_arrays = function (potential_match, match_handler) {
                var source_combo, _i, _len, _ref;
                _ref = this._registered_combos;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    source_combo = _ref[_i];
                    if ((!source_combo.is_unordered && _is_array_in_array_sorted(source_combo.keys, potential_match)) || (source_combo.is_unordered && _is_array_in_array(source_combo.keys, potential_match))) {
                        match_handler(source_combo);
                    }
                }
            };

            Listener.prototype._keys_remain = function (combo) {
                var key, keys_remain, _i, _len, _ref;
                _ref = combo.keys;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    key = _ref[_i];
                    if (__indexOf.call(this._keys_down, key) >= 0) {
                        keys_remain = true;
                        break;
                    }
                }
                return keys_remain;
            };

            Listener.prototype._key_down = function (key, e) {
                var combo, combos, event_mod, i, mod, potential, potential_combos, sequence_combo, shifted_key, _i, _j, _k, _len, _len1, _ref;
                shifted_key = _convert_to_shifted_key(key, e);
                if (shifted_key) {
                    key = shifted_key;
                }
                this._add_key_to_sequence(key, e);
                sequence_combo = this._get_sequence(key);
                if (sequence_combo) {
                    this._fire("keydown", sequence_combo, e);
                }
                for (mod in _modifier_event_mapping) {
                    event_mod = _modifier_event_mapping[mod];
                    if (!e[event_mod]) {
                        continue;
                    }
                    if (mod === key || __indexOf.call(this._keys_down, mod) >= 0) {
                        continue;
                    }
                    this._keys_down.push(mod);
                }
                for (mod in _modifier_event_mapping) {
                    event_mod = _modifier_event_mapping[mod];
                    if (mod === key) {
                        continue;
                    }
                    if (__indexOf.call(this._keys_down, mod) >= 0 && !e[event_mod]) {
                        if (mod === "cmd" && _metakey !== "cmd") {
                            continue;
                        }
                        for (i = _i = 0, _ref = this._keys_down.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                            if (this._keys_down[i] === mod) {
                                this._keys_down.splice(i, 1);
                            }
                        }
                    }
                }
                combos = this._get_active_combos(key);
                potential_combos = this._get_potential_combos(key);
                for (_j = 0, _len = combos.length; _j < _len; _j++) {
                    combo = combos[_j];
                    this._handle_combo_down(combo, potential_combos, key, e);
                }
                if (potential_combos.length) {
                    for (_k = 0, _len1 = potential_combos.length; _k < _len1; _k++) {
                        potential = potential_combos[_k];
                        this._prevent_default(e, potential.prevent_default);
                    }
                }
                if (__indexOf.call(this._keys_down, key) < 0) {
                    this._keys_down.push(key);
                }
            };

            Listener.prototype._handle_combo_down = function (combo, potential_combos, key, e) {
                var is_autorepeat, is_other_exclusive, potential_combo, result, _i, _len;
                if (__indexOf.call(combo.keys, key) < 0) {
                    return false;
                }
                this._prevent_default(e, combo && combo.prevent_default);
                is_autorepeat = false;
                if (__indexOf.call(this._keys_down, key) >= 0) {
                    is_autorepeat = true;
                    if (!combo.allows_key_repeat()) {
                        return false;
                    }
                }
                result = this._add_to_active_combos(combo, key);
                combo.keyup_fired = false;
                is_other_exclusive = false;
                if (combo.is_exclusive) {
                    for (_i = 0, _len = potential_combos.length; _i < _len; _i++) {
                        potential_combo = potential_combos[_i];
                        if (potential_combo.is_exclusive && potential_combo.keys.length > combo.keys.length) {
                            is_other_exclusive = true;
                            break;
                        }
                    }
                }
                if (!is_other_exclusive) {
                    if (combo.is_counting && typeof combo.on_keydown === "function") {
                        combo.count += 1;
                    }
                    if (result) {
                        return this._fire("keydown", combo, e, is_autorepeat);
                    }
                }
            };

            Listener.prototype._key_up = function (key, e) {
                var active_combo, active_combos_length, combo, combos, i, sequence_combo, shifted_key, unshifted_key, _i, _j, _k, _l, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3;
                unshifted_key = key;
                shifted_key = _convert_to_shifted_key(key, e);
                if (shifted_key) {
                    key = shifted_key;
                }
                shifted_key = _keycode_shifted_keys[unshifted_key];
                if (e.shiftKey) {
                    if (!(shifted_key && __indexOf.call(this._keys_down, shifted_key) >= 0)) {
                        key = unshifted_key;
                    }
                } else {
                    if (!(unshifted_key && __indexOf.call(this._keys_down, unshifted_key) >= 0)) {
                        key = shifted_key;
                    }
                }
                sequence_combo = this._get_sequence(key);
                if (sequence_combo) {
                    this._fire("keyup", sequence_combo, e);
                }
                if (__indexOf.call(this._keys_down, key) < 0) {
                    return false;
                }
                for (i = _i = 0, _ref = this._keys_down.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                    if ((_ref1 = this._keys_down[i]) === key || _ref1 === shifted_key || _ref1 === unshifted_key) {
                        this._keys_down.splice(i, 1);
                        break;
                    }
                }
                active_combos_length = this._active_combos.length;
                combos = [];
                _ref2 = this._active_combos;
                for (_j = 0, _len = _ref2.length; _j < _len; _j++) {
                    active_combo = _ref2[_j];
                    if (__indexOf.call(active_combo.keys, key) >= 0) {
                        combos.push(active_combo);
                    }
                }
                for (_k = 0, _len1 = combos.length; _k < _len1; _k++) {
                    combo = combos[_k];
                    this._handle_combo_up(combo, e, key);
                }
                if (active_combos_length > 1) {
                    _ref3 = this._active_combos;
                    for (_l = 0, _len2 = _ref3.length; _l < _len2; _l++) {
                        active_combo = _ref3[_l];
                        if (active_combo === void 0 || __indexOf.call(combos, active_combo) >= 0) {
                            continue;
                        }
                        if (!this._keys_remain(active_combo)) {
                            this._remove_from_active_combos(active_combo);
                        }
                    }
                }
            };

            Listener.prototype._handle_combo_up = function (combo, e, key) {
                var keys_down, keys_remaining;
                this._prevent_default(e, combo && combo.prevent_default);
                keys_remaining = this._keys_remain(combo);
                if (!combo.keyup_fired) {
                    keys_down = this._keys_down.slice();
                    keys_down.push(key);
                    if (!combo.is_solitary || _compare_arrays(keys_down, combo.keys)) {
                        this._fire("keyup", combo, e);
                        if (combo.is_counting && typeof combo.on_keyup === "function" && typeof combo.on_keydown !== "function") {
                            combo.count += 1;
                        }
                    }
                }
                if (!keys_remaining) {
                    this._fire("release", combo, e);
                    this._remove_from_active_combos(combo);
                }
            };

            Listener.prototype.simple_combo = function (keys, callback) {
                return this.register_combo({
                    keys: keys,
                    on_keydown: callback
                });
            };

            Listener.prototype.counting_combo = function (keys, count_callback) {
                return this.register_combo({
                    keys: keys,
                    is_counting: true,
                    is_unordered: false,
                    on_keydown: count_callback
                });
            };

            Listener.prototype.sequence_combo = function (keys, callback) {
                return this.register_combo({
                    keys: keys,
                    on_keydown: callback,
                    is_sequence: true,
                    is_exclusive: true
                });
            };

            Listener.prototype.register_combo = function (combo_dictionary) {
                var combo, property, value, _ref;
                if (typeof combo_dictionary["keys"] === "string") {
                    combo_dictionary["keys"] = combo_dictionary["keys"].split(" ");
                }
                _ref = this._defaults;
                for (property in _ref) {
                    if (!__hasProp.call(_ref, property)) continue;
                    value = _ref[property];
                    if (combo_dictionary[property] === void 0) {
                        combo_dictionary[property] = value;
                    }
                }
                combo = new Combo(combo_dictionary);
                if (_validate_combo(combo)) {
                    this._registered_combos.push(combo);
                    return combo;
                }
            };

            Listener.prototype.register_many = function (combo_array) {
                var combo, _i, _len, _results;
                _results = [];
                for (_i = 0, _len = combo_array.length; _i < _len; _i++) {
                    combo = combo_array[_i];
                    _results.push(this.register_combo(combo));
                }
                return _results;
            };

            Listener.prototype.unregister_combo = function (keys_or_combo) {
                var combo, i, unregister_combo, _i, _j, _len, _ref, _ref1, _results;
                if (!keys_or_combo) {
                    return false;
                }
                unregister_combo = (function (_this) {
                    return function (combo) {
                        var i, _i, _ref, _results;
                        _results = [];
                        for (i = _i = 0, _ref = _this._registered_combos.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                            if (combo === _this._registered_combos[i]) {
                                _this._registered_combos.splice(i, 1);
                                break;
                            } else {
                                _results.push(void 0);
                            }
                        }
                        return _results;
                    };
                })(this);
                if (keys_or_combo instanceof Combo) {
                    return unregister_combo(keys_or_combo);
                } else {
                    if (typeof keys_or_combo === "string") {
                        keys_or_combo = keys_or_combo.split(" ");
                        for (i = _i = 0, _ref = keys_or_combo.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                            if (keys_or_combo[i] === "meta") {
                                keys_or_combo[i] = _metakey;
                            }
                        }
                    }
                    _ref1 = this._registered_combos;
                    _results = [];
                    for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
                        combo = _ref1[_j];
                        if (combo == null) {
                            continue;
                        }
                        if ((combo.is_unordered && _compare_arrays(keys_or_combo, combo.keys)) || (!combo.is_unordered && _compare_arrays_sorted(keys_or_combo, combo.keys))) {
                            _results.push(unregister_combo(combo));
                        } else {
                            _results.push(void 0);
                        }
                    }
                    return _results;
                }
            };

            Listener.prototype.unregister_many = function (combo_array) {
                var combo, _i, _len, _results;
                _results = [];
                for (_i = 0, _len = combo_array.length; _i < _len; _i++) {
                    combo = combo_array[_i];
                    _results.push(this.unregister_combo(combo));
                }
                return _results;
            };

            Listener.prototype.get_registered_combos = function () {
                return this._registered_combos;
            };

            Listener.prototype.reset = function () {
                return this._registered_combos = [];
            };

            Listener.prototype.listen = function () {
                return this._prevent_capture = false;
            };

            Listener.prototype.stop_listening = function () {
                return this._prevent_capture = true;
            };

            Listener.prototype.get_meta_key = function () {
                return _metakey;
            };

            return Listener;

        })();

        _decide_meta_key = function () {
            if (navigator.userAgent.indexOf("Mac OS X") !== -1) {
                _metakey = "cmd";
            }
        };

        _change_keycodes_by_browser = function () {
            if (navigator.userAgent.indexOf("Opera") !== -1) {
                _keycode_dictionary["17"] = "cmd";
            }
        };

        _convert_key_to_readable = function (k) {
            return _keycode_dictionary[k];
        };

        _filter_array = function (array, callback) {
            var element;
            if (array.filter) {
                return array.filter(callback);
            } else {
                return (function () {
                    var _i, _len, _results;
                    _results = [];
                    for (_i = 0, _len = array.length; _i < _len; _i++) {
                        element = array[_i];
                        if (callback(element)) {
                            _results.push(element);
                        }
                    }
                    return _results;
                })();
            }
        };

        _compare_arrays = function (a1, a2) {
            var item, _i, _len;
            if (a1.length !== a2.length) {
                return false;
            }
            for (_i = 0, _len = a1.length; _i < _len; _i++) {
                item = a1[_i];
                if (__indexOf.call(a2, item) >= 0) {
                    continue;
                }
                return false;
            }
            return true;
        };

        _compare_arrays_sorted = function (a1, a2) {
            var i, _i, _ref;
            if (a1.length !== a2.length) {
                return false;
            }
            for (i = _i = 0, _ref = a1.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                if (a1[i] !== a2[i]) {
                    return false;
                }
            }
            return true;
        };

        _is_array_in_array = function (a1, a2) {
            var item, _i, _len;
            for (_i = 0, _len = a1.length; _i < _len; _i++) {
                item = a1[_i];
                if (__indexOf.call(a2, item) < 0) {
                    return false;
                }
            }
            return true;
        };

        _index_of_in_array = Array.prototype.indexOf || function (a, item) {
            var i, _i, _ref;
            for (i = _i = 0, _ref = a.length; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
                if (a[i] === item) {
                    return i;
                }
            }
            return -1;
        };

        _is_array_in_array_sorted = function (a1, a2) {
            var index, item, prev, _i, _len;
            prev = 0;
            for (_i = 0, _len = a1.length; _i < _len; _i++) {
                item = a1[_i];
                index = _index_of_in_array.call(a2, item);
                if (index >= prev) {
                    prev = index;
                } else {
                    return false;
                }
            }
            return true;
        };

        _log_error = function () {
            if (keypress.debug) {
                return console.log.apply(console, arguments);
            }
        };

        _key_is_valid = function (key) {
            var valid, valid_key, _;
            valid = false;
            for (_ in _keycode_dictionary) {
                valid_key = _keycode_dictionary[_];
                if (key === valid_key) {
                    valid = true;
                    break;
                }
            }
            if (!valid) {
                for (_ in _keycode_shifted_keys) {
                    valid_key = _keycode_shifted_keys[_];
                    if (key === valid_key) {
                        valid = true;
                        break;
                    }
                }
            }
            return valid;
        };

        _validate_combo = function (combo) {
            var alt_name, i, key, mod_key, non_modifier_keys, property, validated, value, _i, _j, _k, _len, _len1, _ref, _ref1;
            validated = true;
            if (!combo.keys.length) {
                _log_error("You're trying to bind a combo with no keys:", combo);
            }
            for (i = _i = 0, _ref = combo.keys.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                key = combo.keys[i];
                alt_name = _keycode_alternate_names[key];
                if (alt_name) {
                    key = combo.keys[i] = alt_name;
                }
                if (key === "meta") {
                    combo.keys.splice(i, 1, _metakey);
                }
                if (key === "cmd") {
                    _log_error("Warning: use the \"meta\" key rather than \"cmd\" for Windows compatibility");
                }
            }
            _ref1 = combo.keys;
            for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
                key = _ref1[_j];
                if (!_key_is_valid(key)) {
                    _log_error("Do not recognize the key \"" + key + "\"");
                    validated = false;
                }
            }
            if (__indexOf.call(combo.keys, "meta") >= 0 || __indexOf.call(combo.keys, "cmd") >= 0) {
                non_modifier_keys = combo.keys.slice();
                for (_k = 0, _len1 = _modifier_keys.length; _k < _len1; _k++) {
                    mod_key = _modifier_keys[_k];
                    if ((i = _index_of_in_array.call(non_modifier_keys, mod_key)) > -1) {
                        non_modifier_keys.splice(i, 1);
                    }
                }
                if (non_modifier_keys.length > 1) {
                    _log_error("META and CMD key combos cannot have more than 1 non-modifier keys", combo, non_modifier_keys);
                    validated = false;
                }
            }
            for (property in combo) {
                value = combo[property];
                if (_factory_defaults[property] === "undefined") {
                    _log_error("The property " + property + " is not a valid combo property. Your combo has still been registered.");
                }
            }
            return validated;
        };

        _convert_to_shifted_key = function (key, e) {
            var k;
            if (!e.shiftKey) {
                return false;
            }
            k = _keycode_shifted_keys[key];
            if (k != null) {
                return k;
            }
            return false;
        };

        _modifier_event_mapping = {
            "cmd": "metaKey",
            "ctrl": "ctrlKey",
            "shift": "shiftKey",
            "alt": "altKey"
        };

        _keycode_alternate_names = {
            "escape": "esc",
            "control": "ctrl",
            "command": "cmd",
            "break": "pause",
            "windows": "cmd",
            "option": "alt",
            "caps_lock": "caps",
            "apostrophe": "\'",
            "semicolon": ";",
            "tilde": "~",
            "accent": "`",
            "scroll_lock": "scroll",
            "num_lock": "num"
        };

        _keycode_shifted_keys = {
            "/": "?",
            ".": ">",
            ",": "<",
            "\'": "\"",
            ";": ":",
            "[": "{",
            "]": "}",
            "\\": "|",
            "`": "~",
            "=": "+",
            "-": "_",
            "1": "!",
            "2": "@",
            "3": "#",
            "4": "$",
            "5": "%",
            "6": "^",
            "7": "&",
            "8": "*",
            "9": "(",
            "0": ")"
        };

        _keycode_dictionary = {
            0: "\\",
            8: "backspace",
            9: "tab",
            12: "num",
            13: "enter",
            16: "shift",
            17: "ctrl",
            18: "alt",
            19: "pause",
            20: "caps",
            27: "esc",
            32: "space",
            33: "pageup",
            34: "pagedown",
            35: "end",
            36: "home",
            37: "left",
            38: "up",
            39: "right",
            40: "down",
            44: "print",
            45: "insert",
            46: "delete",
            48: "0",
            49: "1",
            50: "2",
            51: "3",
            52: "4",
            53: "5",
            54: "6",
            55: "7",
            56: "8",
            57: "9",
            65: "a",
            66: "b",
            67: "c",
            68: "d",
            69: "e",
            70: "f",
            71: "g",
            72: "h",
            73: "i",
            74: "j",
            75: "k",
            76: "l",
            77: "m",
            78: "n",
            79: "o",
            80: "p",
            81: "q",
            82: "r",
            83: "s",
            84: "t",
            85: "u",
            86: "v",
            87: "w",
            88: "x",
            89: "y",
            90: "z",
            91: "cmd",
            92: "cmd",
            93: "cmd",
            96: "num_0",
            97: "num_1",
            98: "num_2",
            99: "num_3",
            100: "num_4",
            101: "num_5",
            102: "num_6",
            103: "num_7",
            104: "num_8",
            105: "num_9",
            106: "num_multiply",
            107: "num_add",
            108: "num_enter",
            109: "num_subtract",
            110: "num_decimal",
            111: "num_divide",
            112: "f1",
            113: "f2",
            114: "f3",
            115: "f4",
            116: "f5",
            117: "f6",
            118: "f7",
            119: "f8",
            120: "f9",
            121: "f10",
            122: "f11",
            123: "f12",
            124: "print",
            144: "num",
            145: "scroll",
            186: ";",
            187: "=",
            188: ",",
            189: "-",
            190: ".",
            191: "/",
            192: "`",
            219: "[",
            220: "\\",
            221: "]",
            222: "\'",
            223: "`",
            224: "cmd",
            225: "alt",
            57392: "ctrl",
            63289: "num",
            59: ";",
            61: "=",
            173: "-"
        };

        keypress._keycode_dictionary = _keycode_dictionary;

        keypress._is_array_in_array_sorted = _is_array_in_array_sorted;

        _decide_meta_key();

        _change_keycodes_by_browser();

        if ( exports !== null) {
            exports.keypress = keypress;
        } else {
            window.keypress = keypress;
        }

    }).call(commonjsGlobal);
    });
    var keypress_1 = keypress.keypress;

    function init$2() {
        var listener = new keypress_1.Listener();
        listener.simple_combo("meta s", function (e) {
            eventbus$1.broadcast("save", {});
            e.preventDefault();
            return false;
        });

        listener.simple_combo("meta p", function (e) {
            eventbus$1.broadcast("ctrl-p", {});
            e.preventDefault();
            return false;
        });

        listener.simple_combo("meta /", function (e) {
            eventbus$1.broadcast("comment", {});
            e.preventDefault();
            return false;
        });

        listener.simple_combo("f2", function (e) {
            var currentWord = window.getCurrentWord();
            if (currentWord) {
                eventbus$1.broadcast("start refactor", currentWord);
            }
            e.preventDefault();
            return false;
        });

        listener.simple_combo("f4", function (e) {
            var currentWord = window.getCurrentWord();
            if (currentWord) {
                eventbus$1.broadcast("json_schema", currentWord);
            }
            e.preventDefault();
            return false;
        });
    }

    const tokenizer = {
        keywords: [
            "record",
            "choice",
            "data",
            "open",
        ],
        autoClosingPairs: [{ open: "{", close: "}" }],
        digits: /\d+(_+\d+)*/,

        tokenizer: {
            root: [
                { include: "chapter" },
                { include: "annotation" },
                { include: "directive" },
                { include: "lang" },
                { include: 'whitespace' },
            ],
            whitespace: [
                [/[ \t\r\n]+/, 'white'],
                [/\{\*/, 'comment', '@comment'],
                [/\/\/.*$/, 'comment'],
            ],
            chapter: [[/#.*/, "chapter"]],
            annotation: [[/@.*/, "annotation"]],
            directive: [
                [/(%)([^:]*)(:)/, ["number", "type.identifier", "number"], "@directive_inner.$1"],
                [/(%)([^:]*)/, ["number", "type.identifier"]],
            ],
            directive_inner: [
                [/.+/, "number", "@pop"],
                [/([\t\s{4}])([^:]*)(:)([^:]*)/, ["word", "annotation", "number", "word"]]
            ],
            lang: [
                [/({)([a-zA-Z0-9]+)(\.)([a-zA-Z0-9]+)(})/, ["chapter", "type.identifier", "chapter", "annotation.field", "chapter"]],
                [/^([a-z][^ ]*)/, [
                    {
                        cases: {
                            // language
                            "open": { token: "keyword" },
                            "record": { token: "keyword", next: "@record" },
                            "type": { token: "keyword", next: "@type" },
                            "choice": { token: "keyword", next: "@choice" },
                            "data": { token: "keyword", next: "@data" },

                            // document
                            "view": { token: "keyword", next: "@view" },
                            "guideline": { token: "keyword", next: "@attributes" },
                            "requirement": { token: "keyword", next: "@attributes" },
                            "include": { token: "keyword", next: "@field" },

                            // planning
                            "roadmap": { token: "keyword", next: "@attributes" },
                            "task": { token: "keyword", next: "@attributes" },
                            "milestone": { token: "keyword", next: "@attributes" },


                            // architecture
                            "component": { token: "keyword", next: "@attributes" },
                            "interaction": { token: "keyword", next: "@attributes" },
                            "person": { token: "keyword", next: "@attributes" },
                            "system": { token: "keyword", next: "@attributes" },
                            "endpoint": { token: "keyword", next: "@attributes_endpoint" },
                        }
                    }]]
            ],
            record: [
                [/extends/, "keyword"],
                [/=/, "number", "@field"],
                [/'[a-z]/, "generic-parameter"], // generic types
                { include: "lang" }
            ],
            view: [
                [/view/, "keyword"],
                { include: "lang" },
                { include: "root" },
            ],
            type: [
                [/->/, "number"],
                [/;/, "number", "@root"],
                [/'[a-z]/, "generic-parameter"], // generic types
                { include: "lang" }
            ],
            choice: [
                [/(|)\w*(")/, ["number", { token: 'string.quote', bracket: '@open', next: '@string' }]],
                { include: "root" },
                { include: "lang" }
            ],
            data: [
                [/'[a-z]/, "generic-parameter"], // generic types
                { include: "root" },
                { include: "lang" }
            ],
            field: [
                [/\d+/, "number"],
                [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
                [/'[a-z]/, "generic-parameter"], // generic types
                { include: "root" },
                { include: "lang" }
            ],
            attributes: [
                [/([A-Z][a-zA-Z0-9_]*)(:)/, ["type.identifier", "number"]],
                { include: "lang" },
                { include: "root" },
            ],
            attributes_endpoint: [
                [/->/, "number"],
                [/([A-Z][a-zA-Z ]*)(::)/, ["nothing", "number"]],
                [/([A-Z][a-zA-Z ]*)(:)/, ["type.identifier", "number"]],
                { include: "lang" }
            ],
            decode_type: [
                [/(List)([^;]*)(;)/, ["type.identifier", "", "number"]],
                [/(Maybe)([^;]*)(;)/, ["type.identifier", "", "number"], "@field"],
                { include: "lang" }
            ],
            string: [
                [/[^\\"]+/, 'string'],
                [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],
            comment: [
                [/[^\*}]+/, 'comment'],
                [/\{\*/, 'comment', '@push'],    // nested comment
                ["\\*}", 'comment', '@pop'],
                [/[\{\*]/, 'comment']
            ]
        }
    };

    const theme = {
        base: "vs-dark",
        inherit: true,
        colors: {
            "editor.background": "#273241"
        },
        rules: [
            { token: "chapter", foreground: "#ea5dd5" },
            { token: "annotation", foreground: "#cd9394" },
            { token: "identifier", foreground: "#00aa9e" },
            { token: "basetype", foreground: "#fdf8ea" },
            { token: "generic-parameter", foreground: "#ea5dd5" },
            { token: "annotation.field", foreground: "#ffffff" },
        ]
    };

    var signalr_min = createCommonjsModule(function (module, exports) {
    (function webpackUniversalModuleDefinition(root,factory){module.exports=factory();})(window,function(){return function(modules){var installedModules={};function __webpack_require__(moduleId){if(installedModules[moduleId]){return installedModules[moduleId].exports}var module=installedModules[moduleId]={i:moduleId,l:false,exports:{}};modules[moduleId].call(module.exports,module,module.exports,__webpack_require__);module.l=true;return module.exports}__webpack_require__.m=modules;__webpack_require__.c=installedModules;__webpack_require__.d=function(exports,name,getter){if(!__webpack_require__.o(exports,name)){Object.defineProperty(exports,name,{enumerable:true,get:getter});}};__webpack_require__.r=function(exports){if(typeof Symbol!=="undefined"&&Symbol.toStringTag){Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});}Object.defineProperty(exports,"__esModule",{value:true});};__webpack_require__.t=function(value,mode){if(mode&1)value=__webpack_require__(value);if(mode&8)return value;if(mode&4&&typeof value==="object"&&value&&value.__esModule)return value;var ns=Object.create(null);__webpack_require__.r(ns);Object.defineProperty(ns,"default",{enumerable:true,value:value});if(mode&2&&typeof value!="string")for(var key in value)__webpack_require__.d(ns,key,function(key){return value[key]}.bind(null,key));return ns};__webpack_require__.n=function(module){var getter=module&&module.__esModule?function getDefault(){return module["default"]}:function getModuleExports(){return module};__webpack_require__.d(getter,"a",getter);return getter};__webpack_require__.o=function(object,property){return Object.prototype.hasOwnProperty.call(object,property)};__webpack_require__.p="";return __webpack_require__(__webpack_require__.s=0)}([function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);var es6_promise_dist_es6_promise_auto_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(1);var es6_promise_dist_es6_promise_auto_js__WEBPACK_IMPORTED_MODULE_0___default=__webpack_require__.n(es6_promise_dist_es6_promise_auto_js__WEBPACK_IMPORTED_MODULE_0__);var _index__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(3);__webpack_require__.d(__webpack_exports__,"AbortError",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["AbortError"]});__webpack_require__.d(__webpack_exports__,"HttpError",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["HttpError"]});__webpack_require__.d(__webpack_exports__,"TimeoutError",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["TimeoutError"]});__webpack_require__.d(__webpack_exports__,"HttpClient",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["HttpClient"]});__webpack_require__.d(__webpack_exports__,"HttpResponse",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["HttpResponse"]});__webpack_require__.d(__webpack_exports__,"DefaultHttpClient",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["DefaultHttpClient"]});__webpack_require__.d(__webpack_exports__,"HubConnection",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["HubConnection"]});__webpack_require__.d(__webpack_exports__,"HubConnectionState",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["HubConnectionState"]});__webpack_require__.d(__webpack_exports__,"HubConnectionBuilder",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["HubConnectionBuilder"]});__webpack_require__.d(__webpack_exports__,"MessageType",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["MessageType"]});__webpack_require__.d(__webpack_exports__,"LogLevel",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["LogLevel"]});__webpack_require__.d(__webpack_exports__,"HttpTransportType",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["HttpTransportType"]});__webpack_require__.d(__webpack_exports__,"TransferFormat",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["TransferFormat"]});__webpack_require__.d(__webpack_exports__,"NullLogger",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["NullLogger"]});__webpack_require__.d(__webpack_exports__,"JsonHubProtocol",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["JsonHubProtocol"]});__webpack_require__.d(__webpack_exports__,"Subject",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["Subject"]});__webpack_require__.d(__webpack_exports__,"VERSION",function(){return _index__WEBPACK_IMPORTED_MODULE_1__["VERSION"]});if(!Uint8Array.prototype.indexOf){Object.defineProperty(Uint8Array.prototype,"indexOf",{value:Array.prototype.indexOf,writable:true});}if(!Uint8Array.prototype.slice){Object.defineProperty(Uint8Array.prototype,"slice",{value:function(start,end){return new Uint8Array(Array.prototype.slice.call(this,start,end))},writable:true});}if(!Uint8Array.prototype.forEach){Object.defineProperty(Uint8Array.prototype,"forEach",{value:Array.prototype.forEach,writable:true});}},function(module,exports,__webpack_require__){(function(global){var require;
    /*!
     * @overview es6-promise - a tiny implementation of Promises/A+.
     * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
     * @license   Licensed under MIT license
     *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
     * @version   v4.2.2+97478eb6
     */
    /*!
     * @overview es6-promise - a tiny implementation of Promises/A+.
     * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
     * @license   Licensed under MIT license
     *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
     * @version   v4.2.2+97478eb6
     */
    (function(global,factory){module.exports=factory();})(this,function(){function objectOrFunction(x){var type=typeof x;return x!==null&&(type==="object"||type==="function")}function isFunction(x){return typeof x==="function"}var _isArray=void 0;if(Array.isArray){_isArray=Array.isArray;}else{_isArray=function(x){return Object.prototype.toString.call(x)==="[object Array]"};}var isArray=_isArray;var len=0;var vertxNext=void 0;var customSchedulerFn=void 0;var asap=function asap(callback,arg){queue[len]=callback;queue[len+1]=arg;len+=2;if(len===2){if(customSchedulerFn){customSchedulerFn(flush);}else{scheduleFlush();}}};function setScheduler(scheduleFn){customSchedulerFn=scheduleFn;}function setAsap(asapFn){asap=asapFn;}var browserWindow=typeof window!=="undefined"?window:undefined;var browserGlobal=browserWindow||{};var BrowserMutationObserver=browserGlobal.MutationObserver||browserGlobal.WebKitMutationObserver;var isNode=typeof self==="undefined"&&typeof process!=="undefined"&&{}.toString.call(process)==="[object process]";var isWorker=typeof Uint8ClampedArray!=="undefined"&&typeof importScripts!=="undefined"&&typeof MessageChannel!=="undefined";function useNextTick(){return function(){return process.nextTick(flush)}}function useVertxTimer(){if(typeof vertxNext!=="undefined"){return function(){vertxNext(flush);}}return useSetTimeout()}function useMutationObserver(){var iterations=0;var observer=new BrowserMutationObserver(flush);var node=document.createTextNode("");observer.observe(node,{characterData:true});return function(){node.data=iterations=++iterations%2;}}function useMessageChannel(){var channel=new MessageChannel;channel.port1.onmessage=flush;return function(){return channel.port2.postMessage(0)}}function useSetTimeout(){var globalSetTimeout=setTimeout;return function(){return globalSetTimeout(flush,1)}}var queue=new Array(1e3);function flush(){for(var i=0;i<len;i+=2){var callback=queue[i];var arg=queue[i+1];callback(arg);queue[i]=undefined;queue[i+1]=undefined;}len=0;}function attemptVertx(){try{var r=require;var vertx=__webpack_require__(!function webpackMissingModule(){var e=new Error("Cannot find module 'vertx'");e.code="MODULE_NOT_FOUND";throw e}());vertxNext=vertx.runOnLoop||vertx.runOnContext;return useVertxTimer()}catch(e){return useSetTimeout()}}var scheduleFlush=void 0;if(isNode){scheduleFlush=useNextTick();}else if(BrowserMutationObserver){scheduleFlush=useMutationObserver();}else if(isWorker){scheduleFlush=useMessageChannel();}else if(browserWindow===undefined&&"function"==="function"){scheduleFlush=attemptVertx();}else{scheduleFlush=useSetTimeout();}function then(onFulfillment,onRejection){var parent=this;var child=new this.constructor(noop);if(child[PROMISE_ID]===undefined){makePromise(child);}var _state=parent._state;if(_state){var callback=arguments[_state-1];asap(function(){return invokeCallback(_state,child,callback,parent._result)});}else{subscribe(parent,child,onFulfillment,onRejection);}return child}function resolve$1(object){var Constructor=this;if(object&&typeof object==="object"&&object.constructor===Constructor){return object}var promise=new Constructor(noop);resolve(promise,object);return promise}var PROMISE_ID=Math.random().toString(36).substring(16);function noop(){}var PENDING=void 0;var FULFILLED=1;var REJECTED=2;var GET_THEN_ERROR=new ErrorObject;function selfFulfillment(){return new TypeError("You cannot resolve a promise with itself")}function cannotReturnOwn(){return new TypeError("A promises callback cannot return that same promise.")}function getThen(promise){try{return promise.then}catch(error){GET_THEN_ERROR.error=error;return GET_THEN_ERROR}}function tryThen(then$$1,value,fulfillmentHandler,rejectionHandler){try{then$$1.call(value,fulfillmentHandler,rejectionHandler);}catch(e){return e}}function handleForeignThenable(promise,thenable,then$$1){asap(function(promise){var sealed=false;var error=tryThen(then$$1,thenable,function(value){if(sealed){return}sealed=true;if(thenable!==value){resolve(promise,value);}else{fulfill(promise,value);}},function(reason){if(sealed){return}sealed=true;reject(promise,reason);},"Settle: "+(promise._label||" unknown promise"));if(!sealed&&error){sealed=true;reject(promise,error);}},promise);}function handleOwnThenable(promise,thenable){if(thenable._state===FULFILLED){fulfill(promise,thenable._result);}else if(thenable._state===REJECTED){reject(promise,thenable._result);}else{subscribe(thenable,undefined,function(value){return resolve(promise,value)},function(reason){return reject(promise,reason)});}}function handleMaybeThenable(promise,maybeThenable,then$$1){if(maybeThenable.constructor===promise.constructor&&then$$1===then&&maybeThenable.constructor.resolve===resolve$1){handleOwnThenable(promise,maybeThenable);}else{if(then$$1===GET_THEN_ERROR){reject(promise,GET_THEN_ERROR.error);GET_THEN_ERROR.error=null;}else if(then$$1===undefined){fulfill(promise,maybeThenable);}else if(isFunction(then$$1)){handleForeignThenable(promise,maybeThenable,then$$1);}else{fulfill(promise,maybeThenable);}}}function resolve(promise,value){if(promise===value){reject(promise,selfFulfillment());}else if(objectOrFunction(value)){handleMaybeThenable(promise,value,getThen(value));}else{fulfill(promise,value);}}function publishRejection(promise){if(promise._onerror){promise._onerror(promise._result);}publish(promise);}function fulfill(promise,value){if(promise._state!==PENDING){return}promise._result=value;promise._state=FULFILLED;if(promise._subscribers.length!==0){asap(publish,promise);}}function reject(promise,reason){if(promise._state!==PENDING){return}promise._state=REJECTED;promise._result=reason;asap(publishRejection,promise);}function subscribe(parent,child,onFulfillment,onRejection){var _subscribers=parent._subscribers;var length=_subscribers.length;parent._onerror=null;_subscribers[length]=child;_subscribers[length+FULFILLED]=onFulfillment;_subscribers[length+REJECTED]=onRejection;if(length===0&&parent._state){asap(publish,parent);}}function publish(promise){var subscribers=promise._subscribers;var settled=promise._state;if(subscribers.length===0){return}var child=void 0,callback=void 0,detail=promise._result;for(var i=0;i<subscribers.length;i+=3){child=subscribers[i];callback=subscribers[i+settled];if(child){invokeCallback(settled,child,callback,detail);}else{callback(detail);}}promise._subscribers.length=0;}function ErrorObject(){this.error=null;}var TRY_CATCH_ERROR=new ErrorObject;function tryCatch(callback,detail){try{return callback(detail)}catch(e){TRY_CATCH_ERROR.error=e;return TRY_CATCH_ERROR}}function invokeCallback(settled,promise,callback,detail){var hasCallback=isFunction(callback),value=void 0,error=void 0,succeeded=void 0,failed=void 0;if(hasCallback){value=tryCatch(callback,detail);if(value===TRY_CATCH_ERROR){failed=true;error=value.error;value.error=null;}else{succeeded=true;}if(promise===value){reject(promise,cannotReturnOwn());return}}else{value=detail;succeeded=true;}if(promise._state!==PENDING);else if(hasCallback&&succeeded){resolve(promise,value);}else if(failed){reject(promise,error);}else if(settled===FULFILLED){fulfill(promise,value);}else if(settled===REJECTED){reject(promise,value);}}function initializePromise(promise,resolver){try{resolver(function resolvePromise(value){resolve(promise,value);},function rejectPromise(reason){reject(promise,reason);});}catch(e){reject(promise,e);}}var id=0;function nextId(){return id++}function makePromise(promise){promise[PROMISE_ID]=id++;promise._state=undefined;promise._result=undefined;promise._subscribers=[];}function validationError(){return new Error("Array Methods must be provided an Array")}function validationError(){return new Error("Array Methods must be provided an Array")}var Enumerator=function(){function Enumerator(Constructor,input){this._instanceConstructor=Constructor;this.promise=new Constructor(noop);if(!this.promise[PROMISE_ID]){makePromise(this.promise);}if(isArray(input)){this.length=input.length;this._remaining=input.length;this._result=new Array(this.length);if(this.length===0){fulfill(this.promise,this._result);}else{this.length=this.length||0;this._enumerate(input);if(this._remaining===0){fulfill(this.promise,this._result);}}}else{reject(this.promise,validationError());}}Enumerator.prototype._enumerate=function _enumerate(input){for(var i=0;this._state===PENDING&&i<input.length;i++){this._eachEntry(input[i],i);}};Enumerator.prototype._eachEntry=function _eachEntry(entry,i){var c=this._instanceConstructor;var resolve$$1=c.resolve;if(resolve$$1===resolve$1){var _then=getThen(entry);if(_then===then&&entry._state!==PENDING){this._settledAt(entry._state,i,entry._result);}else if(typeof _then!=="function"){this._remaining--;this._result[i]=entry;}else if(c===Promise$2){var promise=new c(noop);handleMaybeThenable(promise,entry,_then);this._willSettleAt(promise,i);}else{this._willSettleAt(new c(function(resolve$$1){return resolve$$1(entry)}),i);}}else{this._willSettleAt(resolve$$1(entry),i);}};Enumerator.prototype._settledAt=function _settledAt(state,i,value){var promise=this.promise;if(promise._state===PENDING){this._remaining--;if(state===REJECTED){reject(promise,value);}else{this._result[i]=value;}}if(this._remaining===0){fulfill(promise,this._result);}};Enumerator.prototype._willSettleAt=function _willSettleAt(promise,i){var enumerator=this;subscribe(promise,undefined,function(value){return enumerator._settledAt(FULFILLED,i,value)},function(reason){return enumerator._settledAt(REJECTED,i,reason)});};return Enumerator}();function all(entries){return new Enumerator(this,entries).promise}function race(entries){var Constructor=this;if(!isArray(entries)){return new Constructor(function(_,reject){return reject(new TypeError("You must pass an array to race."))})}else{return new Constructor(function(resolve,reject){var length=entries.length;for(var i=0;i<length;i++){Constructor.resolve(entries[i]).then(resolve,reject);}})}}function reject$1(reason){var Constructor=this;var promise=new Constructor(noop);reject(promise,reason);return promise}function needsResolver(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}function needsNew(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}var Promise$2=function(){function Promise(resolver){this[PROMISE_ID]=nextId();this._result=this._state=undefined;this._subscribers=[];if(noop!==resolver){typeof resolver!=="function"&&needsResolver();this instanceof Promise?initializePromise(this,resolver):needsNew();}}Promise.prototype.catch=function _catch(onRejection){return this.then(null,onRejection)};Promise.prototype.finally=function _finally(callback){var promise=this;var constructor=promise.constructor;return promise.then(function(value){return constructor.resolve(callback()).then(function(){return value})},function(reason){return constructor.resolve(callback()).then(function(){throw reason})})};return Promise}();Promise$2.prototype.then=then;Promise$2.all=all;Promise$2.race=race;Promise$2.resolve=resolve$1;Promise$2.reject=reject$1;Promise$2._setScheduler=setScheduler;Promise$2._setAsap=setAsap;Promise$2._asap=asap;function polyfill(){var local=void 0;if(typeof global!=="undefined"){local=global;}else if(typeof self!=="undefined"){local=self;}else{try{local=Function("return this")();}catch(e){throw new Error("polyfill failed because global object is unavailable in this environment")}}var P=local.Promise;if(P){var promiseToString=null;try{promiseToString=Object.prototype.toString.call(P.resolve());}catch(e){}if(promiseToString==="[object Promise]"&&!P.cast){return}}local.Promise=Promise$2;}Promise$2.polyfill=polyfill;Promise$2.Promise=Promise$2;Promise$2.polyfill();return Promise$2});}).call(this,__webpack_require__(2));},function(module,exports){var g;g=function(){return this}();try{g=g||new Function("return this")();}catch(e){if(typeof window==="object")g=window;}module.exports=g;},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);var _Errors__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(4);__webpack_require__.d(__webpack_exports__,"AbortError",function(){return _Errors__WEBPACK_IMPORTED_MODULE_0__["AbortError"]});__webpack_require__.d(__webpack_exports__,"HttpError",function(){return _Errors__WEBPACK_IMPORTED_MODULE_0__["HttpError"]});__webpack_require__.d(__webpack_exports__,"TimeoutError",function(){return _Errors__WEBPACK_IMPORTED_MODULE_0__["TimeoutError"]});var _HttpClient__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(5);__webpack_require__.d(__webpack_exports__,"HttpClient",function(){return _HttpClient__WEBPACK_IMPORTED_MODULE_1__["HttpClient"]});__webpack_require__.d(__webpack_exports__,"HttpResponse",function(){return _HttpClient__WEBPACK_IMPORTED_MODULE_1__["HttpResponse"]});var _DefaultHttpClient__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(6);__webpack_require__.d(__webpack_exports__,"DefaultHttpClient",function(){return _DefaultHttpClient__WEBPACK_IMPORTED_MODULE_2__["DefaultHttpClient"]});var _HubConnection__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__(12);__webpack_require__.d(__webpack_exports__,"HubConnection",function(){return _HubConnection__WEBPACK_IMPORTED_MODULE_3__["HubConnection"]});__webpack_require__.d(__webpack_exports__,"HubConnectionState",function(){return _HubConnection__WEBPACK_IMPORTED_MODULE_3__["HubConnectionState"]});var _HubConnectionBuilder__WEBPACK_IMPORTED_MODULE_4__=__webpack_require__(17);__webpack_require__.d(__webpack_exports__,"HubConnectionBuilder",function(){return _HubConnectionBuilder__WEBPACK_IMPORTED_MODULE_4__["HubConnectionBuilder"]});var _IHubProtocol__WEBPACK_IMPORTED_MODULE_5__=__webpack_require__(15);__webpack_require__.d(__webpack_exports__,"MessageType",function(){return _IHubProtocol__WEBPACK_IMPORTED_MODULE_5__["MessageType"]});var _ILogger__WEBPACK_IMPORTED_MODULE_6__=__webpack_require__(8);__webpack_require__.d(__webpack_exports__,"LogLevel",function(){return _ILogger__WEBPACK_IMPORTED_MODULE_6__["LogLevel"]});var _ITransport__WEBPACK_IMPORTED_MODULE_7__=__webpack_require__(20);__webpack_require__.d(__webpack_exports__,"HttpTransportType",function(){return _ITransport__WEBPACK_IMPORTED_MODULE_7__["HttpTransportType"]});__webpack_require__.d(__webpack_exports__,"TransferFormat",function(){return _ITransport__WEBPACK_IMPORTED_MODULE_7__["TransferFormat"]});var _Loggers__WEBPACK_IMPORTED_MODULE_8__=__webpack_require__(10);__webpack_require__.d(__webpack_exports__,"NullLogger",function(){return _Loggers__WEBPACK_IMPORTED_MODULE_8__["NullLogger"]});var _JsonHubProtocol__WEBPACK_IMPORTED_MODULE_9__=__webpack_require__(25);__webpack_require__.d(__webpack_exports__,"JsonHubProtocol",function(){return _JsonHubProtocol__WEBPACK_IMPORTED_MODULE_9__["JsonHubProtocol"]});var _Subject__WEBPACK_IMPORTED_MODULE_10__=__webpack_require__(16);__webpack_require__.d(__webpack_exports__,"Subject",function(){return _Subject__WEBPACK_IMPORTED_MODULE_10__["Subject"]});var _Utils__WEBPACK_IMPORTED_MODULE_11__=__webpack_require__(9);__webpack_require__.d(__webpack_exports__,"VERSION",function(){return _Utils__WEBPACK_IMPORTED_MODULE_11__["VERSION"]});},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"HttpError",function(){return HttpError});__webpack_require__.d(__webpack_exports__,"TimeoutError",function(){return TimeoutError});__webpack_require__.d(__webpack_exports__,"AbortError",function(){return AbortError});var __extends=function(){var extendStatics=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(d,b){d.__proto__=b;}||function(d,b){for(var p in b)if(b.hasOwnProperty(p))d[p]=b[p];};return function(d,b){extendStatics(d,b);function __(){this.constructor=d;}d.prototype=b===null?Object.create(b):(__.prototype=b.prototype,new __);}}();var HttpError=function(_super){__extends(HttpError,_super);function HttpError(errorMessage,statusCode){var _newTarget=this.constructor;var _this=this;var trueProto=_newTarget.prototype;_this=_super.call(this,errorMessage)||this;_this.statusCode=statusCode;_this.__proto__=trueProto;return _this}return HttpError}(Error);var TimeoutError=function(_super){__extends(TimeoutError,_super);function TimeoutError(errorMessage){var _newTarget=this.constructor;if(errorMessage===void 0){errorMessage="A timeout occurred.";}var _this=this;var trueProto=_newTarget.prototype;_this=_super.call(this,errorMessage)||this;_this.__proto__=trueProto;return _this}return TimeoutError}(Error);var AbortError=function(_super){__extends(AbortError,_super);function AbortError(errorMessage){var _newTarget=this.constructor;if(errorMessage===void 0){errorMessage="An abort occurred.";}var _this=this;var trueProto=_newTarget.prototype;_this=_super.call(this,errorMessage)||this;_this.__proto__=trueProto;return _this}return AbortError}(Error);},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"HttpResponse",function(){return HttpResponse});__webpack_require__.d(__webpack_exports__,"HttpClient",function(){return HttpClient});var __assign=Object.assign||function(t){for(var s,i=1,n=arguments.length;i<n;i++){s=arguments[i];for(var p in s)if(Object.prototype.hasOwnProperty.call(s,p))t[p]=s[p];}return t};var HttpResponse=function(){function HttpResponse(statusCode,statusText,content){this.statusCode=statusCode;this.statusText=statusText;this.content=content;}return HttpResponse}();var HttpClient=function(){function HttpClient(){}HttpClient.prototype.get=function(url,options){return this.send(__assign({},options,{method:"GET",url:url}))};HttpClient.prototype.post=function(url,options){return this.send(__assign({},options,{method:"POST",url:url}))};HttpClient.prototype.delete=function(url,options){return this.send(__assign({},options,{method:"DELETE",url:url}))};HttpClient.prototype.getCookieString=function(url){return ""};return HttpClient}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"DefaultHttpClient",function(){return DefaultHttpClient});var _Errors__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(4);var _FetchHttpClient__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(7);var _HttpClient__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(5);var _Utils__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__(9);var _XhrHttpClient__WEBPACK_IMPORTED_MODULE_4__=__webpack_require__(11);var __extends=function(){var extendStatics=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(d,b){d.__proto__=b;}||function(d,b){for(var p in b)if(b.hasOwnProperty(p))d[p]=b[p];};return function(d,b){extendStatics(d,b);function __(){this.constructor=d;}d.prototype=b===null?Object.create(b):(__.prototype=b.prototype,new __);}}();var DefaultHttpClient=function(_super){__extends(DefaultHttpClient,_super);function DefaultHttpClient(logger){var _this=_super.call(this)||this;if(typeof fetch!=="undefined"||_Utils__WEBPACK_IMPORTED_MODULE_3__["Platform"].isNode){_this.httpClient=new _FetchHttpClient__WEBPACK_IMPORTED_MODULE_1__["FetchHttpClient"](logger);}else if(typeof XMLHttpRequest!=="undefined"){_this.httpClient=new _XhrHttpClient__WEBPACK_IMPORTED_MODULE_4__["XhrHttpClient"](logger);}else{throw new Error("No usable HttpClient found.")}return _this}DefaultHttpClient.prototype.send=function(request){if(request.abortSignal&&request.abortSignal.aborted){return Promise.reject(new _Errors__WEBPACK_IMPORTED_MODULE_0__["AbortError"])}if(!request.method){return Promise.reject(new Error("No method defined."))}if(!request.url){return Promise.reject(new Error("No url defined."))}return this.httpClient.send(request)};DefaultHttpClient.prototype.getCookieString=function(url){return this.httpClient.getCookieString(url)};return DefaultHttpClient}(_HttpClient__WEBPACK_IMPORTED_MODULE_2__["HttpClient"]);},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"FetchHttpClient",function(){return FetchHttpClient});var _Errors__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(4);var _HttpClient__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(5);var _ILogger__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(8);var _Utils__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__(9);var __extends=function(){var extendStatics=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(d,b){d.__proto__=b;}||function(d,b){for(var p in b)if(b.hasOwnProperty(p))d[p]=b[p];};return function(d,b){extendStatics(d,b);function __(){this.constructor=d;}d.prototype=b===null?Object.create(b):(__.prototype=b.prototype,new __);}}();var __assign=Object.assign||function(t){for(var s,i=1,n=arguments.length;i<n;i++){s=arguments[i];for(var p in s)if(Object.prototype.hasOwnProperty.call(s,p))t[p]=s[p];}return t};var __awaiter=function(thisArg,_arguments,P,generator){return new(P||(P=Promise))(function(resolve,reject){function fulfilled(value){try{step(generator.next(value));}catch(e){reject(e);}}function rejected(value){try{step(generator["throw"](value));}catch(e){reject(e);}}function step(result){result.done?resolve(result.value):new P(function(resolve){resolve(result.value);}).then(fulfilled,rejected);}step((generator=generator.apply(thisArg,_arguments||[])).next());})};var __generator=function(thisArg,body){var _={label:0,sent:function(){if(t[0]&1)throw t[1];return t[1]},trys:[],ops:[]},f,y,t,g;return g={next:verb(0),throw:verb(1),return:verb(2)},typeof Symbol==="function"&&(g[Symbol.iterator]=function(){return this}),g;function verb(n){return function(v){return step([n,v])}}function step(op){if(f)throw new TypeError("Generator is already executing.");while(_)try{if(f=1,y&&(t=op[0]&2?y["return"]:op[0]?y["throw"]||((t=y["return"])&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;if(y=0,t)op=[op[0]&2,t.value];switch(op[0]){case 0:case 1:t=op;break;case 4:_.label++;return {value:op[1],done:false};case 5:_.label++;y=op[1];op=[0];continue;case 7:op=_.ops.pop();_.trys.pop();continue;default:if(!(t=_.trys,t=t.length>0&&t[t.length-1])&&(op[0]===6||op[0]===2)){_=0;continue}if(op[0]===3&&(!t||op[1]>t[0]&&op[1]<t[3])){_.label=op[1];break}if(op[0]===6&&_.label<t[1]){_.label=t[1];t=op;break}if(t&&_.label<t[2]){_.label=t[2];_.ops.push(op);break}if(t[2])_.ops.pop();_.trys.pop();continue}op=body.call(thisArg,_);}catch(e){op=[6,e];y=0;}finally{f=t=0;}if(op[0]&5)throw op[1];return {value:op[0]?op[1]:void 0,done:true}}};var FetchHttpClient=function(_super){__extends(FetchHttpClient,_super);function FetchHttpClient(logger){var _this=_super.call(this)||this;_this.logger=logger;if(typeof fetch==="undefined"){var requireFunc=commonjsRequire;_this.jar=new(requireFunc("tough-cookie").CookieJar);_this.fetchType=requireFunc("node-fetch");_this.fetchType=requireFunc("fetch-cookie")(_this.fetchType,_this.jar);_this.abortControllerType=requireFunc("abort-controller");}else{_this.fetchType=fetch.bind(self);_this.abortControllerType=AbortController;}return _this}FetchHttpClient.prototype.send=function(request){return __awaiter(this,void 0,void 0,function(){var abortController,error,timeoutId,msTimeout,response,e_1,content,payload;var _this=this;return __generator(this,function(_a){switch(_a.label){case 0:if(request.abortSignal&&request.abortSignal.aborted){throw new _Errors__WEBPACK_IMPORTED_MODULE_0__["AbortError"]}if(!request.method){throw new Error("No method defined.")}if(!request.url){throw new Error("No url defined.")}abortController=new this.abortControllerType;if(request.abortSignal){request.abortSignal.onabort=function(){abortController.abort();error=new _Errors__WEBPACK_IMPORTED_MODULE_0__["AbortError"];};}timeoutId=null;if(request.timeout){msTimeout=request.timeout;timeoutId=setTimeout(function(){abortController.abort();_this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Warning,"Timeout from HTTP request.");error=new _Errors__WEBPACK_IMPORTED_MODULE_0__["TimeoutError"];},msTimeout);}_a.label=1;case 1:_a.trys.push([1,3,4,5]);return [4,this.fetchType(request.url,{body:request.content,cache:"no-cache",credentials:request.withCredentials===true?"include":"same-origin",headers:__assign({"Content-Type":"text/plain;charset=UTF-8","X-Requested-With":"XMLHttpRequest"},request.headers),method:request.method,mode:"cors",redirect:"manual",signal:abortController.signal})];case 2:response=_a.sent();return [3,5];case 3:e_1=_a.sent();if(error){throw error}this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Warning,"Error from HTTP request. "+e_1+".");throw e_1;case 4:if(timeoutId){clearTimeout(timeoutId);}if(request.abortSignal){request.abortSignal.onabort=null;}return [7];case 5:if(!response.ok){throw new _Errors__WEBPACK_IMPORTED_MODULE_0__["HttpError"](response.statusText,response.status)}content=deserializeContent(response,request.responseType);return [4,content];case 6:payload=_a.sent();return [2,new _HttpClient__WEBPACK_IMPORTED_MODULE_1__["HttpResponse"](response.status,response.statusText,payload)]}})})};FetchHttpClient.prototype.getCookieString=function(url){var cookies="";if(_Utils__WEBPACK_IMPORTED_MODULE_3__["Platform"].isNode&&this.jar){this.jar.getCookies(url,function(e,c){return cookies=c.join("; ")});}return cookies};return FetchHttpClient}(_HttpClient__WEBPACK_IMPORTED_MODULE_1__["HttpClient"]);function deserializeContent(response,responseType){var content;switch(responseType){case"arraybuffer":content=response.arrayBuffer();break;case"text":content=response.text();break;case"blob":case"document":case"json":throw new Error(responseType+" is not supported.");default:content=response.text();break}return content}},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"LogLevel",function(){return LogLevel});var LogLevel;(function(LogLevel){LogLevel[LogLevel["Trace"]=0]="Trace";LogLevel[LogLevel["Debug"]=1]="Debug";LogLevel[LogLevel["Information"]=2]="Information";LogLevel[LogLevel["Warning"]=3]="Warning";LogLevel[LogLevel["Error"]=4]="Error";LogLevel[LogLevel["Critical"]=5]="Critical";LogLevel[LogLevel["None"]=6]="None";})(LogLevel||(LogLevel={}));},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"VERSION",function(){return VERSION});__webpack_require__.d(__webpack_exports__,"Arg",function(){return Arg});__webpack_require__.d(__webpack_exports__,"Platform",function(){return Platform});__webpack_require__.d(__webpack_exports__,"getDataDetail",function(){return getDataDetail});__webpack_require__.d(__webpack_exports__,"formatArrayBuffer",function(){return formatArrayBuffer});__webpack_require__.d(__webpack_exports__,"isArrayBuffer",function(){return isArrayBuffer});__webpack_require__.d(__webpack_exports__,"sendMessage",function(){return sendMessage});__webpack_require__.d(__webpack_exports__,"createLogger",function(){return createLogger});__webpack_require__.d(__webpack_exports__,"SubjectSubscription",function(){return SubjectSubscription});__webpack_require__.d(__webpack_exports__,"ConsoleLogger",function(){return ConsoleLogger});__webpack_require__.d(__webpack_exports__,"getUserAgentHeader",function(){return getUserAgentHeader});__webpack_require__.d(__webpack_exports__,"constructUserAgent",function(){return constructUserAgent});var _ILogger__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(8);var _Loggers__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(10);var __assign=Object.assign||function(t){for(var s,i=1,n=arguments.length;i<n;i++){s=arguments[i];for(var p in s)if(Object.prototype.hasOwnProperty.call(s,p))t[p]=s[p];}return t};var __awaiter=function(thisArg,_arguments,P,generator){return new(P||(P=Promise))(function(resolve,reject){function fulfilled(value){try{step(generator.next(value));}catch(e){reject(e);}}function rejected(value){try{step(generator["throw"](value));}catch(e){reject(e);}}function step(result){result.done?resolve(result.value):new P(function(resolve){resolve(result.value);}).then(fulfilled,rejected);}step((generator=generator.apply(thisArg,_arguments||[])).next());})};var __generator=function(thisArg,body){var _={label:0,sent:function(){if(t[0]&1)throw t[1];return t[1]},trys:[],ops:[]},f,y,t,g;return g={next:verb(0),throw:verb(1),return:verb(2)},typeof Symbol==="function"&&(g[Symbol.iterator]=function(){return this}),g;function verb(n){return function(v){return step([n,v])}}function step(op){if(f)throw new TypeError("Generator is already executing.");while(_)try{if(f=1,y&&(t=op[0]&2?y["return"]:op[0]?y["throw"]||((t=y["return"])&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;if(y=0,t)op=[op[0]&2,t.value];switch(op[0]){case 0:case 1:t=op;break;case 4:_.label++;return {value:op[1],done:false};case 5:_.label++;y=op[1];op=[0];continue;case 7:op=_.ops.pop();_.trys.pop();continue;default:if(!(t=_.trys,t=t.length>0&&t[t.length-1])&&(op[0]===6||op[0]===2)){_=0;continue}if(op[0]===3&&(!t||op[1]>t[0]&&op[1]<t[3])){_.label=op[1];break}if(op[0]===6&&_.label<t[1]){_.label=t[1];t=op;break}if(t&&_.label<t[2]){_.label=t[2];_.ops.push(op);break}if(t[2])_.ops.pop();_.trys.pop();continue}op=body.call(thisArg,_);}catch(e){op=[6,e];y=0;}finally{f=t=0;}if(op[0]&5)throw op[1];return {value:op[0]?op[1]:void 0,done:true}}};var VERSION="5.0.3";var Arg=function(){function Arg(){}Arg.isRequired=function(val,name){if(val===null||val===undefined){throw new Error("The '"+name+"' argument is required.")}};Arg.isNotEmpty=function(val,name){if(!val||val.match(/^\s*$/)){throw new Error("The '"+name+"' argument should not be empty.")}};Arg.isIn=function(val,values,name){if(!(val in values)){throw new Error("Unknown "+name+" value: "+val+".")}};return Arg}();var Platform=function(){function Platform(){}Object.defineProperty(Platform,"isBrowser",{get:function(){return typeof window==="object"},enumerable:true,configurable:true});Object.defineProperty(Platform,"isWebWorker",{get:function(){return typeof self==="object"&&"importScripts"in self},enumerable:true,configurable:true});Object.defineProperty(Platform,"isNode",{get:function(){return !this.isBrowser&&!this.isWebWorker},enumerable:true,configurable:true});return Platform}();function getDataDetail(data,includeContent){var detail="";if(isArrayBuffer(data)){detail="Binary data of length "+data.byteLength;if(includeContent){detail+=". Content: '"+formatArrayBuffer(data)+"'";}}else if(typeof data==="string"){detail="String data of length "+data.length;if(includeContent){detail+=". Content: '"+data+"'";}}return detail}function formatArrayBuffer(data){var view=new Uint8Array(data);var str="";view.forEach(function(num){var pad=num<16?"0":"";str+="0x"+pad+num.toString(16)+" ";});return str.substr(0,str.length-1)}function isArrayBuffer(val){return val&&typeof ArrayBuffer!=="undefined"&&(val instanceof ArrayBuffer||val.constructor&&val.constructor.name==="ArrayBuffer")}function sendMessage(logger,transportName,httpClient,url,accessTokenFactory,content,logMessageContent,withCredentials,defaultHeaders){return __awaiter(this,void 0,void 0,function(){var _a,headers,token,_b,name,value,responseType,response;return __generator(this,function(_c){switch(_c.label){case 0:headers={};if(!accessTokenFactory)return [3,2];return [4,accessTokenFactory()];case 1:token=_c.sent();if(token){headers=(_a={},_a["Authorization"]="Bearer "+token,_a);}_c.label=2;case 2:_b=getUserAgentHeader(),name=_b[0],value=_b[1];headers[name]=value;logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Trace,"("+transportName+" transport) sending data. "+getDataDetail(content,logMessageContent)+".");responseType=isArrayBuffer(content)?"arraybuffer":"text";return [4,httpClient.post(url,{content:content,headers:__assign({},headers,defaultHeaders),responseType:responseType,withCredentials:withCredentials})];case 3:response=_c.sent();logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Trace,"("+transportName+" transport) request complete. Response status: "+response.statusCode+".");return [2]}})})}function createLogger(logger){if(logger===undefined){return new ConsoleLogger(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Information)}if(logger===null){return _Loggers__WEBPACK_IMPORTED_MODULE_1__["NullLogger"].instance}if(logger.log){return logger}return new ConsoleLogger(logger)}var SubjectSubscription=function(){function SubjectSubscription(subject,observer){this.subject=subject;this.observer=observer;}SubjectSubscription.prototype.dispose=function(){var index=this.subject.observers.indexOf(this.observer);if(index>-1){this.subject.observers.splice(index,1);}if(this.subject.observers.length===0&&this.subject.cancelCallback){this.subject.cancelCallback().catch(function(_){});}};return SubjectSubscription}();var ConsoleLogger=function(){function ConsoleLogger(minimumLogLevel){this.minimumLogLevel=minimumLogLevel;this.outputConsole=console;}ConsoleLogger.prototype.log=function(logLevel,message){if(logLevel>=this.minimumLogLevel){switch(logLevel){case _ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Critical:case _ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Error:this.outputConsole.error("["+(new Date).toISOString()+"] "+_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"][logLevel]+": "+message);break;case _ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Warning:this.outputConsole.warn("["+(new Date).toISOString()+"] "+_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"][logLevel]+": "+message);break;case _ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Information:this.outputConsole.info("["+(new Date).toISOString()+"] "+_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"][logLevel]+": "+message);break;default:this.outputConsole.log("["+(new Date).toISOString()+"] "+_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"][logLevel]+": "+message);break}}};return ConsoleLogger}();function getUserAgentHeader(){var userAgentHeaderName="X-SignalR-User-Agent";if(Platform.isNode){userAgentHeaderName="User-Agent";}return [userAgentHeaderName,constructUserAgent(VERSION,getOsName(),getRuntime(),getRuntimeVersion())]}function constructUserAgent(version,os,runtime,runtimeVersion){var userAgent="Microsoft SignalR/";var majorAndMinor=version.split(".");userAgent+=majorAndMinor[0]+"."+majorAndMinor[1];userAgent+=" ("+version+"; ";if(os&&os!==""){userAgent+=os+"; ";}else{userAgent+="Unknown OS; ";}userAgent+=""+runtime;if(runtimeVersion){userAgent+="; "+runtimeVersion;}else{userAgent+="; Unknown Runtime Version";}userAgent+=")";return userAgent}function getOsName(){if(Platform.isNode){switch(process.platform){case"win32":return "Windows NT";case"darwin":return "macOS";case"linux":return "Linux";default:return process.platform}}else{return ""}}function getRuntimeVersion(){if(Platform.isNode){return process.versions.node}return undefined}function getRuntime(){if(Platform.isNode){return "NodeJS"}else{return "Browser"}}},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"NullLogger",function(){return NullLogger});var NullLogger=function(){function NullLogger(){}NullLogger.prototype.log=function(_logLevel,_message){};NullLogger.instance=new NullLogger;return NullLogger}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"XhrHttpClient",function(){return XhrHttpClient});var _Errors__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(4);var _HttpClient__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(5);var _ILogger__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(8);var __extends=function(){var extendStatics=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(d,b){d.__proto__=b;}||function(d,b){for(var p in b)if(b.hasOwnProperty(p))d[p]=b[p];};return function(d,b){extendStatics(d,b);function __(){this.constructor=d;}d.prototype=b===null?Object.create(b):(__.prototype=b.prototype,new __);}}();var XhrHttpClient=function(_super){__extends(XhrHttpClient,_super);function XhrHttpClient(logger){var _this=_super.call(this)||this;_this.logger=logger;return _this}XhrHttpClient.prototype.send=function(request){var _this=this;if(request.abortSignal&&request.abortSignal.aborted){return Promise.reject(new _Errors__WEBPACK_IMPORTED_MODULE_0__["AbortError"])}if(!request.method){return Promise.reject(new Error("No method defined."))}if(!request.url){return Promise.reject(new Error("No url defined."))}return new Promise(function(resolve,reject){var xhr=new XMLHttpRequest;xhr.open(request.method,request.url,true);xhr.withCredentials=request.withCredentials===undefined?true:request.withCredentials;xhr.setRequestHeader("X-Requested-With","XMLHttpRequest");xhr.setRequestHeader("Content-Type","text/plain;charset=UTF-8");var headers=request.headers;if(headers){Object.keys(headers).forEach(function(header){xhr.setRequestHeader(header,headers[header]);});}if(request.responseType){xhr.responseType=request.responseType;}if(request.abortSignal){request.abortSignal.onabort=function(){xhr.abort();reject(new _Errors__WEBPACK_IMPORTED_MODULE_0__["AbortError"]);};}if(request.timeout){xhr.timeout=request.timeout;}xhr.onload=function(){if(request.abortSignal){request.abortSignal.onabort=null;}if(xhr.status>=200&&xhr.status<300){resolve(new _HttpClient__WEBPACK_IMPORTED_MODULE_1__["HttpResponse"](xhr.status,xhr.statusText,xhr.response||xhr.responseText));}else{reject(new _Errors__WEBPACK_IMPORTED_MODULE_0__["HttpError"](xhr.statusText,xhr.status));}};xhr.onerror=function(){_this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Warning,"Error from HTTP request. "+xhr.status+": "+xhr.statusText+".");reject(new _Errors__WEBPACK_IMPORTED_MODULE_0__["HttpError"](xhr.statusText,xhr.status));};xhr.ontimeout=function(){_this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Warning,"Timeout from HTTP request.");reject(new _Errors__WEBPACK_IMPORTED_MODULE_0__["TimeoutError"]);};xhr.send(request.content||"");})};return XhrHttpClient}(_HttpClient__WEBPACK_IMPORTED_MODULE_1__["HttpClient"]);},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"HubConnectionState",function(){return HubConnectionState});__webpack_require__.d(__webpack_exports__,"HubConnection",function(){return HubConnection});var _HandshakeProtocol__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(13);var _IHubProtocol__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(15);var _ILogger__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(8);var _Subject__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__(16);var _Utils__WEBPACK_IMPORTED_MODULE_4__=__webpack_require__(9);var __awaiter=function(thisArg,_arguments,P,generator){return new(P||(P=Promise))(function(resolve,reject){function fulfilled(value){try{step(generator.next(value));}catch(e){reject(e);}}function rejected(value){try{step(generator["throw"](value));}catch(e){reject(e);}}function step(result){result.done?resolve(result.value):new P(function(resolve){resolve(result.value);}).then(fulfilled,rejected);}step((generator=generator.apply(thisArg,_arguments||[])).next());})};var __generator=function(thisArg,body){var _={label:0,sent:function(){if(t[0]&1)throw t[1];return t[1]},trys:[],ops:[]},f,y,t,g;return g={next:verb(0),throw:verb(1),return:verb(2)},typeof Symbol==="function"&&(g[Symbol.iterator]=function(){return this}),g;function verb(n){return function(v){return step([n,v])}}function step(op){if(f)throw new TypeError("Generator is already executing.");while(_)try{if(f=1,y&&(t=op[0]&2?y["return"]:op[0]?y["throw"]||((t=y["return"])&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;if(y=0,t)op=[op[0]&2,t.value];switch(op[0]){case 0:case 1:t=op;break;case 4:_.label++;return {value:op[1],done:false};case 5:_.label++;y=op[1];op=[0];continue;case 7:op=_.ops.pop();_.trys.pop();continue;default:if(!(t=_.trys,t=t.length>0&&t[t.length-1])&&(op[0]===6||op[0]===2)){_=0;continue}if(op[0]===3&&(!t||op[1]>t[0]&&op[1]<t[3])){_.label=op[1];break}if(op[0]===6&&_.label<t[1]){_.label=t[1];t=op;break}if(t&&_.label<t[2]){_.label=t[2];_.ops.push(op);break}if(t[2])_.ops.pop();_.trys.pop();continue}op=body.call(thisArg,_);}catch(e){op=[6,e];y=0;}finally{f=t=0;}if(op[0]&5)throw op[1];return {value:op[0]?op[1]:void 0,done:true}}};var DEFAULT_TIMEOUT_IN_MS=30*1e3;var DEFAULT_PING_INTERVAL_IN_MS=15*1e3;var HubConnectionState;(function(HubConnectionState){HubConnectionState["Disconnected"]="Disconnected";HubConnectionState["Connecting"]="Connecting";HubConnectionState["Connected"]="Connected";HubConnectionState["Disconnecting"]="Disconnecting";HubConnectionState["Reconnecting"]="Reconnecting";})(HubConnectionState||(HubConnectionState={}));var HubConnection=function(){function HubConnection(connection,logger,protocol,reconnectPolicy){var _this=this;_Utils__WEBPACK_IMPORTED_MODULE_4__["Arg"].isRequired(connection,"connection");_Utils__WEBPACK_IMPORTED_MODULE_4__["Arg"].isRequired(logger,"logger");_Utils__WEBPACK_IMPORTED_MODULE_4__["Arg"].isRequired(protocol,"protocol");this.serverTimeoutInMilliseconds=DEFAULT_TIMEOUT_IN_MS;this.keepAliveIntervalInMilliseconds=DEFAULT_PING_INTERVAL_IN_MS;this.logger=logger;this.protocol=protocol;this.connection=connection;this.reconnectPolicy=reconnectPolicy;this.handshakeProtocol=new _HandshakeProtocol__WEBPACK_IMPORTED_MODULE_0__["HandshakeProtocol"];this.connection.onreceive=function(data){return _this.processIncomingData(data)};this.connection.onclose=function(error){return _this.connectionClosed(error)};this.callbacks={};this.methods={};this.closedCallbacks=[];this.reconnectingCallbacks=[];this.reconnectedCallbacks=[];this.invocationId=0;this.receivedHandshakeResponse=false;this.connectionState=HubConnectionState.Disconnected;this.connectionStarted=false;this.cachedPingMessage=this.protocol.writeMessage({type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Ping});}HubConnection.create=function(connection,logger,protocol,reconnectPolicy){return new HubConnection(connection,logger,protocol,reconnectPolicy)};Object.defineProperty(HubConnection.prototype,"state",{get:function(){return this.connectionState},enumerable:true,configurable:true});Object.defineProperty(HubConnection.prototype,"connectionId",{get:function(){return this.connection?this.connection.connectionId||null:null},enumerable:true,configurable:true});Object.defineProperty(HubConnection.prototype,"baseUrl",{get:function(){return this.connection.baseUrl||""},set:function(url){if(this.connectionState!==HubConnectionState.Disconnected&&this.connectionState!==HubConnectionState.Reconnecting){throw new Error("The HubConnection must be in the Disconnected or Reconnecting state to change the url.")}if(!url){throw new Error("The HubConnection url must be a valid url.")}this.connection.baseUrl=url;},enumerable:true,configurable:true});HubConnection.prototype.start=function(){this.startPromise=this.startWithStateTransitions();return this.startPromise};HubConnection.prototype.startWithStateTransitions=function(){return __awaiter(this,void 0,void 0,function(){var e_1;return __generator(this,function(_a){switch(_a.label){case 0:if(this.connectionState!==HubConnectionState.Disconnected){return [2,Promise.reject(new Error("Cannot start a HubConnection that is not in the 'Disconnected' state."))]}this.connectionState=HubConnectionState.Connecting;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Starting HubConnection.");_a.label=1;case 1:_a.trys.push([1,3,,4]);return [4,this.startInternal()];case 2:_a.sent();this.connectionState=HubConnectionState.Connected;this.connectionStarted=true;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"HubConnection connected successfully.");return [3,4];case 3:e_1=_a.sent();this.connectionState=HubConnectionState.Disconnected;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"HubConnection failed to start successfully because of error '"+e_1+"'.");return [2,Promise.reject(e_1)];case 4:return [2]}})})};HubConnection.prototype.startInternal=function(){return __awaiter(this,void 0,void 0,function(){var handshakePromise,handshakeRequest,e_2;var _this=this;return __generator(this,function(_a){switch(_a.label){case 0:this.stopDuringStartError=undefined;this.receivedHandshakeResponse=false;handshakePromise=new Promise(function(resolve,reject){_this.handshakeResolver=resolve;_this.handshakeRejecter=reject;});return [4,this.connection.start(this.protocol.transferFormat)];case 1:_a.sent();_a.label=2;case 2:_a.trys.push([2,5,,7]);handshakeRequest={protocol:this.protocol.name,version:this.protocol.version};this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Sending handshake request.");return [4,this.sendMessage(this.handshakeProtocol.writeHandshakeRequest(handshakeRequest))];case 3:_a.sent();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Information,"Using HubProtocol '"+this.protocol.name+"'.");this.cleanupTimeout();this.resetTimeoutPeriod();this.resetKeepAliveInterval();return [4,handshakePromise];case 4:_a.sent();if(this.stopDuringStartError){throw this.stopDuringStartError}return [3,7];case 5:e_2=_a.sent();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Hub handshake failed with error '"+e_2+"' during start(). Stopping HubConnection.");this.cleanupTimeout();this.cleanupPingTimer();return [4,this.connection.stop(e_2)];case 6:_a.sent();throw e_2;case 7:return [2]}})})};HubConnection.prototype.stop=function(){return __awaiter(this,void 0,void 0,function(){var startPromise,e_3;return __generator(this,function(_a){switch(_a.label){case 0:startPromise=this.startPromise;this.stopPromise=this.stopInternal();return [4,this.stopPromise];case 1:_a.sent();_a.label=2;case 2:_a.trys.push([2,4,,5]);return [4,startPromise];case 3:_a.sent();return [3,5];case 4:e_3=_a.sent();return [3,5];case 5:return [2]}})})};HubConnection.prototype.stopInternal=function(error){if(this.connectionState===HubConnectionState.Disconnected){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Call to HubConnection.stop("+error+") ignored because it is already in the disconnected state.");return Promise.resolve()}if(this.connectionState===HubConnectionState.Disconnecting){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Call to HttpConnection.stop("+error+") ignored because the connection is already in the disconnecting state.");return this.stopPromise}this.connectionState=HubConnectionState.Disconnecting;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Stopping HubConnection.");if(this.reconnectDelayHandle){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Connection stopped during reconnect delay. Done reconnecting.");clearTimeout(this.reconnectDelayHandle);this.reconnectDelayHandle=undefined;this.completeClose();return Promise.resolve()}this.cleanupTimeout();this.cleanupPingTimer();this.stopDuringStartError=error||new Error("The connection was stopped before the hub handshake could complete.");return this.connection.stop(error)};HubConnection.prototype.stream=function(methodName){var _this=this;var args=[];for(var _i=1;_i<arguments.length;_i++){args[_i-1]=arguments[_i];}var _a=this.replaceStreamingParams(args),streams=_a[0],streamIds=_a[1];var invocationDescriptor=this.createStreamInvocation(methodName,args,streamIds);var promiseQueue;var subject=new _Subject__WEBPACK_IMPORTED_MODULE_3__["Subject"];subject.cancelCallback=function(){var cancelInvocation=_this.createCancelInvocation(invocationDescriptor.invocationId);delete _this.callbacks[invocationDescriptor.invocationId];return promiseQueue.then(function(){return _this.sendWithProtocol(cancelInvocation)})};this.callbacks[invocationDescriptor.invocationId]=function(invocationEvent,error){if(error){subject.error(error);return}else if(invocationEvent){if(invocationEvent.type===_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Completion){if(invocationEvent.error){subject.error(new Error(invocationEvent.error));}else{subject.complete();}}else{subject.next(invocationEvent.item);}}};promiseQueue=this.sendWithProtocol(invocationDescriptor).catch(function(e){subject.error(e);delete _this.callbacks[invocationDescriptor.invocationId];});this.launchStreams(streams,promiseQueue);return subject};HubConnection.prototype.sendMessage=function(message){this.resetKeepAliveInterval();return this.connection.send(message)};HubConnection.prototype.sendWithProtocol=function(message){return this.sendMessage(this.protocol.writeMessage(message))};HubConnection.prototype.send=function(methodName){var args=[];for(var _i=1;_i<arguments.length;_i++){args[_i-1]=arguments[_i];}var _a=this.replaceStreamingParams(args),streams=_a[0],streamIds=_a[1];var sendPromise=this.sendWithProtocol(this.createInvocation(methodName,args,true,streamIds));this.launchStreams(streams,sendPromise);return sendPromise};HubConnection.prototype.invoke=function(methodName){var _this=this;var args=[];for(var _i=1;_i<arguments.length;_i++){args[_i-1]=arguments[_i];}var _a=this.replaceStreamingParams(args),streams=_a[0],streamIds=_a[1];var invocationDescriptor=this.createInvocation(methodName,args,false,streamIds);var p=new Promise(function(resolve,reject){_this.callbacks[invocationDescriptor.invocationId]=function(invocationEvent,error){if(error){reject(error);return}else if(invocationEvent){if(invocationEvent.type===_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Completion){if(invocationEvent.error){reject(new Error(invocationEvent.error));}else{resolve(invocationEvent.result);}}else{reject(new Error("Unexpected message type: "+invocationEvent.type));}}};var promiseQueue=_this.sendWithProtocol(invocationDescriptor).catch(function(e){reject(e);delete _this.callbacks[invocationDescriptor.invocationId];});_this.launchStreams(streams,promiseQueue);});return p};HubConnection.prototype.on=function(methodName,newMethod){if(!methodName||!newMethod){return}methodName=methodName.toLowerCase();if(!this.methods[methodName]){this.methods[methodName]=[];}if(this.methods[methodName].indexOf(newMethod)!==-1){return}this.methods[methodName].push(newMethod);};HubConnection.prototype.off=function(methodName,method){if(!methodName){return}methodName=methodName.toLowerCase();var handlers=this.methods[methodName];if(!handlers){return}if(method){var removeIdx=handlers.indexOf(method);if(removeIdx!==-1){handlers.splice(removeIdx,1);if(handlers.length===0){delete this.methods[methodName];}}}else{delete this.methods[methodName];}};HubConnection.prototype.onclose=function(callback){if(callback){this.closedCallbacks.push(callback);}};HubConnection.prototype.onreconnecting=function(callback){if(callback){this.reconnectingCallbacks.push(callback);}};HubConnection.prototype.onreconnected=function(callback){if(callback){this.reconnectedCallbacks.push(callback);}};HubConnection.prototype.processIncomingData=function(data){this.cleanupTimeout();if(!this.receivedHandshakeResponse){data=this.processHandshakeResponse(data);this.receivedHandshakeResponse=true;}if(data){var messages=this.protocol.parseMessages(data,this.logger);for(var _i=0,messages_1=messages;_i<messages_1.length;_i++){var message=messages_1[_i];switch(message.type){case _IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Invocation:this.invokeClientMethod(message);break;case _IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].StreamItem:case _IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Completion:var callback=this.callbacks[message.invocationId];if(callback){if(message.type===_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Completion){delete this.callbacks[message.invocationId];}callback(message);}break;case _IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Ping:break;case _IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Close:this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Information,"Close message received from server.");var error=message.error?new Error("Server returned an error on close: "+message.error):undefined;if(message.allowReconnect===true){this.connection.stop(error);}else{this.stopPromise=this.stopInternal(error);}break;default:this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Warning,"Invalid message type: "+message.type+".");break}}}this.resetTimeoutPeriod();};HubConnection.prototype.processHandshakeResponse=function(data){var _a;var responseMessage;var remainingData;try{_a=this.handshakeProtocol.parseHandshakeResponse(data),remainingData=_a[0],responseMessage=_a[1];}catch(e){var message="Error parsing handshake response: "+e;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,message);var error=new Error(message);this.handshakeRejecter(error);throw error}if(responseMessage.error){var message="Server returned handshake error: "+responseMessage.error;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,message);var error=new Error(message);this.handshakeRejecter(error);throw error}else{this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Server handshake complete.");}this.handshakeResolver();return remainingData};HubConnection.prototype.resetKeepAliveInterval=function(){var _this=this;if(this.connection.features.inherentKeepAlive){return}this.cleanupPingTimer();this.pingServerHandle=setTimeout(function(){return __awaiter(_this,void 0,void 0,function(){var _a;return __generator(this,function(_b){switch(_b.label){case 0:if(!(this.connectionState===HubConnectionState.Connected))return [3,4];_b.label=1;case 1:_b.trys.push([1,3,,4]);return [4,this.sendMessage(this.cachedPingMessage)];case 2:_b.sent();return [3,4];case 3:_a=_b.sent();this.cleanupPingTimer();return [3,4];case 4:return [2]}})})},this.keepAliveIntervalInMilliseconds);};HubConnection.prototype.resetTimeoutPeriod=function(){var _this=this;if(!this.connection.features||!this.connection.features.inherentKeepAlive){this.timeoutHandle=setTimeout(function(){return _this.serverTimeout()},this.serverTimeoutInMilliseconds);}};HubConnection.prototype.serverTimeout=function(){this.connection.stop(new Error("Server timeout elapsed without receiving a message from the server."));};HubConnection.prototype.invokeClientMethod=function(invocationMessage){var _this=this;var methods=this.methods[invocationMessage.target.toLowerCase()];if(methods){try{methods.forEach(function(m){return m.apply(_this,invocationMessage.arguments)});}catch(e){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,"A callback for the method "+invocationMessage.target.toLowerCase()+" threw error '"+e+"'.");}if(invocationMessage.invocationId){var message="Server requested a response, which is not supported in this version of the client.";this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,message);this.stopPromise=this.stopInternal(new Error(message));}}else{this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Warning,"No client method with the name '"+invocationMessage.target+"' found.");}};HubConnection.prototype.connectionClosed=function(error){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"HubConnection.connectionClosed("+error+") called while in state "+this.connectionState+".");this.stopDuringStartError=this.stopDuringStartError||error||new Error("The underlying connection was closed before the hub handshake could complete.");if(this.handshakeResolver){this.handshakeResolver();}this.cancelCallbacksWithError(error||new Error("Invocation canceled due to the underlying connection being closed."));this.cleanupTimeout();this.cleanupPingTimer();if(this.connectionState===HubConnectionState.Disconnecting){this.completeClose(error);}else if(this.connectionState===HubConnectionState.Connected&&this.reconnectPolicy){this.reconnect(error);}else if(this.connectionState===HubConnectionState.Connected){this.completeClose(error);}};HubConnection.prototype.completeClose=function(error){var _this=this;if(this.connectionStarted){this.connectionState=HubConnectionState.Disconnected;this.connectionStarted=false;try{this.closedCallbacks.forEach(function(c){return c.apply(_this,[error])});}catch(e){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,"An onclose callback called with error '"+error+"' threw error '"+e+"'.");}}};HubConnection.prototype.reconnect=function(error){return __awaiter(this,void 0,void 0,function(){var reconnectStartTime,previousReconnectAttempts,retryError,nextRetryDelay,e_4;var _this=this;return __generator(this,function(_a){switch(_a.label){case 0:reconnectStartTime=Date.now();previousReconnectAttempts=0;retryError=error!==undefined?error:new Error("Attempting to reconnect due to a unknown error.");nextRetryDelay=this.getNextRetryDelay(previousReconnectAttempts++,0,retryError);if(nextRetryDelay===null){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Connection not reconnecting because the IRetryPolicy returned null on the first reconnect attempt.");this.completeClose(error);return [2]}this.connectionState=HubConnectionState.Reconnecting;if(error){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Information,"Connection reconnecting because of error '"+error+"'.");}else{this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Information,"Connection reconnecting.");}if(this.onreconnecting){try{this.reconnectingCallbacks.forEach(function(c){return c.apply(_this,[error])});}catch(e){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,"An onreconnecting callback called with error '"+error+"' threw error '"+e+"'.");}if(this.connectionState!==HubConnectionState.Reconnecting){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Connection left the reconnecting state in onreconnecting callback. Done reconnecting.");return [2]}}_a.label=1;case 1:if(!(nextRetryDelay!==null))return [3,7];this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Information,"Reconnect attempt number "+previousReconnectAttempts+" will start in "+nextRetryDelay+" ms.");return [4,new Promise(function(resolve){_this.reconnectDelayHandle=setTimeout(resolve,nextRetryDelay);})];case 2:_a.sent();this.reconnectDelayHandle=undefined;if(this.connectionState!==HubConnectionState.Reconnecting){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Connection left the reconnecting state during reconnect delay. Done reconnecting.");return [2]}_a.label=3;case 3:_a.trys.push([3,5,,6]);return [4,this.startInternal()];case 4:_a.sent();this.connectionState=HubConnectionState.Connected;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Information,"HubConnection reconnected successfully.");if(this.onreconnected){try{this.reconnectedCallbacks.forEach(function(c){return c.apply(_this,[_this.connection.connectionId])});}catch(e){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,"An onreconnected callback called with connectionId '"+this.connection.connectionId+"; threw error '"+e+"'.");}}return [2];case 5:e_4=_a.sent();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Information,"Reconnect attempt failed because of error '"+e_4+"'.");if(this.connectionState!==HubConnectionState.Reconnecting){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Debug,"Connection left the reconnecting state during reconnect attempt. Done reconnecting.");return [2]}retryError=e_4 instanceof Error?e_4:new Error(e_4.toString());nextRetryDelay=this.getNextRetryDelay(previousReconnectAttempts++,Date.now()-reconnectStartTime,retryError);return [3,6];case 6:return [3,1];case 7:this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Information,"Reconnect retries have been exhausted after "+(Date.now()-reconnectStartTime)+" ms and "+previousReconnectAttempts+" failed attempts. Connection disconnecting.");this.completeClose();return [2]}})})};HubConnection.prototype.getNextRetryDelay=function(previousRetryCount,elapsedMilliseconds,retryReason){try{return this.reconnectPolicy.nextRetryDelayInMilliseconds({elapsedMilliseconds:elapsedMilliseconds,previousRetryCount:previousRetryCount,retryReason:retryReason})}catch(e){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,"IRetryPolicy.nextRetryDelayInMilliseconds("+previousRetryCount+", "+elapsedMilliseconds+") threw error '"+e+"'.");return null}};HubConnection.prototype.cancelCallbacksWithError=function(error){var callbacks=this.callbacks;this.callbacks={};Object.keys(callbacks).forEach(function(key){var callback=callbacks[key];callback(null,error);});};HubConnection.prototype.cleanupPingTimer=function(){if(this.pingServerHandle){clearTimeout(this.pingServerHandle);}};HubConnection.prototype.cleanupTimeout=function(){if(this.timeoutHandle){clearTimeout(this.timeoutHandle);}};HubConnection.prototype.createInvocation=function(methodName,args,nonblocking,streamIds){if(nonblocking){if(streamIds.length!==0){return {arguments:args,streamIds:streamIds,target:methodName,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Invocation}}else{return {arguments:args,target:methodName,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Invocation}}}else{var invocationId=this.invocationId;this.invocationId++;if(streamIds.length!==0){return {arguments:args,invocationId:invocationId.toString(),streamIds:streamIds,target:methodName,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Invocation}}else{return {arguments:args,invocationId:invocationId.toString(),target:methodName,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Invocation}}}};HubConnection.prototype.launchStreams=function(streams,promiseQueue){var _this=this;if(streams.length===0){return}if(!promiseQueue){promiseQueue=Promise.resolve();}var _loop_1=function(streamId){streams[streamId].subscribe({complete:function(){promiseQueue=promiseQueue.then(function(){return _this.sendWithProtocol(_this.createCompletionMessage(streamId))});},error:function(err){var message;if(err instanceof Error){message=err.message;}else if(err&&err.toString){message=err.toString();}else{message="Unknown error";}promiseQueue=promiseQueue.then(function(){return _this.sendWithProtocol(_this.createCompletionMessage(streamId,message))});},next:function(item){promiseQueue=promiseQueue.then(function(){return _this.sendWithProtocol(_this.createStreamItemMessage(streamId,item))});}});};for(var streamId in streams){_loop_1(streamId);}};HubConnection.prototype.replaceStreamingParams=function(args){var streams=[];var streamIds=[];for(var i=0;i<args.length;i++){var argument=args[i];if(this.isObservable(argument)){var streamId=this.invocationId;this.invocationId++;streams[streamId]=argument;streamIds.push(streamId.toString());args.splice(i,1);}}return [streams,streamIds]};HubConnection.prototype.isObservable=function(arg){return arg&&arg.subscribe&&typeof arg.subscribe==="function"};HubConnection.prototype.createStreamInvocation=function(methodName,args,streamIds){var invocationId=this.invocationId;this.invocationId++;if(streamIds.length!==0){return {arguments:args,invocationId:invocationId.toString(),streamIds:streamIds,target:methodName,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].StreamInvocation}}else{return {arguments:args,invocationId:invocationId.toString(),target:methodName,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].StreamInvocation}}};HubConnection.prototype.createCancelInvocation=function(id){return {invocationId:id,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].CancelInvocation}};HubConnection.prototype.createStreamItemMessage=function(id,item){return {invocationId:id,item:item,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].StreamItem}};HubConnection.prototype.createCompletionMessage=function(id,error,result){if(error){return {error:error,invocationId:id,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Completion}}return {invocationId:id,result:result,type:_IHubProtocol__WEBPACK_IMPORTED_MODULE_1__["MessageType"].Completion}};return HubConnection}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"HandshakeProtocol",function(){return HandshakeProtocol});var _TextMessageFormat__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(14);var _Utils__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(9);var HandshakeProtocol=function(){function HandshakeProtocol(){}HandshakeProtocol.prototype.writeHandshakeRequest=function(handshakeRequest){return _TextMessageFormat__WEBPACK_IMPORTED_MODULE_0__["TextMessageFormat"].write(JSON.stringify(handshakeRequest))};HandshakeProtocol.prototype.parseHandshakeResponse=function(data){var responseMessage;var messageData;var remainingData;if(Object(_Utils__WEBPACK_IMPORTED_MODULE_1__["isArrayBuffer"])(data)||typeof Buffer!=="undefined"&&data instanceof Buffer){var binaryData=new Uint8Array(data);var separatorIndex=binaryData.indexOf(_TextMessageFormat__WEBPACK_IMPORTED_MODULE_0__["TextMessageFormat"].RecordSeparatorCode);if(separatorIndex===-1){throw new Error("Message is incomplete.")}var responseLength=separatorIndex+1;messageData=String.fromCharCode.apply(null,binaryData.slice(0,responseLength));remainingData=binaryData.byteLength>responseLength?binaryData.slice(responseLength).buffer:null;}else{var textData=data;var separatorIndex=textData.indexOf(_TextMessageFormat__WEBPACK_IMPORTED_MODULE_0__["TextMessageFormat"].RecordSeparator);if(separatorIndex===-1){throw new Error("Message is incomplete.")}var responseLength=separatorIndex+1;messageData=textData.substring(0,responseLength);remainingData=textData.length>responseLength?textData.substring(responseLength):null;}var messages=_TextMessageFormat__WEBPACK_IMPORTED_MODULE_0__["TextMessageFormat"].parse(messageData);var response=JSON.parse(messages[0]);if(response.type){throw new Error("Expected a handshake response from the server.")}responseMessage=response;return [remainingData,responseMessage]};return HandshakeProtocol}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"TextMessageFormat",function(){return TextMessageFormat});var TextMessageFormat=function(){function TextMessageFormat(){}TextMessageFormat.write=function(output){return ""+output+TextMessageFormat.RecordSeparator};TextMessageFormat.parse=function(input){if(input[input.length-1]!==TextMessageFormat.RecordSeparator){throw new Error("Message is incomplete.")}var messages=input.split(TextMessageFormat.RecordSeparator);messages.pop();return messages};TextMessageFormat.RecordSeparatorCode=30;TextMessageFormat.RecordSeparator=String.fromCharCode(TextMessageFormat.RecordSeparatorCode);return TextMessageFormat}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"MessageType",function(){return MessageType});var MessageType;(function(MessageType){MessageType[MessageType["Invocation"]=1]="Invocation";MessageType[MessageType["StreamItem"]=2]="StreamItem";MessageType[MessageType["Completion"]=3]="Completion";MessageType[MessageType["StreamInvocation"]=4]="StreamInvocation";MessageType[MessageType["CancelInvocation"]=5]="CancelInvocation";MessageType[MessageType["Ping"]=6]="Ping";MessageType[MessageType["Close"]=7]="Close";})(MessageType||(MessageType={}));},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"Subject",function(){return Subject});var _Utils__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(9);var Subject=function(){function Subject(){this.observers=[];}Subject.prototype.next=function(item){for(var _i=0,_a=this.observers;_i<_a.length;_i++){var observer=_a[_i];observer.next(item);}};Subject.prototype.error=function(err){for(var _i=0,_a=this.observers;_i<_a.length;_i++){var observer=_a[_i];if(observer.error){observer.error(err);}}};Subject.prototype.complete=function(){for(var _i=0,_a=this.observers;_i<_a.length;_i++){var observer=_a[_i];if(observer.complete){observer.complete();}}};Subject.prototype.subscribe=function(observer){this.observers.push(observer);return new _Utils__WEBPACK_IMPORTED_MODULE_0__["SubjectSubscription"](this,observer)};return Subject}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"HubConnectionBuilder",function(){return HubConnectionBuilder});var _DefaultReconnectPolicy__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(18);var _HttpConnection__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(19);var _HubConnection__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(12);var _ILogger__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__(8);var _JsonHubProtocol__WEBPACK_IMPORTED_MODULE_4__=__webpack_require__(25);var _Loggers__WEBPACK_IMPORTED_MODULE_5__=__webpack_require__(10);var _Utils__WEBPACK_IMPORTED_MODULE_6__=__webpack_require__(9);var __assign=Object.assign||function(t){for(var s,i=1,n=arguments.length;i<n;i++){s=arguments[i];for(var p in s)if(Object.prototype.hasOwnProperty.call(s,p))t[p]=s[p];}return t};var LogLevelNameMapping={trace:_ILogger__WEBPACK_IMPORTED_MODULE_3__["LogLevel"].Trace,debug:_ILogger__WEBPACK_IMPORTED_MODULE_3__["LogLevel"].Debug,info:_ILogger__WEBPACK_IMPORTED_MODULE_3__["LogLevel"].Information,information:_ILogger__WEBPACK_IMPORTED_MODULE_3__["LogLevel"].Information,warn:_ILogger__WEBPACK_IMPORTED_MODULE_3__["LogLevel"].Warning,warning:_ILogger__WEBPACK_IMPORTED_MODULE_3__["LogLevel"].Warning,error:_ILogger__WEBPACK_IMPORTED_MODULE_3__["LogLevel"].Error,critical:_ILogger__WEBPACK_IMPORTED_MODULE_3__["LogLevel"].Critical,none:_ILogger__WEBPACK_IMPORTED_MODULE_3__["LogLevel"].None};function parseLogLevel(name){var mapping=LogLevelNameMapping[name.toLowerCase()];if(typeof mapping!=="undefined"){return mapping}else{throw new Error("Unknown log level: "+name)}}var HubConnectionBuilder=function(){function HubConnectionBuilder(){}HubConnectionBuilder.prototype.configureLogging=function(logging){_Utils__WEBPACK_IMPORTED_MODULE_6__["Arg"].isRequired(logging,"logging");if(isLogger(logging)){this.logger=logging;}else if(typeof logging==="string"){var logLevel=parseLogLevel(logging);this.logger=new _Utils__WEBPACK_IMPORTED_MODULE_6__["ConsoleLogger"](logLevel);}else{this.logger=new _Utils__WEBPACK_IMPORTED_MODULE_6__["ConsoleLogger"](logging);}return this};HubConnectionBuilder.prototype.withUrl=function(url,transportTypeOrOptions){_Utils__WEBPACK_IMPORTED_MODULE_6__["Arg"].isRequired(url,"url");_Utils__WEBPACK_IMPORTED_MODULE_6__["Arg"].isNotEmpty(url,"url");this.url=url;if(typeof transportTypeOrOptions==="object"){this.httpConnectionOptions=__assign({},this.httpConnectionOptions,transportTypeOrOptions);}else{this.httpConnectionOptions=__assign({},this.httpConnectionOptions,{transport:transportTypeOrOptions});}return this};HubConnectionBuilder.prototype.withHubProtocol=function(protocol){_Utils__WEBPACK_IMPORTED_MODULE_6__["Arg"].isRequired(protocol,"protocol");this.protocol=protocol;return this};HubConnectionBuilder.prototype.withAutomaticReconnect=function(retryDelaysOrReconnectPolicy){if(this.reconnectPolicy){throw new Error("A reconnectPolicy has already been set.")}if(!retryDelaysOrReconnectPolicy){this.reconnectPolicy=new _DefaultReconnectPolicy__WEBPACK_IMPORTED_MODULE_0__["DefaultReconnectPolicy"];}else if(Array.isArray(retryDelaysOrReconnectPolicy)){this.reconnectPolicy=new _DefaultReconnectPolicy__WEBPACK_IMPORTED_MODULE_0__["DefaultReconnectPolicy"](retryDelaysOrReconnectPolicy);}else{this.reconnectPolicy=retryDelaysOrReconnectPolicy;}return this};HubConnectionBuilder.prototype.build=function(){var httpConnectionOptions=this.httpConnectionOptions||{};if(httpConnectionOptions.logger===undefined){httpConnectionOptions.logger=this.logger;}if(!this.url){throw new Error("The 'HubConnectionBuilder.withUrl' method must be called before building the connection.")}var connection=new _HttpConnection__WEBPACK_IMPORTED_MODULE_1__["HttpConnection"](this.url,httpConnectionOptions);return _HubConnection__WEBPACK_IMPORTED_MODULE_2__["HubConnection"].create(connection,this.logger||_Loggers__WEBPACK_IMPORTED_MODULE_5__["NullLogger"].instance,this.protocol||new _JsonHubProtocol__WEBPACK_IMPORTED_MODULE_4__["JsonHubProtocol"],this.reconnectPolicy)};return HubConnectionBuilder}();function isLogger(logger){return logger.log!==undefined}},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"DefaultReconnectPolicy",function(){return DefaultReconnectPolicy});var DEFAULT_RETRY_DELAYS_IN_MILLISECONDS=[0,2e3,1e4,3e4,null];var DefaultReconnectPolicy=function(){function DefaultReconnectPolicy(retryDelays){this.retryDelays=retryDelays!==undefined?retryDelays.concat([null]):DEFAULT_RETRY_DELAYS_IN_MILLISECONDS;}DefaultReconnectPolicy.prototype.nextRetryDelayInMilliseconds=function(retryContext){return this.retryDelays[retryContext.previousRetryCount]};return DefaultReconnectPolicy}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"HttpConnection",function(){return HttpConnection});__webpack_require__.d(__webpack_exports__,"TransportSendQueue",function(){return TransportSendQueue});var _DefaultHttpClient__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(6);var _ILogger__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(8);var _ITransport__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(20);var _LongPollingTransport__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__(21);var _ServerSentEventsTransport__WEBPACK_IMPORTED_MODULE_4__=__webpack_require__(23);var _Utils__WEBPACK_IMPORTED_MODULE_5__=__webpack_require__(9);var _WebSocketTransport__WEBPACK_IMPORTED_MODULE_6__=__webpack_require__(24);var __assign=Object.assign||function(t){for(var s,i=1,n=arguments.length;i<n;i++){s=arguments[i];for(var p in s)if(Object.prototype.hasOwnProperty.call(s,p))t[p]=s[p];}return t};var __awaiter=function(thisArg,_arguments,P,generator){return new(P||(P=Promise))(function(resolve,reject){function fulfilled(value){try{step(generator.next(value));}catch(e){reject(e);}}function rejected(value){try{step(generator["throw"](value));}catch(e){reject(e);}}function step(result){result.done?resolve(result.value):new P(function(resolve){resolve(result.value);}).then(fulfilled,rejected);}step((generator=generator.apply(thisArg,_arguments||[])).next());})};var __generator=function(thisArg,body){var _={label:0,sent:function(){if(t[0]&1)throw t[1];return t[1]},trys:[],ops:[]},f,y,t,g;return g={next:verb(0),throw:verb(1),return:verb(2)},typeof Symbol==="function"&&(g[Symbol.iterator]=function(){return this}),g;function verb(n){return function(v){return step([n,v])}}function step(op){if(f)throw new TypeError("Generator is already executing.");while(_)try{if(f=1,y&&(t=op[0]&2?y["return"]:op[0]?y["throw"]||((t=y["return"])&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;if(y=0,t)op=[op[0]&2,t.value];switch(op[0]){case 0:case 1:t=op;break;case 4:_.label++;return {value:op[1],done:false};case 5:_.label++;y=op[1];op=[0];continue;case 7:op=_.ops.pop();_.trys.pop();continue;default:if(!(t=_.trys,t=t.length>0&&t[t.length-1])&&(op[0]===6||op[0]===2)){_=0;continue}if(op[0]===3&&(!t||op[1]>t[0]&&op[1]<t[3])){_.label=op[1];break}if(op[0]===6&&_.label<t[1]){_.label=t[1];t=op;break}if(t&&_.label<t[2]){_.label=t[2];_.ops.push(op);break}if(t[2])_.ops.pop();_.trys.pop();continue}op=body.call(thisArg,_);}catch(e){op=[6,e];y=0;}finally{f=t=0;}if(op[0]&5)throw op[1];return {value:op[0]?op[1]:void 0,done:true}}};var MAX_REDIRECTS=100;var HttpConnection=function(){function HttpConnection(url,options){if(options===void 0){options={};}this.features={};this.negotiateVersion=1;_Utils__WEBPACK_IMPORTED_MODULE_5__["Arg"].isRequired(url,"url");this.logger=Object(_Utils__WEBPACK_IMPORTED_MODULE_5__["createLogger"])(options.logger);this.baseUrl=this.resolveUrl(url);options=options||{};options.logMessageContent=options.logMessageContent===undefined?false:options.logMessageContent;if(typeof options.withCredentials==="boolean"||options.withCredentials===undefined){options.withCredentials=options.withCredentials===undefined?true:options.withCredentials;}else{throw new Error("withCredentials option was not a 'boolean' or 'undefined' value")}var webSocketModule=null;var eventSourceModule=null;if(_Utils__WEBPACK_IMPORTED_MODULE_5__["Platform"].isNode&&"function"!=="undefined"){var requireFunc=commonjsRequire;webSocketModule=requireFunc("ws");eventSourceModule=requireFunc("eventsource");}if(!_Utils__WEBPACK_IMPORTED_MODULE_5__["Platform"].isNode&&typeof WebSocket!=="undefined"&&!options.WebSocket){options.WebSocket=WebSocket;}else if(_Utils__WEBPACK_IMPORTED_MODULE_5__["Platform"].isNode&&!options.WebSocket){if(webSocketModule){options.WebSocket=webSocketModule;}}if(!_Utils__WEBPACK_IMPORTED_MODULE_5__["Platform"].isNode&&typeof EventSource!=="undefined"&&!options.EventSource){options.EventSource=EventSource;}else if(_Utils__WEBPACK_IMPORTED_MODULE_5__["Platform"].isNode&&!options.EventSource){if(typeof eventSourceModule!=="undefined"){options.EventSource=eventSourceModule;}}this.httpClient=options.httpClient||new _DefaultHttpClient__WEBPACK_IMPORTED_MODULE_0__["DefaultHttpClient"](this.logger);this.connectionState="Disconnected";this.connectionStarted=false;this.options=options;this.onreceive=null;this.onclose=null;}HttpConnection.prototype.start=function(transferFormat){return __awaiter(this,void 0,void 0,function(){var message,message;return __generator(this,function(_a){switch(_a.label){case 0:transferFormat=transferFormat||_ITransport__WEBPACK_IMPORTED_MODULE_2__["TransferFormat"].Binary;_Utils__WEBPACK_IMPORTED_MODULE_5__["Arg"].isIn(transferFormat,_ITransport__WEBPACK_IMPORTED_MODULE_2__["TransferFormat"],"transferFormat");this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Starting connection with transfer format '"+_ITransport__WEBPACK_IMPORTED_MODULE_2__["TransferFormat"][transferFormat]+"'.");if(this.connectionState!=="Disconnected"){return [2,Promise.reject(new Error("Cannot start an HttpConnection that is not in the 'Disconnected' state."))]}this.connectionState="Connecting";this.startInternalPromise=this.startInternal(transferFormat);return [4,this.startInternalPromise];case 1:_a.sent();if(!(this.connectionState==="Disconnecting"))return [3,3];message="Failed to start the HttpConnection before stop() was called.";this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Error,message);return [4,this.stopPromise];case 2:_a.sent();return [2,Promise.reject(new Error(message))];case 3:if(this.connectionState!=="Connected"){message="HttpConnection.startInternal completed gracefully but didn't enter the connection into the connected state!";this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Error,message);return [2,Promise.reject(new Error(message))]}_a.label=4;case 4:this.connectionStarted=true;return [2]}})})};HttpConnection.prototype.send=function(data){if(this.connectionState!=="Connected"){return Promise.reject(new Error("Cannot send data if the connection is not in the 'Connected' State."))}if(!this.sendQueue){this.sendQueue=new TransportSendQueue(this.transport);}return this.sendQueue.send(data)};HttpConnection.prototype.stop=function(error){return __awaiter(this,void 0,void 0,function(){var _this=this;return __generator(this,function(_a){switch(_a.label){case 0:if(this.connectionState==="Disconnected"){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Call to HttpConnection.stop("+error+") ignored because the connection is already in the disconnected state.");return [2,Promise.resolve()]}if(this.connectionState==="Disconnecting"){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Call to HttpConnection.stop("+error+") ignored because the connection is already in the disconnecting state.");return [2,this.stopPromise]}this.connectionState="Disconnecting";this.stopPromise=new Promise(function(resolve){_this.stopPromiseResolver=resolve;});return [4,this.stopInternal(error)];case 1:_a.sent();return [4,this.stopPromise];case 2:_a.sent();return [2]}})})};HttpConnection.prototype.stopInternal=function(error){return __awaiter(this,void 0,void 0,function(){var e_1,e_2;return __generator(this,function(_a){switch(_a.label){case 0:this.stopError=error;_a.label=1;case 1:_a.trys.push([1,3,,4]);return [4,this.startInternalPromise];case 2:_a.sent();return [3,4];case 3:e_1=_a.sent();return [3,4];case 4:if(!this.transport)return [3,9];_a.label=5;case 5:_a.trys.push([5,7,,8]);return [4,this.transport.stop()];case 6:_a.sent();return [3,8];case 7:e_2=_a.sent();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Error,"HttpConnection.transport.stop() threw error '"+e_2+"'.");this.stopConnection();return [3,8];case 8:this.transport=undefined;return [3,10];case 9:this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"HttpConnection.transport is undefined in HttpConnection.stop() because start() failed.");this.stopConnection();_a.label=10;case 10:return [2]}})})};HttpConnection.prototype.startInternal=function(transferFormat){return __awaiter(this,void 0,void 0,function(){var url,negotiateResponse,redirects,_loop_1,this_1,e_3;return __generator(this,function(_a){switch(_a.label){case 0:url=this.baseUrl;this.accessTokenFactory=this.options.accessTokenFactory;_a.label=1;case 1:_a.trys.push([1,12,,13]);if(!this.options.skipNegotiation)return [3,5];if(!(this.options.transport===_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"].WebSockets))return [3,3];this.transport=this.constructTransport(_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"].WebSockets);return [4,this.startTransport(url,transferFormat)];case 2:_a.sent();return [3,4];case 3:throw new Error("Negotiation can only be skipped when using the WebSocket transport directly.");case 4:return [3,11];case 5:negotiateResponse=null;redirects=0;_loop_1=function(){var accessToken_1;return __generator(this,function(_a){switch(_a.label){case 0:return [4,this_1.getNegotiationResponse(url)];case 1:negotiateResponse=_a.sent();if(this_1.connectionState==="Disconnecting"||this_1.connectionState==="Disconnected"){throw new Error("The connection was stopped during negotiation.")}if(negotiateResponse.error){throw new Error(negotiateResponse.error)}if(negotiateResponse.ProtocolVersion){throw new Error("Detected a connection attempt to an ASP.NET SignalR Server. This client only supports connecting to an ASP.NET Core SignalR Server. See https://aka.ms/signalr-core-differences for details.")}if(negotiateResponse.url){url=negotiateResponse.url;}if(negotiateResponse.accessToken){accessToken_1=negotiateResponse.accessToken;this_1.accessTokenFactory=function(){return accessToken_1};}redirects++;return [2]}})};this_1=this;_a.label=6;case 6:return [5,_loop_1()];case 7:_a.sent();_a.label=8;case 8:if(negotiateResponse.url&&redirects<MAX_REDIRECTS)return [3,6];_a.label=9;case 9:if(redirects===MAX_REDIRECTS&&negotiateResponse.url){throw new Error("Negotiate redirection limit exceeded.")}return [4,this.createTransport(url,this.options.transport,negotiateResponse,transferFormat)];case 10:_a.sent();_a.label=11;case 11:if(this.transport instanceof _LongPollingTransport__WEBPACK_IMPORTED_MODULE_3__["LongPollingTransport"]){this.features.inherentKeepAlive=true;}if(this.connectionState==="Connecting"){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"The HttpConnection connected successfully.");this.connectionState="Connected";}return [3,13];case 12:e_3=_a.sent();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Error,"Failed to start the connection: "+e_3);this.connectionState="Disconnected";this.transport=undefined;return [2,Promise.reject(e_3)];case 13:return [2]}})})};HttpConnection.prototype.getNegotiationResponse=function(url){return __awaiter(this,void 0,void 0,function(){var headers,token,_a,name,value,negotiateUrl,response,negotiateResponse,e_4;return __generator(this,function(_b){switch(_b.label){case 0:headers={};if(!this.accessTokenFactory)return [3,2];return [4,this.accessTokenFactory()];case 1:token=_b.sent();if(token){headers["Authorization"]="Bearer "+token;}_b.label=2;case 2:_a=Object(_Utils__WEBPACK_IMPORTED_MODULE_5__["getUserAgentHeader"])(),name=_a[0],value=_a[1];headers[name]=value;negotiateUrl=this.resolveNegotiateUrl(url);this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Sending negotiation request: "+negotiateUrl+".");_b.label=3;case 3:_b.trys.push([3,5,,6]);return [4,this.httpClient.post(negotiateUrl,{content:"",headers:__assign({},headers,this.options.headers),withCredentials:this.options.withCredentials})];case 4:response=_b.sent();if(response.statusCode!==200){return [2,Promise.reject(new Error("Unexpected status code returned from negotiate '"+response.statusCode+"'"))]}negotiateResponse=JSON.parse(response.content);if(!negotiateResponse.negotiateVersion||negotiateResponse.negotiateVersion<1){negotiateResponse.connectionToken=negotiateResponse.connectionId;}return [2,negotiateResponse];case 5:e_4=_b.sent();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Error,"Failed to complete negotiation with the server: "+e_4);return [2,Promise.reject(e_4)];case 6:return [2]}})})};HttpConnection.prototype.createConnectUrl=function(url,connectionToken){if(!connectionToken){return url}return url+(url.indexOf("?")===-1?"?":"&")+("id="+connectionToken)};HttpConnection.prototype.createTransport=function(url,requestedTransport,negotiateResponse,requestedTransferFormat){return __awaiter(this,void 0,void 0,function(){var connectUrl,transportExceptions,transports,negotiate,_i,transports_1,endpoint,transportOrError,ex_1,ex_2,message;return __generator(this,function(_a){switch(_a.label){case 0:connectUrl=this.createConnectUrl(url,negotiateResponse.connectionToken);if(!this.isITransport(requestedTransport))return [3,2];this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Connection was provided an instance of ITransport, using that directly.");this.transport=requestedTransport;return [4,this.startTransport(connectUrl,requestedTransferFormat)];case 1:_a.sent();this.connectionId=negotiateResponse.connectionId;return [2];case 2:transportExceptions=[];transports=negotiateResponse.availableTransports||[];negotiate=negotiateResponse;_i=0,transports_1=transports;_a.label=3;case 3:if(!(_i<transports_1.length))return [3,13];endpoint=transports_1[_i];transportOrError=this.resolveTransportOrError(endpoint,requestedTransport,requestedTransferFormat);if(!(transportOrError instanceof Error))return [3,4];transportExceptions.push(endpoint.transport+" failed: "+transportOrError);return [3,12];case 4:if(!this.isITransport(transportOrError))return [3,12];this.transport=transportOrError;if(!!negotiate)return [3,9];_a.label=5;case 5:_a.trys.push([5,7,,8]);return [4,this.getNegotiationResponse(url)];case 6:negotiate=_a.sent();return [3,8];case 7:ex_1=_a.sent();return [2,Promise.reject(ex_1)];case 8:connectUrl=this.createConnectUrl(url,negotiate.connectionToken);_a.label=9;case 9:_a.trys.push([9,11,,12]);return [4,this.startTransport(connectUrl,requestedTransferFormat)];case 10:_a.sent();this.connectionId=negotiate.connectionId;return [2];case 11:ex_2=_a.sent();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Error,"Failed to start the transport '"+endpoint.transport+"': "+ex_2);negotiate=undefined;transportExceptions.push(endpoint.transport+" failed: "+ex_2);if(this.connectionState!=="Connecting"){message="Failed to select transport before stop() was called.";this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,message);return [2,Promise.reject(new Error(message))]}return [3,12];case 12:_i++;return [3,3];case 13:if(transportExceptions.length>0){return [2,Promise.reject(new Error("Unable to connect to the server with any of the available transports. "+transportExceptions.join(" ")))]}return [2,Promise.reject(new Error("None of the transports supported by the client are supported by the server."))]}})})};HttpConnection.prototype.constructTransport=function(transport){switch(transport){case _ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"].WebSockets:if(!this.options.WebSocket){throw new Error("'WebSocket' is not supported in your environment.")}return new _WebSocketTransport__WEBPACK_IMPORTED_MODULE_6__["WebSocketTransport"](this.httpClient,this.accessTokenFactory,this.logger,this.options.logMessageContent||false,this.options.WebSocket,this.options.headers||{});case _ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"].ServerSentEvents:if(!this.options.EventSource){throw new Error("'EventSource' is not supported in your environment.")}return new _ServerSentEventsTransport__WEBPACK_IMPORTED_MODULE_4__["ServerSentEventsTransport"](this.httpClient,this.accessTokenFactory,this.logger,this.options.logMessageContent||false,this.options.EventSource,this.options.withCredentials,this.options.headers||{});case _ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"].LongPolling:return new _LongPollingTransport__WEBPACK_IMPORTED_MODULE_3__["LongPollingTransport"](this.httpClient,this.accessTokenFactory,this.logger,this.options.logMessageContent||false,this.options.withCredentials,this.options.headers||{});default:throw new Error("Unknown transport: "+transport+".")}};HttpConnection.prototype.startTransport=function(url,transferFormat){var _this=this;this.transport.onreceive=this.onreceive;this.transport.onclose=function(e){return _this.stopConnection(e)};return this.transport.connect(url,transferFormat)};HttpConnection.prototype.resolveTransportOrError=function(endpoint,requestedTransport,requestedTransferFormat){var transport=_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"][endpoint.transport];if(transport===null||transport===undefined){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Skipping transport '"+endpoint.transport+"' because it is not supported by this client.");return new Error("Skipping transport '"+endpoint.transport+"' because it is not supported by this client.")}else{if(transportMatches(requestedTransport,transport)){var transferFormats=endpoint.transferFormats.map(function(s){return _ITransport__WEBPACK_IMPORTED_MODULE_2__["TransferFormat"][s]});if(transferFormats.indexOf(requestedTransferFormat)>=0){if(transport===_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"].WebSockets&&!this.options.WebSocket||transport===_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"].ServerSentEvents&&!this.options.EventSource){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Skipping transport '"+_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"][transport]+"' because it is not supported in your environment.'");return new Error("'"+_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"][transport]+"' is not supported in your environment.")}else{this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Selecting transport '"+_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"][transport]+"'.");try{return this.constructTransport(transport)}catch(ex){return ex}}}else{this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Skipping transport '"+_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"][transport]+"' because it does not support the requested transfer format '"+_ITransport__WEBPACK_IMPORTED_MODULE_2__["TransferFormat"][requestedTransferFormat]+"'.");return new Error("'"+_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"][transport]+"' does not support "+_ITransport__WEBPACK_IMPORTED_MODULE_2__["TransferFormat"][requestedTransferFormat]+".")}}else{this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Skipping transport '"+_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"][transport]+"' because it was disabled by the client.");return new Error("'"+_ITransport__WEBPACK_IMPORTED_MODULE_2__["HttpTransportType"][transport]+"' is disabled by the client.")}}};HttpConnection.prototype.isITransport=function(transport){return transport&&typeof transport==="object"&&"connect"in transport};HttpConnection.prototype.stopConnection=function(error){var _this=this;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"HttpConnection.stopConnection("+error+") called while in state "+this.connectionState+".");this.transport=undefined;error=this.stopError||error;this.stopError=undefined;if(this.connectionState==="Disconnected"){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Debug,"Call to HttpConnection.stopConnection("+error+") was ignored because the connection is already in the disconnected state.");return}if(this.connectionState==="Connecting"){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Warning,"Call to HttpConnection.stopConnection("+error+") was ignored because the connection is still in the connecting state.");throw new Error("HttpConnection.stopConnection("+error+") was called while the connection is still in the connecting state.")}if(this.connectionState==="Disconnecting"){this.stopPromiseResolver();}if(error){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Error,"Connection disconnected with error '"+error+"'.");}else{this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Information,"Connection disconnected.");}if(this.sendQueue){this.sendQueue.stop().catch(function(e){_this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Error,"TransportSendQueue.stop() threw error '"+e+"'.");});this.sendQueue=undefined;}this.connectionId=undefined;this.connectionState="Disconnected";if(this.connectionStarted){this.connectionStarted=false;try{if(this.onclose){this.onclose(error);}}catch(e){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Error,"HttpConnection.onclose("+error+") threw error '"+e+"'.");}}};HttpConnection.prototype.resolveUrl=function(url){if(url.lastIndexOf("https://",0)===0||url.lastIndexOf("http://",0)===0){return url}if(!_Utils__WEBPACK_IMPORTED_MODULE_5__["Platform"].isBrowser||!window.document){throw new Error("Cannot resolve '"+url+"'.")}var aTag=window.document.createElement("a");aTag.href=url;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Information,"Normalizing '"+url+"' to '"+aTag.href+"'.");return aTag.href};HttpConnection.prototype.resolveNegotiateUrl=function(url){var index=url.indexOf("?");var negotiateUrl=url.substring(0,index===-1?url.length:index);if(negotiateUrl[negotiateUrl.length-1]!=="/"){negotiateUrl+="/";}negotiateUrl+="negotiate";negotiateUrl+=index===-1?"":url.substring(index);if(negotiateUrl.indexOf("negotiateVersion")===-1){negotiateUrl+=index===-1?"?":"&";negotiateUrl+="negotiateVersion="+this.negotiateVersion;}return negotiateUrl};return HttpConnection}();function transportMatches(requestedTransport,actualTransport){return !requestedTransport||(actualTransport&requestedTransport)!==0}var TransportSendQueue=function(){function TransportSendQueue(transport){this.transport=transport;this.buffer=[];this.executing=true;this.sendBufferedData=new PromiseSource;this.transportResult=new PromiseSource;this.sendLoopPromise=this.sendLoop();}TransportSendQueue.prototype.send=function(data){this.bufferData(data);if(!this.transportResult){this.transportResult=new PromiseSource;}return this.transportResult.promise};TransportSendQueue.prototype.stop=function(){this.executing=false;this.sendBufferedData.resolve();return this.sendLoopPromise};TransportSendQueue.prototype.bufferData=function(data){if(this.buffer.length&&typeof this.buffer[0]!==typeof data){throw new Error("Expected data to be of type "+typeof this.buffer+" but was of type "+typeof data)}this.buffer.push(data);this.sendBufferedData.resolve();};TransportSendQueue.prototype.sendLoop=function(){return __awaiter(this,void 0,void 0,function(){var transportResult,data,error_1;return __generator(this,function(_a){switch(_a.label){case 0:return [4,this.sendBufferedData.promise];case 1:_a.sent();if(!this.executing){if(this.transportResult){this.transportResult.reject("Connection stopped.");}return [3,6]}this.sendBufferedData=new PromiseSource;transportResult=this.transportResult;this.transportResult=undefined;data=typeof this.buffer[0]==="string"?this.buffer.join(""):TransportSendQueue.concatBuffers(this.buffer);this.buffer.length=0;_a.label=2;case 2:_a.trys.push([2,4,,5]);return [4,this.transport.send(data)];case 3:_a.sent();transportResult.resolve();return [3,5];case 4:error_1=_a.sent();transportResult.reject(error_1);return [3,5];case 5:return [3,0];case 6:return [2]}})})};TransportSendQueue.concatBuffers=function(arrayBuffers){var totalLength=arrayBuffers.map(function(b){return b.byteLength}).reduce(function(a,b){return a+b});var result=new Uint8Array(totalLength);var offset=0;for(var _i=0,arrayBuffers_1=arrayBuffers;_i<arrayBuffers_1.length;_i++){var item=arrayBuffers_1[_i];result.set(new Uint8Array(item),offset);offset+=item.byteLength;}return result.buffer};return TransportSendQueue}();var PromiseSource=function(){function PromiseSource(){var _this=this;this.promise=new Promise(function(resolve,reject){var _a;return _a=[resolve,reject],_this.resolver=_a[0],_this.rejecter=_a[1],_a});}PromiseSource.prototype.resolve=function(){this.resolver();};PromiseSource.prototype.reject=function(reason){this.rejecter(reason);};return PromiseSource}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"HttpTransportType",function(){return HttpTransportType});__webpack_require__.d(__webpack_exports__,"TransferFormat",function(){return TransferFormat});var HttpTransportType;(function(HttpTransportType){HttpTransportType[HttpTransportType["None"]=0]="None";HttpTransportType[HttpTransportType["WebSockets"]=1]="WebSockets";HttpTransportType[HttpTransportType["ServerSentEvents"]=2]="ServerSentEvents";HttpTransportType[HttpTransportType["LongPolling"]=4]="LongPolling";})(HttpTransportType||(HttpTransportType={}));var TransferFormat;(function(TransferFormat){TransferFormat[TransferFormat["Text"]=1]="Text";TransferFormat[TransferFormat["Binary"]=2]="Binary";})(TransferFormat||(TransferFormat={}));},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"LongPollingTransport",function(){return LongPollingTransport});var _AbortController__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(22);var _Errors__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(4);var _ILogger__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(8);var _ITransport__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__(20);var _Utils__WEBPACK_IMPORTED_MODULE_4__=__webpack_require__(9);var __assign=Object.assign||function(t){for(var s,i=1,n=arguments.length;i<n;i++){s=arguments[i];for(var p in s)if(Object.prototype.hasOwnProperty.call(s,p))t[p]=s[p];}return t};var __awaiter=function(thisArg,_arguments,P,generator){return new(P||(P=Promise))(function(resolve,reject){function fulfilled(value){try{step(generator.next(value));}catch(e){reject(e);}}function rejected(value){try{step(generator["throw"](value));}catch(e){reject(e);}}function step(result){result.done?resolve(result.value):new P(function(resolve){resolve(result.value);}).then(fulfilled,rejected);}step((generator=generator.apply(thisArg,_arguments||[])).next());})};var __generator=function(thisArg,body){var _={label:0,sent:function(){if(t[0]&1)throw t[1];return t[1]},trys:[],ops:[]},f,y,t,g;return g={next:verb(0),throw:verb(1),return:verb(2)},typeof Symbol==="function"&&(g[Symbol.iterator]=function(){return this}),g;function verb(n){return function(v){return step([n,v])}}function step(op){if(f)throw new TypeError("Generator is already executing.");while(_)try{if(f=1,y&&(t=op[0]&2?y["return"]:op[0]?y["throw"]||((t=y["return"])&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;if(y=0,t)op=[op[0]&2,t.value];switch(op[0]){case 0:case 1:t=op;break;case 4:_.label++;return {value:op[1],done:false};case 5:_.label++;y=op[1];op=[0];continue;case 7:op=_.ops.pop();_.trys.pop();continue;default:if(!(t=_.trys,t=t.length>0&&t[t.length-1])&&(op[0]===6||op[0]===2)){_=0;continue}if(op[0]===3&&(!t||op[1]>t[0]&&op[1]<t[3])){_.label=op[1];break}if(op[0]===6&&_.label<t[1]){_.label=t[1];t=op;break}if(t&&_.label<t[2]){_.label=t[2];_.ops.push(op);break}if(t[2])_.ops.pop();_.trys.pop();continue}op=body.call(thisArg,_);}catch(e){op=[6,e];y=0;}finally{f=t=0;}if(op[0]&5)throw op[1];return {value:op[0]?op[1]:void 0,done:true}}};var LongPollingTransport=function(){function LongPollingTransport(httpClient,accessTokenFactory,logger,logMessageContent,withCredentials,headers){this.httpClient=httpClient;this.accessTokenFactory=accessTokenFactory;this.logger=logger;this.pollAbort=new _AbortController__WEBPACK_IMPORTED_MODULE_0__["AbortController"];this.logMessageContent=logMessageContent;this.withCredentials=withCredentials;this.headers=headers;this.running=false;this.onreceive=null;this.onclose=null;}Object.defineProperty(LongPollingTransport.prototype,"pollAborted",{get:function(){return this.pollAbort.aborted},enumerable:true,configurable:true});LongPollingTransport.prototype.connect=function(url,transferFormat){return __awaiter(this,void 0,void 0,function(){var _a,_b,name,value,headers,pollOptions,token,pollUrl,response;return __generator(this,function(_c){switch(_c.label){case 0:_Utils__WEBPACK_IMPORTED_MODULE_4__["Arg"].isRequired(url,"url");_Utils__WEBPACK_IMPORTED_MODULE_4__["Arg"].isRequired(transferFormat,"transferFormat");_Utils__WEBPACK_IMPORTED_MODULE_4__["Arg"].isIn(transferFormat,_ITransport__WEBPACK_IMPORTED_MODULE_3__["TransferFormat"],"transferFormat");this.url=url;this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) Connecting.");if(transferFormat===_ITransport__WEBPACK_IMPORTED_MODULE_3__["TransferFormat"].Binary&&(typeof XMLHttpRequest!=="undefined"&&typeof(new XMLHttpRequest).responseType!=="string")){throw new Error("Binary protocols over XmlHttpRequest not implementing advanced features are not supported.")}_b=Object(_Utils__WEBPACK_IMPORTED_MODULE_4__["getUserAgentHeader"])(),name=_b[0],value=_b[1];headers=__assign((_a={},_a[name]=value,_a),this.headers);pollOptions={abortSignal:this.pollAbort.signal,headers:headers,timeout:1e5,withCredentials:this.withCredentials};if(transferFormat===_ITransport__WEBPACK_IMPORTED_MODULE_3__["TransferFormat"].Binary){pollOptions.responseType="arraybuffer";}return [4,this.getAccessToken()];case 1:token=_c.sent();this.updateHeaderToken(pollOptions,token);pollUrl=url+"&_="+Date.now();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) polling: "+pollUrl+".");return [4,this.httpClient.get(pollUrl,pollOptions)];case 2:response=_c.sent();if(response.statusCode!==200){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,"(LongPolling transport) Unexpected response code: "+response.statusCode+".");this.closeError=new _Errors__WEBPACK_IMPORTED_MODULE_1__["HttpError"](response.statusText||"",response.statusCode);this.running=false;}else{this.running=true;}this.receiving=this.poll(this.url,pollOptions);return [2]}})})};LongPollingTransport.prototype.getAccessToken=function(){return __awaiter(this,void 0,void 0,function(){return __generator(this,function(_a){switch(_a.label){case 0:if(!this.accessTokenFactory)return [3,2];return [4,this.accessTokenFactory()];case 1:return [2,_a.sent()];case 2:return [2,null]}})})};LongPollingTransport.prototype.updateHeaderToken=function(request,token){if(!request.headers){request.headers={};}if(token){request.headers["Authorization"]="Bearer "+token;return}if(request.headers["Authorization"]){delete request.headers["Authorization"];}};LongPollingTransport.prototype.poll=function(url,pollOptions){return __awaiter(this,void 0,void 0,function(){var token,pollUrl,response,e_1;return __generator(this,function(_a){switch(_a.label){case 0:_a.trys.push([0,,8,9]);_a.label=1;case 1:if(!this.running)return [3,7];return [4,this.getAccessToken()];case 2:token=_a.sent();this.updateHeaderToken(pollOptions,token);_a.label=3;case 3:_a.trys.push([3,5,,6]);pollUrl=url+"&_="+Date.now();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) polling: "+pollUrl+".");return [4,this.httpClient.get(pollUrl,pollOptions)];case 4:response=_a.sent();if(response.statusCode===204){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Information,"(LongPolling transport) Poll terminated by server.");this.running=false;}else if(response.statusCode!==200){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Error,"(LongPolling transport) Unexpected response code: "+response.statusCode+".");this.closeError=new _Errors__WEBPACK_IMPORTED_MODULE_1__["HttpError"](response.statusText||"",response.statusCode);this.running=false;}else{if(response.content){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) data received. "+Object(_Utils__WEBPACK_IMPORTED_MODULE_4__["getDataDetail"])(response.content,this.logMessageContent)+".");if(this.onreceive){this.onreceive(response.content);}}else{this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) Poll timed out, reissuing.");}}return [3,6];case 5:e_1=_a.sent();if(!this.running){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) Poll errored after shutdown: "+e_1.message);}else{if(e_1 instanceof _Errors__WEBPACK_IMPORTED_MODULE_1__["TimeoutError"]){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) Poll timed out, reissuing.");}else{this.closeError=e_1;this.running=false;}}return [3,6];case 6:return [3,1];case 7:return [3,9];case 8:this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) Polling complete.");if(!this.pollAborted){this.raiseOnClose();}return [7];case 9:return [2]}})})};LongPollingTransport.prototype.send=function(data){return __awaiter(this,void 0,void 0,function(){return __generator(this,function(_a){if(!this.running){return [2,Promise.reject(new Error("Cannot send until the transport is connected"))]}return [2,Object(_Utils__WEBPACK_IMPORTED_MODULE_4__["sendMessage"])(this.logger,"LongPolling",this.httpClient,this.url,this.accessTokenFactory,data,this.logMessageContent,this.withCredentials,this.headers)]})})};LongPollingTransport.prototype.stop=function(){return __awaiter(this,void 0,void 0,function(){var headers,_a,name_1,value,deleteOptions,token;return __generator(this,function(_b){switch(_b.label){case 0:this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) Stopping polling.");this.running=false;this.pollAbort.abort();_b.label=1;case 1:_b.trys.push([1,,5,6]);return [4,this.receiving];case 2:_b.sent();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) sending DELETE request to "+this.url+".");headers={};_a=Object(_Utils__WEBPACK_IMPORTED_MODULE_4__["getUserAgentHeader"])(),name_1=_a[0],value=_a[1];headers[name_1]=value;deleteOptions={headers:__assign({},headers,this.headers),withCredentials:this.withCredentials};return [4,this.getAccessToken()];case 3:token=_b.sent();this.updateHeaderToken(deleteOptions,token);return [4,this.httpClient.delete(this.url,deleteOptions)];case 4:_b.sent();this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) DELETE request sent.");return [3,6];case 5:this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,"(LongPolling transport) Stop finished.");this.raiseOnClose();return [7];case 6:return [2]}})})};LongPollingTransport.prototype.raiseOnClose=function(){if(this.onclose){var logMessage="(LongPolling transport) Firing onclose event.";if(this.closeError){logMessage+=" Error: "+this.closeError;}this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_2__["LogLevel"].Trace,logMessage);this.onclose(this.closeError);}};return LongPollingTransport}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"AbortController",function(){return AbortController});var AbortController=function(){function AbortController(){this.isAborted=false;this.onabort=null;}AbortController.prototype.abort=function(){if(!this.isAborted){this.isAborted=true;if(this.onabort){this.onabort();}}};Object.defineProperty(AbortController.prototype,"signal",{get:function(){return this},enumerable:true,configurable:true});Object.defineProperty(AbortController.prototype,"aborted",{get:function(){return this.isAborted},enumerable:true,configurable:true});return AbortController}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"ServerSentEventsTransport",function(){return ServerSentEventsTransport});var _ILogger__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(8);var _ITransport__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(20);var _Utils__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(9);var __assign=Object.assign||function(t){for(var s,i=1,n=arguments.length;i<n;i++){s=arguments[i];for(var p in s)if(Object.prototype.hasOwnProperty.call(s,p))t[p]=s[p];}return t};var __awaiter=function(thisArg,_arguments,P,generator){return new(P||(P=Promise))(function(resolve,reject){function fulfilled(value){try{step(generator.next(value));}catch(e){reject(e);}}function rejected(value){try{step(generator["throw"](value));}catch(e){reject(e);}}function step(result){result.done?resolve(result.value):new P(function(resolve){resolve(result.value);}).then(fulfilled,rejected);}step((generator=generator.apply(thisArg,_arguments||[])).next());})};var __generator=function(thisArg,body){var _={label:0,sent:function(){if(t[0]&1)throw t[1];return t[1]},trys:[],ops:[]},f,y,t,g;return g={next:verb(0),throw:verb(1),return:verb(2)},typeof Symbol==="function"&&(g[Symbol.iterator]=function(){return this}),g;function verb(n){return function(v){return step([n,v])}}function step(op){if(f)throw new TypeError("Generator is already executing.");while(_)try{if(f=1,y&&(t=op[0]&2?y["return"]:op[0]?y["throw"]||((t=y["return"])&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;if(y=0,t)op=[op[0]&2,t.value];switch(op[0]){case 0:case 1:t=op;break;case 4:_.label++;return {value:op[1],done:false};case 5:_.label++;y=op[1];op=[0];continue;case 7:op=_.ops.pop();_.trys.pop();continue;default:if(!(t=_.trys,t=t.length>0&&t[t.length-1])&&(op[0]===6||op[0]===2)){_=0;continue}if(op[0]===3&&(!t||op[1]>t[0]&&op[1]<t[3])){_.label=op[1];break}if(op[0]===6&&_.label<t[1]){_.label=t[1];t=op;break}if(t&&_.label<t[2]){_.label=t[2];_.ops.push(op);break}if(t[2])_.ops.pop();_.trys.pop();continue}op=body.call(thisArg,_);}catch(e){op=[6,e];y=0;}finally{f=t=0;}if(op[0]&5)throw op[1];return {value:op[0]?op[1]:void 0,done:true}}};var ServerSentEventsTransport=function(){function ServerSentEventsTransport(httpClient,accessTokenFactory,logger,logMessageContent,eventSourceConstructor,withCredentials,headers){this.httpClient=httpClient;this.accessTokenFactory=accessTokenFactory;this.logger=logger;this.logMessageContent=logMessageContent;this.withCredentials=withCredentials;this.eventSourceConstructor=eventSourceConstructor;this.headers=headers;this.onreceive=null;this.onclose=null;}ServerSentEventsTransport.prototype.connect=function(url,transferFormat){return __awaiter(this,void 0,void 0,function(){var token;var _this=this;return __generator(this,function(_a){switch(_a.label){case 0:_Utils__WEBPACK_IMPORTED_MODULE_2__["Arg"].isRequired(url,"url");_Utils__WEBPACK_IMPORTED_MODULE_2__["Arg"].isRequired(transferFormat,"transferFormat");_Utils__WEBPACK_IMPORTED_MODULE_2__["Arg"].isIn(transferFormat,_ITransport__WEBPACK_IMPORTED_MODULE_1__["TransferFormat"],"transferFormat");this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Trace,"(SSE transport) Connecting.");this.url=url;if(!this.accessTokenFactory)return [3,2];return [4,this.accessTokenFactory()];case 1:token=_a.sent();if(token){url+=(url.indexOf("?")<0?"?":"&")+("access_token="+encodeURIComponent(token));}_a.label=2;case 2:return [2,new Promise(function(resolve,reject){var opened=false;if(transferFormat!==_ITransport__WEBPACK_IMPORTED_MODULE_1__["TransferFormat"].Text){reject(new Error("The Server-Sent Events transport only supports the 'Text' transfer format"));return}var eventSource;if(_Utils__WEBPACK_IMPORTED_MODULE_2__["Platform"].isBrowser||_Utils__WEBPACK_IMPORTED_MODULE_2__["Platform"].isWebWorker){eventSource=new _this.eventSourceConstructor(url,{withCredentials:_this.withCredentials});}else{var cookies=_this.httpClient.getCookieString(url);var headers={};headers.Cookie=cookies;var _a=Object(_Utils__WEBPACK_IMPORTED_MODULE_2__["getUserAgentHeader"])(),name_1=_a[0],value=_a[1];headers[name_1]=value;eventSource=new _this.eventSourceConstructor(url,{withCredentials:_this.withCredentials,headers:__assign({},headers,_this.headers)});}try{eventSource.onmessage=function(e){if(_this.onreceive){try{_this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Trace,"(SSE transport) data received. "+Object(_Utils__WEBPACK_IMPORTED_MODULE_2__["getDataDetail"])(e.data,_this.logMessageContent)+".");_this.onreceive(e.data);}catch(error){_this.close(error);return}}};eventSource.onerror=function(e){var error=new Error(e.data||"Error occurred");if(opened){_this.close(error);}else{reject(error);}};eventSource.onopen=function(){_this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Information,"SSE connected to "+_this.url);_this.eventSource=eventSource;opened=true;resolve();};}catch(e){reject(e);return}})]}})})};ServerSentEventsTransport.prototype.send=function(data){return __awaiter(this,void 0,void 0,function(){return __generator(this,function(_a){if(!this.eventSource){return [2,Promise.reject(new Error("Cannot send until the transport is connected"))]}return [2,Object(_Utils__WEBPACK_IMPORTED_MODULE_2__["sendMessage"])(this.logger,"SSE",this.httpClient,this.url,this.accessTokenFactory,data,this.logMessageContent,this.withCredentials,this.headers)]})})};ServerSentEventsTransport.prototype.stop=function(){this.close();return Promise.resolve()};ServerSentEventsTransport.prototype.close=function(e){if(this.eventSource){this.eventSource.close();this.eventSource=undefined;if(this.onclose){this.onclose(e);}}};return ServerSentEventsTransport}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"WebSocketTransport",function(){return WebSocketTransport});var _ILogger__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(8);var _ITransport__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(20);var _Utils__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(9);var __assign=Object.assign||function(t){for(var s,i=1,n=arguments.length;i<n;i++){s=arguments[i];for(var p in s)if(Object.prototype.hasOwnProperty.call(s,p))t[p]=s[p];}return t};var __awaiter=function(thisArg,_arguments,P,generator){return new(P||(P=Promise))(function(resolve,reject){function fulfilled(value){try{step(generator.next(value));}catch(e){reject(e);}}function rejected(value){try{step(generator["throw"](value));}catch(e){reject(e);}}function step(result){result.done?resolve(result.value):new P(function(resolve){resolve(result.value);}).then(fulfilled,rejected);}step((generator=generator.apply(thisArg,_arguments||[])).next());})};var __generator=function(thisArg,body){var _={label:0,sent:function(){if(t[0]&1)throw t[1];return t[1]},trys:[],ops:[]},f,y,t,g;return g={next:verb(0),throw:verb(1),return:verb(2)},typeof Symbol==="function"&&(g[Symbol.iterator]=function(){return this}),g;function verb(n){return function(v){return step([n,v])}}function step(op){if(f)throw new TypeError("Generator is already executing.");while(_)try{if(f=1,y&&(t=op[0]&2?y["return"]:op[0]?y["throw"]||((t=y["return"])&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;if(y=0,t)op=[op[0]&2,t.value];switch(op[0]){case 0:case 1:t=op;break;case 4:_.label++;return {value:op[1],done:false};case 5:_.label++;y=op[1];op=[0];continue;case 7:op=_.ops.pop();_.trys.pop();continue;default:if(!(t=_.trys,t=t.length>0&&t[t.length-1])&&(op[0]===6||op[0]===2)){_=0;continue}if(op[0]===3&&(!t||op[1]>t[0]&&op[1]<t[3])){_.label=op[1];break}if(op[0]===6&&_.label<t[1]){_.label=t[1];t=op;break}if(t&&_.label<t[2]){_.label=t[2];_.ops.push(op);break}if(t[2])_.ops.pop();_.trys.pop();continue}op=body.call(thisArg,_);}catch(e){op=[6,e];y=0;}finally{f=t=0;}if(op[0]&5)throw op[1];return {value:op[0]?op[1]:void 0,done:true}}};var WebSocketTransport=function(){function WebSocketTransport(httpClient,accessTokenFactory,logger,logMessageContent,webSocketConstructor,headers){this.logger=logger;this.accessTokenFactory=accessTokenFactory;this.logMessageContent=logMessageContent;this.webSocketConstructor=webSocketConstructor;this.httpClient=httpClient;this.onreceive=null;this.onclose=null;this.headers=headers;}WebSocketTransport.prototype.connect=function(url,transferFormat){return __awaiter(this,void 0,void 0,function(){var token;var _this=this;return __generator(this,function(_a){switch(_a.label){case 0:_Utils__WEBPACK_IMPORTED_MODULE_2__["Arg"].isRequired(url,"url");_Utils__WEBPACK_IMPORTED_MODULE_2__["Arg"].isRequired(transferFormat,"transferFormat");_Utils__WEBPACK_IMPORTED_MODULE_2__["Arg"].isIn(transferFormat,_ITransport__WEBPACK_IMPORTED_MODULE_1__["TransferFormat"],"transferFormat");this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Trace,"(WebSockets transport) Connecting.");if(!this.accessTokenFactory)return [3,2];return [4,this.accessTokenFactory()];case 1:token=_a.sent();if(token){url+=(url.indexOf("?")<0?"?":"&")+("access_token="+encodeURIComponent(token));}_a.label=2;case 2:return [2,new Promise(function(resolve,reject){url=url.replace(/^http/,"ws");var webSocket;var cookies=_this.httpClient.getCookieString(url);var opened=false;if(_Utils__WEBPACK_IMPORTED_MODULE_2__["Platform"].isNode){var headers={};var _a=Object(_Utils__WEBPACK_IMPORTED_MODULE_2__["getUserAgentHeader"])(),name_1=_a[0],value=_a[1];headers[name_1]=value;if(cookies){headers["Cookie"]=""+cookies;}webSocket=new _this.webSocketConstructor(url,undefined,{headers:__assign({},headers,_this.headers)});}if(!webSocket){webSocket=new _this.webSocketConstructor(url);}if(transferFormat===_ITransport__WEBPACK_IMPORTED_MODULE_1__["TransferFormat"].Binary){webSocket.binaryType="arraybuffer";}webSocket.onopen=function(_event){_this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Information,"WebSocket connected to "+url+".");_this.webSocket=webSocket;opened=true;resolve();};webSocket.onerror=function(event){var error=null;if(typeof ErrorEvent!=="undefined"&&event instanceof ErrorEvent){error=event.error;}else{error=new Error("There was an error with the transport.");}reject(error);};webSocket.onmessage=function(message){_this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Trace,"(WebSockets transport) data received. "+Object(_Utils__WEBPACK_IMPORTED_MODULE_2__["getDataDetail"])(message.data,_this.logMessageContent)+".");if(_this.onreceive){try{_this.onreceive(message.data);}catch(error){_this.close(error);return}}};webSocket.onclose=function(event){if(opened){_this.close(event);}else{var error=null;if(typeof ErrorEvent!=="undefined"&&event instanceof ErrorEvent){error=event.error;}else{error=new Error("There was an error with the transport.");}reject(error);}};})]}})})};WebSocketTransport.prototype.send=function(data){if(this.webSocket&&this.webSocket.readyState===this.webSocketConstructor.OPEN){this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Trace,"(WebSockets transport) sending data. "+Object(_Utils__WEBPACK_IMPORTED_MODULE_2__["getDataDetail"])(data,this.logMessageContent)+".");this.webSocket.send(data);return Promise.resolve()}return Promise.reject("WebSocket is not in the OPEN state")};WebSocketTransport.prototype.stop=function(){if(this.webSocket){this.close(undefined);}return Promise.resolve()};WebSocketTransport.prototype.close=function(event){if(this.webSocket){this.webSocket.onclose=function(){};this.webSocket.onmessage=function(){};this.webSocket.onerror=function(){};this.webSocket.close();this.webSocket=undefined;}this.logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_0__["LogLevel"].Trace,"(WebSockets transport) socket closed.");if(this.onclose){if(this.isCloseEvent(event)&&(event.wasClean===false||event.code!==1e3)){this.onclose(new Error("WebSocket closed with status code: "+event.code+" ("+event.reason+")."));}else if(event instanceof Error){this.onclose(event);}else{this.onclose();}}};WebSocketTransport.prototype.isCloseEvent=function(event){return event&&typeof event.wasClean==="boolean"&&typeof event.code==="number"};return WebSocketTransport}();},function(module,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__);__webpack_require__.d(__webpack_exports__,"JsonHubProtocol",function(){return JsonHubProtocol});var _IHubProtocol__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__(15);var _ILogger__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__(8);var _ITransport__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__(20);var _Loggers__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__(10);var _TextMessageFormat__WEBPACK_IMPORTED_MODULE_4__=__webpack_require__(14);var JSON_HUB_PROTOCOL_NAME="json";var JsonHubProtocol=function(){function JsonHubProtocol(){this.name=JSON_HUB_PROTOCOL_NAME;this.version=1;this.transferFormat=_ITransport__WEBPACK_IMPORTED_MODULE_2__["TransferFormat"].Text;}JsonHubProtocol.prototype.parseMessages=function(input,logger){if(typeof input!=="string"){throw new Error("Invalid input for JSON hub protocol. Expected a string.")}if(!input){return []}if(logger===null){logger=_Loggers__WEBPACK_IMPORTED_MODULE_3__["NullLogger"].instance;}var messages=_TextMessageFormat__WEBPACK_IMPORTED_MODULE_4__["TextMessageFormat"].parse(input);var hubMessages=[];for(var _i=0,messages_1=messages;_i<messages_1.length;_i++){var message=messages_1[_i];var parsedMessage=JSON.parse(message);if(typeof parsedMessage.type!=="number"){throw new Error("Invalid payload.")}switch(parsedMessage.type){case _IHubProtocol__WEBPACK_IMPORTED_MODULE_0__["MessageType"].Invocation:this.isInvocationMessage(parsedMessage);break;case _IHubProtocol__WEBPACK_IMPORTED_MODULE_0__["MessageType"].StreamItem:this.isStreamItemMessage(parsedMessage);break;case _IHubProtocol__WEBPACK_IMPORTED_MODULE_0__["MessageType"].Completion:this.isCompletionMessage(parsedMessage);break;case _IHubProtocol__WEBPACK_IMPORTED_MODULE_0__["MessageType"].Ping:break;case _IHubProtocol__WEBPACK_IMPORTED_MODULE_0__["MessageType"].Close:break;default:logger.log(_ILogger__WEBPACK_IMPORTED_MODULE_1__["LogLevel"].Information,"Unknown message type '"+parsedMessage.type+"' ignored.");continue}hubMessages.push(parsedMessage);}return hubMessages};JsonHubProtocol.prototype.writeMessage=function(message){return _TextMessageFormat__WEBPACK_IMPORTED_MODULE_4__["TextMessageFormat"].write(JSON.stringify(message))};JsonHubProtocol.prototype.isInvocationMessage=function(message){this.assertNotEmptyString(message.target,"Invalid payload for Invocation message.");if(message.invocationId!==undefined){this.assertNotEmptyString(message.invocationId,"Invalid payload for Invocation message.");}};JsonHubProtocol.prototype.isStreamItemMessage=function(message){this.assertNotEmptyString(message.invocationId,"Invalid payload for StreamItem message.");if(message.item===undefined){throw new Error("Invalid payload for StreamItem message.")}};JsonHubProtocol.prototype.isCompletionMessage=function(message){if(message.result&&message.error){throw new Error("Invalid payload for Completion message.")}if(!message.result&&message.error){this.assertNotEmptyString(message.error,"Invalid payload for Completion message.");}this.assertNotEmptyString(message.invocationId,"Invalid payload for Completion message.");};JsonHubProtocol.prototype.assertNotEmptyString=function(value,errorMessage){if(typeof value!=="string"||value===""){throw new Error(errorMessage)}};return JsonHubProtocol}();}])});
    //# sourceMappingURL=signalr.min.js.map
    });

    unwrapExports(signalr_min);

    monaco.languages.register({ id: "carlang" });
    monaco.languages.setMonarchTokensProvider("carlang", tokenizer);
    monaco.editor.defineTheme("carlangTheme", theme);

    const app = new App({
      target: document.body
    });

    var connection = new signalR.HubConnectionBuilder().withUrl("/project").withAutomaticReconnect().build();
    connection.on("ReceiveMessage", function (data) {
      log(data);
    });
    connection.on("ModuleChanged", function (ns) {
      log("Module Changed: " + ns);
    });

    let timeout;
    connection.on("ProjectChanged", function (directoryInterator) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        log("Project Changed, updating navigation pane");
        setDirectoryInterator(directoryInterator);
      }, 500);
    });
    connection.start().then(() => {
      // init application after connection to hub is established
      loadProjects();
      loadLastProject();
    });

    // init the key trapping
    init$2();
    init$1();

    return app;

}());
//# sourceMappingURL=bundle.js.map
