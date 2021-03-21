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
    function element(name) {
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
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
    const { navigate } = globalHistory;

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

    /* src\Components\TabControl\Tabs.svelte generated by Svelte v3.16.7 */
    const file = "src\\Components\\TabControl\\Tabs.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "tabs svelte-8bxw33");
    			add_location(div, file, 60, 0, 1580);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const TABS = {};

    function instance$2($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Components\TabControl\TabList.svelte generated by Svelte v3.16.7 */

    const file$1 = "src\\Components\\TabControl\\TabList.svelte";

    function create_fragment$3(ctx) {
    	let div0;
    	let t;
    	let div1;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			t = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "tab-list svelte-zvi86r");
    			add_location(div0, file$1, 0, 0, 0);
    			attr_dev(div1, "class", "tab-list--sep svelte-zvi86r");
    			add_location(div1, file$1, 4, 0, 48);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TabList",
    			options,
    			id: create_fragment$3.name
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

    function create_fragment$4(ctx) {
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TabPanel",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Components\TabControl\Tab.svelte generated by Svelte v3.16.7 */
    const file$2 = "src\\Components\\TabControl\\Tab.svelte";

    function create_fragment$5(ctx) {
    	let button;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", "svelte-faqw6y");
    			toggle_class(button, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
    			add_location(button, file$2, 10, 0, 212);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tab",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\Components\Panel.svelte generated by Svelte v3.16.7 */

    const file$3 = "src\\Components\\Panel.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "panel svelte-5yb82o");
    			attr_dev(div, "style", /*style*/ ctx[0]);
    			add_location(div, file$3, 3, 0, 55);
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { style: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Panel",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get style() {
    		throw new Error("<Panel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Panel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\Modal.svelte generated by Svelte v3.16.7 */
    const file$4 = "src\\Components\\Modal.svelte";

    function create_fragment$7(ctx) {
    	let div0;
    	let t0;
    	let div3;
    	let div1;
    	let t1;
    	let t2;
    	let i;
    	let t3;
    	let div2;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div3 = element("div");
    			div1 = element("div");
    			t1 = text(/*title*/ ctx[0]);
    			t2 = space();
    			i = element("i");
    			t3 = space();
    			div2 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div0, "class", "background svelte-1i75uiy");
    			toggle_class(div0, "show", /*show*/ ctx[1]);
    			add_location(div0, file$4, 7, 0, 181);
    			attr_dev(i, "class", "fa fa-times svelte-1i75uiy");
    			add_location(i, file$4, 12, 8, 304);
    			attr_dev(div1, "class", "title svelte-1i75uiy");
    			add_location(div1, file$4, 10, 4, 258);
    			attr_dev(div2, "class", "content svelte-1i75uiy");
    			add_location(div2, file$4, 15, 4, 382);
    			attr_dev(div3, "class", "modal svelte-1i75uiy");
    			toggle_class(div3, "show", /*show*/ ctx[1]);
    			add_location(div3, file$4, 9, 0, 222);
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

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 8) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[3], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null));
    			}

    			if (dirty & /*show*/ 2) {
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { title = "Unknown Modal" } = $$props;
    	let { show = false } = $$props;

    	let { close = () => {
    		
    	} } = $$props;

    	const writable_props = ["title", "show", "close"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("show" in $$props) $$invalidate(1, show = $$props.show);
    		if ("close" in $$props) $$invalidate(2, close = $$props.close);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { title, show, close };
    	};

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("show" in $$props) $$invalidate(1, show = $$props.show);
    		if ("close" in $$props) $$invalidate(2, close = $$props.close);
    	};

    	return [title, show, close, $$scope, $$slots];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { title: 0, show: 1, close: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$7.name
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
    }

    /* src\Components\PageViewer.svelte generated by Svelte v3.16.7 */
    const file$5 = "src\\Components\\PageViewer.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "page-wrapper svelte-1gvqsf5");
    			add_location(div, file$5, 34, 0, 1011);
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
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let pageWrapper;

    	function resize() {
    		if (!pageWrapper) return;
    		var scaleX = pageWrapper.clientWidth / 900;
    		var height = pageWrapper.parentElement.clientHeight;

    		if (scaleX < 1.5) {
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
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PageViewer",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    var fetcher = writable(false);
    var manageResult = function (response, isText) {
        if (isText === void 0) { isText = false; }
        return __awaiter(void 0, void 0, void 0, function () {
            var clone, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fetcher.set(false);
                        clone = response.clone();
                        if (response.status === 401) ;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        if (!isText) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.text()];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [4 /*yield*/, response.json()];
                    case 4: 
                    // try to parse the json result
                    return [2 /*return*/, _a.sent()];
                    case 5:
                        err_1 = _a.sent();
                        return [2 /*return*/, clone.text()];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    var post = function (url, data) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    fetcher.set(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    _a = manageResult;
                    return [4 /*yield*/, fetch(url, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: data ? JSON.stringify(data) : null
                        })];
                case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                case 3:
                    err_2 = _b.sent();
                    fetcher.set(false);
                    console.log("ERROR:");
                    console.log(err_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var get = function (url) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, err_5;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    fetcher.set(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    _a = manageResult;
                    return [4 /*yield*/, fetch(url)];
                case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                case 3:
                    err_5 = _b.sent();
                    fetcher.set(false);
                    console.log(err_5);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    //# sourceMappingURL=http.js.map

    const moduleStore = writable({
        modules: []
    });

    const reset = () => {
        moduleStore.update(() => {
            return { modules: [] };
        });
    };

    const selectModuleByNamespace = async namespace => {
        if (!namespace) return;
        let result = await getModuleText(namespace);
        let text = result.text;
        let compilationResult = result.compilationResult;
        moduleStore.update(s => {
            var m = { namespace, text, compilationResult };
            let modules = (s || {}).modules || {};
            modules[namespace] = m;

            return {
                ...s,
                selectedModule: namespace,
                modules
            };
        });

    };

    const selectModule = async module => {
        if (!module || !module.namespace) return;
        let result = await getModuleText(module.namespace);
        let text = result.text;
        let compilationResult = result.compilationResult;
        moduleStore.update(s => {
            var nm = ((s || {}).modules || {})[module.namespace] || module;
            var m = { ...nm, text, compilationResult };
            let modules = (s || {}).modules || {};
            modules[module.namespace] = m;

            return {
                ...s,
                selectedModule: module.namespace,
                modules
            };
        });
    };

    const parseCode = async (module, code) => {

        if (!module || !module.namespace || !code) {
            console.log("Invalid \"Parse Code\"", module, code);

            return;
        }
        var compilationResult = await post("/document/" + module.namespace, { code });

        moduleStore.update(s => {
            let m = { ...module, compilationResult };
            let modules = { ...s.modules, [module.namespace]: m };
            return {
                ...s,
                modules
            };
        });
    };

    const getModuleText = async (namespace) => {
        if (!namespace) return;
        var encodedURI = encodeURI(namespace);
        var url = `/document/${encodedURI}`;
        var result = await get(url);

        return result;
    };

    var stateStore = writable({});
    var toggleAddFileDialog = function () {
        stateStore.update(function (s) { return (__assign(__assign({}, s), { showAddFileDialog: !!!s.showAddFileDialog })); });
    };
    var toggleAddApplicationDialog = function () {
        stateStore.update(function (s) { return (__assign(__assign({}, s), { showAddApplicationDialog: !!!s.showAddApplicationDialog })); });
    };
    var selectApplication = function (app) {
        var appJson = localStorage.getItem("applications");
        if (appJson != null) {
            var applications = JSON.parse(appJson).filter(function (a) { return a != app; });
            applications.unshift(app);
            localStorage.setItem("applications", JSON.stringify(applications));
        }
        stateStore.update(function (s) { return (__assign(__assign({}, s), { application: app })); });
    };
    var setFiles = function (_a) {
        var rootPath = _a.rootPath, dir = _a.dir;
        var sts = get_store_value(stateStore);
        if (rootPath != sts.application) {
            navigate("/home");
            reset();
        }
        setTimeout(function () {
            stateStore.update(function (s) { return (__assign(__assign({}, s), { files: dir })); });
        });
    };
    //# sourceMappingURL=state.js.map

    /* src\Components\FileExplorer\Application.svelte generated by Svelte v3.16.7 */
    const file$6 = "src\\Components\\FileExplorer\\Application.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (36:0) {#if application}
    function create_if_block$2(ctx) {
    	let div;
    	let title;
    	let i;
    	let t0_value = /*application*/ ctx[1].name + "";
    	let t0;
    	let t1;
    	let dispose;
    	let if_block = /*selectedApplication*/ ctx[0] === /*application*/ ctx[1].namespace && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			title = element("title");
    			i = element("i");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(i, "class", "fa fa-institution svelte-1rcx9b2");
    			add_location(i, file$6, 38, 13, 1204);
    			attr_dev(title, "class", "svelte-1rcx9b2");
    			add_location(title, file$6, 37, 8, 1154);
    			attr_dev(div, "class", "application svelte-1rcx9b2");
    			add_location(div, file$6, 36, 4, 1119);
    			dispose = listen_dev(title, "click", /*selectApplication*/ ctx[8], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, title);
    			append_dev(title, i);
    			append_dev(title, t0);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*application*/ 2 && t0_value !== (t0_value = /*application*/ ctx[1].name + "")) set_data_dev(t0, t0_value);

    			if (/*selectedApplication*/ ctx[0] === /*application*/ ctx[1].namespace) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
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
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(36:0) {#if application}",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if selectedApplication === application.namespace}
    function create_if_block_1$1(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let if_block0 = /*components*/ ctx[6].length > 0 && create_if_block_5(ctx);
    	let if_block1 = /*endpoints*/ ctx[5].length > 0 && create_if_block_4(ctx);
    	let if_block2 = /*features*/ ctx[3].length > 0 && create_if_block_3(ctx);
    	let if_block3 = /*databases*/ ctx[4].length > 0 && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			attr_dev(div, "class", "application--details svelte-1rcx9b2");
    			add_location(div, file$6, 40, 12, 1336);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    			append_dev(div, t2);
    			if (if_block3) if_block3.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*components*/ ctx[6].length > 0) if_block0.p(ctx, dirty);
    			if (/*endpoints*/ ctx[5].length > 0) if_block1.p(ctx, dirty);
    			if (/*features*/ ctx[3].length > 0) if_block2.p(ctx, dirty);
    			if (/*databases*/ ctx[4].length > 0) if_block3.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(40:8) {#if selectedApplication === application.namespace}",
    		ctx
    	});

    	return block;
    }

    // (42:16) {#if components.length > 0}
    function create_if_block_5(ctx) {
    	let h2;
    	let t1;
    	let each_1_anchor;
    	let each_value_3 = /*components*/ ctx[6];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Components";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h2, "class", "svelte-1rcx9b2");
    			add_location(h2, file$6, 42, 20, 1437);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*components, $moduleStore, onClick*/ 196) {
    				each_value_3 = /*components*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(42:16) {#if components.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (44:20) {#each components as node}
    function create_each_block_3(ctx) {
    	let div;
    	let i;
    	let t0_value = /*node*/ ctx[10].name + "";
    	let t0;
    	let t1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(i, "class", "fa fa-cogs svelte-1rcx9b2");
    			add_location(i, file$6, 49, 28, 1797);
    			attr_dev(div, "class", "item item--node svelte-1rcx9b2");
    			toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			add_location(div, file$6, 44, 24, 1530);
    			dispose = listen_dev(div, "click", /*onClick*/ ctx[7](/*node*/ ctx[10]), false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*components, $moduleStore*/ 68) {
    				toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(44:20) {#each components as node}",
    		ctx
    	});

    	return block;
    }

    // (55:16) {#if endpoints.length > 0}
    function create_if_block_4(ctx) {
    	let h2;
    	let t1;
    	let each_1_anchor;
    	let each_value_2 = /*endpoints*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Endpoints";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h2, "class", "svelte-1rcx9b2");
    			add_location(h2, file$6, 55, 20, 1984);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*endpoints, $moduleStore, onClick*/ 164) {
    				each_value_2 = /*endpoints*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(55:16) {#if endpoints.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (57:20) {#each endpoints as node}
    function create_each_block_2(ctx) {
    	let div;
    	let i;
    	let t0_value = /*node*/ ctx[10].name + "";
    	let t0;
    	let t1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(i, "class", "fa fa-envelope svelte-1rcx9b2");
    			add_location(i, file$6, 62, 28, 2342);
    			attr_dev(div, "class", "item item--node svelte-1rcx9b2");
    			toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			add_location(div, file$6, 57, 24, 2075);
    			dispose = listen_dev(div, "click", /*onClick*/ ctx[7](/*node*/ ctx[10]), false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*endpoints, $moduleStore*/ 36) {
    				toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(57:20) {#each endpoints as node}",
    		ctx
    	});

    	return block;
    }

    // (68:16) {#if features.length > 0}
    function create_if_block_3(ctx) {
    	let h2;
    	let t1;
    	let each_1_anchor;
    	let each_value_1 = /*features*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Features";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h2, "class", "svelte-1rcx9b2");
    			add_location(h2, file$6, 68, 20, 2532);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*features, $moduleStore, onClick*/ 140) {
    				each_value_1 = /*features*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(68:16) {#if features.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (70:20) {#each features as node}
    function create_each_block_1(ctx) {
    	let div;
    	let i;
    	let t0_value = /*node*/ ctx[10].name + "";
    	let t0;
    	let t1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(i, "class", "fa fa-diamond svelte-1rcx9b2");
    			add_location(i, file$6, 75, 28, 2888);
    			attr_dev(div, "class", "item item--node svelte-1rcx9b2");
    			toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			add_location(div, file$6, 70, 24, 2621);
    			dispose = listen_dev(div, "click", /*onClick*/ ctx[7](/*node*/ ctx[10]), false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*features, $moduleStore*/ 12) {
    				toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(70:20) {#each features as node}",
    		ctx
    	});

    	return block;
    }

    // (81:16) {#if databases.length > 0}
    function create_if_block_2(ctx) {
    	let h2;
    	let t1;
    	let each_1_anchor;
    	let each_value = /*databases*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Databases";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h2, "class", "svelte-1rcx9b2");
    			add_location(h2, file$6, 81, 20, 3078);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*databases, $moduleStore, onClick*/ 148) {
    				each_value = /*databases*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
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
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(81:16) {#if databases.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (83:20) {#each databases as node}
    function create_each_block(ctx) {
    	let div;
    	let i;
    	let t0_value = /*node*/ ctx[10].name + "";
    	let t0;
    	let t1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(i, "class", "fa fa-database svelte-1rcx9b2");
    			add_location(i, file$6, 88, 28, 3436);
    			attr_dev(div, "class", "item item--node svelte-1rcx9b2");
    			toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			add_location(div, file$6, 83, 24, 3169);
    			dispose = listen_dev(div, "click", /*onClick*/ ctx[7](/*node*/ ctx[10]), false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*databases, $moduleStore*/ 20) {
    				toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(83:20) {#each databases as node}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let if_block_anchor;
    	let if_block = /*application*/ ctx[1] && create_if_block$2(ctx);

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
    			if (/*application*/ ctx[1]) {
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $moduleStore;
    	validate_store(moduleStore, "moduleStore");
    	component_subscribe($$self, moduleStore, $$value => $$invalidate(2, $moduleStore = $$value));
    	let { application = null } = $$props;
    	let { selectedApplication = null } = $$props;
    	let f = n => (application.modules || []).filter(m => m.fileType === n);
    	let features = f("Feature");
    	let databases = f("Database");
    	let endpoints = f("Endpoint");
    	let components = f("Component");

    	let onClick = module => () => {
    		let path = "/editor/" + module.namespace;
    		navigate(path);
    		selectModule(module);
    	};

    	let selectApplication = () => {
    		if (selectedApplication) $$invalidate(0, selectedApplication = null); else {
    			$$invalidate(0, selectedApplication = application.namespace);
    		}
    	};

    	moduleStore.subscribe(s => {
    		if (application && s && s.selectedModule) {
    			if (s.selectedModule.indexOf(application.namespace) === 0) {
    				$$invalidate(0, selectedApplication = application.namespace);
    			}
    		}
    	});

    	const writable_props = ["application", "selectedApplication"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Application> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("application" in $$props) $$invalidate(1, application = $$props.application);
    		if ("selectedApplication" in $$props) $$invalidate(0, selectedApplication = $$props.selectedApplication);
    	};

    	$$self.$capture_state = () => {
    		return {
    			application,
    			selectedApplication,
    			f,
    			features,
    			databases,
    			endpoints,
    			components,
    			onClick,
    			selectApplication,
    			$moduleStore
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("application" in $$props) $$invalidate(1, application = $$props.application);
    		if ("selectedApplication" in $$props) $$invalidate(0, selectedApplication = $$props.selectedApplication);
    		if ("f" in $$props) f = $$props.f;
    		if ("features" in $$props) $$invalidate(3, features = $$props.features);
    		if ("databases" in $$props) $$invalidate(4, databases = $$props.databases);
    		if ("endpoints" in $$props) $$invalidate(5, endpoints = $$props.endpoints);
    		if ("components" in $$props) $$invalidate(6, components = $$props.components);
    		if ("onClick" in $$props) $$invalidate(7, onClick = $$props.onClick);
    		if ("selectApplication" in $$props) $$invalidate(8, selectApplication = $$props.selectApplication);
    		if ("$moduleStore" in $$props) moduleStore.set($moduleStore = $$props.$moduleStore);
    	};

    	return [
    		selectedApplication,
    		application,
    		$moduleStore,
    		features,
    		databases,
    		endpoints,
    		components,
    		onClick,
    		selectApplication
    	];
    }

    class Application extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { application: 1, selectedApplication: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Application",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get application() {
    		throw new Error("<Application>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set application(value) {
    		throw new Error("<Application>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selectedApplication() {
    		throw new Error("<Application>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedApplication(value) {
    		throw new Error("<Application>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\FileExplorer\FileExplorer.svelte generated by Svelte v3.16.7 */
    const file$7 = "src\\Components\\FileExplorer\\FileExplorer.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (20:4) {#each applications as application}
    function create_each_block$1(ctx) {
    	let updating_selectedApplication;
    	let current;

    	function application_selectedApplication_binding(value) {
    		/*application_selectedApplication_binding*/ ctx[2].call(null, value);
    	}

    	let application_props = { application: /*application*/ ctx[3] };

    	if (/*selectedApplication*/ ctx[1] !== void 0) {
    		application_props.selectedApplication = /*selectedApplication*/ ctx[1];
    	}

    	const application = new Application({ props: application_props, $$inline: true });
    	binding_callbacks.push(() => bind(application, "selectedApplication", application_selectedApplication_binding));

    	const block = {
    		c: function create() {
    			create_component(application.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(application, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const application_changes = {};
    			if (dirty & /*applications*/ 1) application_changes.application = /*application*/ ctx[3];

    			if (!updating_selectedApplication && dirty & /*selectedApplication*/ 2) {
    				updating_selectedApplication = true;
    				application_changes.selectedApplication = /*selectedApplication*/ ctx[1];
    				add_flush_callback(() => updating_selectedApplication = false);
    			}

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
    			destroy_component(application, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(20:4) {#each applications as application}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div;
    	let current;
    	let each_value = /*applications*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "file-explorer svelte-1d6hip2");
    			add_location(div, file$7, 18, 0, 499);
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
    			if (dirty & /*applications, selectedApplication*/ 3) {
    				each_value = /*applications*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	var applications = [];
    	var selectedApplication = null;

    	stateStore.subscribe(({ files = {} }) => {
    		$$invalidate(0, applications = []);

    		setTimeout(() => {
    			$$invalidate(0, applications = files.applications || []);
    		});
    	});

    	function application_selectedApplication_binding(value) {
    		selectedApplication = value;
    		$$invalidate(1, selectedApplication);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("applications" in $$props) $$invalidate(0, applications = $$props.applications);
    		if ("selectedApplication" in $$props) $$invalidate(1, selectedApplication = $$props.selectedApplication);
    	};

    	return [applications, selectedApplication, application_selectedApplication_binding];
    }

    class FileExplorer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FileExplorer",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\Components\Editor.svelte generated by Svelte v3.16.7 */

    const { console: console_1 } = globals;
    const file$8 = "src\\Components\\Editor.svelte";

    function create_fragment$b(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "editor svelte-1dng18m");
    			attr_dev(div, "id", /*id*/ ctx[1]);
    			add_location(div, file$8, 147, 0, 4941);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[15](div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[15](null);
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
    	const dispatch = createEventDispatcher();

    	let { onKeyPress = () => {
    		
    	} } = $$props;

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
    		$$invalidate(9, editor = monaco.editor.create(document.getElementById(id), {
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

    		$$invalidate(9, editor.dragAndDrop = false, editor);
    		window.addEventListener("keydown", keyTrap, true);

    		editor.onMouseDown(function (e) {
    			if (e.event.ctrlKey && e.event.leftButton) {
    				var word = editor.getModel().getWordAtPosition(e.target.position);
    				onKeyPress(word);
    			}
    		});

    		editor.onDidChangeModelContent(function (e) {
    			if (timeout) clearTimeout(timeout);

    			timeout = setTimeout(
    				() => {
    					dispatch("change", editor.getValue());
    				},
    				200
    			);
    		});
    	};

    	onMount(() => {
    		initEditor();

    		var ro = new ResizeObserver(() => {
    				editor.layout();
    			});

    		ro.observe(editorContainer);
    	});

    	onDestroy(() => {
    		window.removeEventListener("keydown", keyTrap, true);
    	});

    	function keyTrap(e) {
    		if (editor.hasTextFocus()) {
    			if ((e.ctrlKey === true || e.metaKey == true) && e.key == "s") {
    				dispatch("save", editor.getValue());
    				onKeyPress(e, editor.getValue());
    				e.preventDefault();
    				return false;
    			} else if (language === "carlang" && e.key == "F2") {
    				var wordUnderCursor = editor.getModel().getWordAtPosition(editor.getPosition());

    				if (wordUnderCursor && wordUnderCursor.word) {
    					console.log(wordUnderCursor.word);
    				}
    			}
    		}
    	}

    	const writable_props = ["onKeyPress", "text", "language", "theme", "wordWrap", "markers", "context"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, editorContainer = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("onKeyPress" in $$props) $$invalidate(2, onKeyPress = $$props.onKeyPress);
    		if ("text" in $$props) $$invalidate(3, text = $$props.text);
    		if ("language" in $$props) $$invalidate(4, language = $$props.language);
    		if ("theme" in $$props) $$invalidate(5, theme = $$props.theme);
    		if ("wordWrap" in $$props) $$invalidate(6, wordWrap = $$props.wordWrap);
    		if ("markers" in $$props) $$invalidate(7, markers = $$props.markers);
    		if ("context" in $$props) $$invalidate(8, context = $$props.context);
    	};

    	$$self.$capture_state = () => {
    		return {
    			onKeyPress,
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
    		if ("onKeyPress" in $$props) $$invalidate(2, onKeyPress = $$props.onKeyPress);
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("editor" in $$props) $$invalidate(9, editor = $$props.editor);
    		if ("text" in $$props) $$invalidate(3, text = $$props.text);
    		if ("language" in $$props) $$invalidate(4, language = $$props.language);
    		if ("theme" in $$props) $$invalidate(5, theme = $$props.theme);
    		if ("wordWrap" in $$props) $$invalidate(6, wordWrap = $$props.wordWrap);
    		if ("markers" in $$props) $$invalidate(7, markers = $$props.markers);
    		if ("context" in $$props) $$invalidate(8, context = $$props.context);
    		if ("f" in $$props) f = $$props.f;
    		if ("editorContainer" in $$props) $$invalidate(0, editorContainer = $$props.editorContainer);
    		if ("timeout" in $$props) timeout = $$props.timeout;
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*language, editor*/ 528) {
    			 if (language) {
    				(() => {
    					if (!editor) return;
    					monaco.editor.setModelLanguage(editor.getModel(), language);
    				})();
    			}
    		}

    		if ($$self.$$.dirty & /*text, editor*/ 520) {
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
    		onKeyPress,
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
    		keyTrap,
    		div_binding
    	];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
    			onKeyPress: 2,
    			text: 3,
    			language: 4,
    			theme: 5,
    			wordWrap: 6,
    			markers: 7,
    			context: 8
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$b.name
    		});
    	}

    	get onKeyPress() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onKeyPress(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
    const file$9 = "src\\Components\\DocumentEditor.svelte";

    function create_fragment$c(ctx) {
    	let div2;
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

    	editor.$on("save", /*onSave*/ ctx[5]);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			create_component(editor.$$.fragment);
    			attr_dev(div0, "class", "header svelte-16kv4ro");
    			add_location(div0, file$9, 57, 4, 2188);
    			attr_dev(div1, "class", "editor svelte-16kv4ro");
    			add_location(div1, file$9, 61, 4, 2297);
    			attr_dev(div2, "class", "container svelte-16kv4ro");
    			add_location(div2, file$9, 56, 0, 2159);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			mount_component(editor, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*module*/ 2) && t0_value !== (t0_value = (/*module*/ ctx[1]
    			? /*module*/ ctx[1].namespace || /*module*/ ctx[1].path
    			: "unknown file") + "")) set_data_dev(t0, t0_value);

    			const editor_changes = {};
    			if (dirty & /*context*/ 1) editor_changes.context = /*context*/ ctx[0];
    			if (dirty & /*text*/ 4) editor_changes.text = /*text*/ ctx[2];
    			if (dirty & /*type*/ 8) editor_changes.language = /*type*/ ctx[3];
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
    			if (detaching) detach_dev(div2);
    			destroy_component(editor);
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
    	var __awaiter = this && this.__awaiter || (function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	});

    	let { context = [] } = $$props;
    	let module;
    	let text = "";
    	let type = "carlang";
    	let markers = writable([]);

    	let onSave = event => __awaiter(void 0, void 0, void 0, function* () {
    		if (!module || !event) return;
    		let code = event.detail;
    		parseCode(module, code);
    	});

    	let mapErrorToken = e => {
    		return {
    			startLineNumber: e.sourceSegment.lineStart + 1,
    			endLineNumber: e.sourceSegment.lineEnd + 1,
    			startColumn: e.sourceSegment.columnStart + 1,
    			endColumn: e.sourceSegment.columnEnd + 1,
    			message: e.message
    		};
    	};

    	moduleStore.subscribe(value => {
    		var _a;
    		if (!value || !value.modules || !value.selectedModule) return;
    		$$invalidate(1, module = value.modules[value.selectedModule]);

    		if (!module) {
    			$$invalidate(2, text = "");
    			markers.set([]);
    			return;
    		}

    		$$invalidate(2, text = module.text);

    		var errors = ((_a = module.compilationResult) === null || _a === void 0
    		? void 0
    		: _a.errors) || [];

    		var mappedErrors = errors.map(mapErrorToken);
    		markers.set(mappedErrors);

    		if (module && module.path && module.path.endsWith(".json")) {
    			$$invalidate(3, type = "json");
    			$$invalidate(2, text = JSON.stringify(JSON.parse(text), null, 4));
    		} else {
    			$$invalidate(3, type = "carlang");
    		}
    	});

    	const writable_props = ["context"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DocumentEditor> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("context" in $$props) $$invalidate(0, context = $$props.context);
    	};

    	$$self.$capture_state = () => {
    		return {
    			__awaiter,
    			context,
    			module,
    			text,
    			type,
    			markers,
    			onSave,
    			mapErrorToken
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("context" in $$props) $$invalidate(0, context = $$props.context);
    		if ("module" in $$props) $$invalidate(1, module = $$props.module);
    		if ("text" in $$props) $$invalidate(2, text = $$props.text);
    		if ("type" in $$props) $$invalidate(3, type = $$props.type);
    		if ("markers" in $$props) $$invalidate(4, markers = $$props.markers);
    		if ("onSave" in $$props) $$invalidate(5, onSave = $$props.onSave);
    		if ("mapErrorToken" in $$props) mapErrorToken = $$props.mapErrorToken;
    	};

    	return [context, module, text, type, markers, onSave];
    }

    class DocumentEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { context: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DocumentEditor",
    			options,
    			id: create_fragment$c.name
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
    const file$a = "src\\Pages\\EditorPage.svelte";

    // (68:16) <Tab>
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
    		source: "(68:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (69:16) <Tab>
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
    		source: "(69:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (70:16) <Tab>
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
    		source: "(70:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (71:16) <Tab>
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
    		source: "(71:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (67:12) <TabList>
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

    			if (dirty & /*$$scope*/ 16384) {
    				tab0_changes.$$scope = { dirty, ctx };
    			}

    			tab0.$set(tab0_changes);
    			const tab1_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				tab1_changes.$$scope = { dirty, ctx };
    			}

    			tab1.$set(tab1_changes);
    			const tab2_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				tab2_changes.$$scope = { dirty, ctx };
    			}

    			tab2.$set(tab2_changes);
    			const tab3_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
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
    		source: "(67:12) <TabList>",
    		ctx
    	});

    	return block;
    }

    // (75:16) {#if htmlUrl}
    function create_if_block_3$1(ctx) {
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

    			if (dirty & /*$$scope, htmlUrl, iframe*/ 16401) {
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
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(75:16) {#if htmlUrl}",
    		ctx
    	});

    	return block;
    }

    // (78:24) <PageViewer>
    function create_default_slot_9(ctx) {
    	let iframe_1;
    	let iframe_1_src_value;

    	const block = {
    		c: function create() {
    			iframe_1 = element("iframe");
    			attr_dev(iframe_1, "class", "html-iframe svelte-1pwsn1t");
    			if (iframe_1.src !== (iframe_1_src_value = /*htmlUrl*/ ctx[4])) attr_dev(iframe_1, "src", iframe_1_src_value);
    			attr_dev(iframe_1, "title", "Page");
    			add_location(iframe_1, file$a, 79, 28, 2898);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, iframe_1, anchor);
    			/*iframe_1_binding*/ ctx[13](iframe_1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*htmlUrl*/ 16 && iframe_1.src !== (iframe_1_src_value = /*htmlUrl*/ ctx[4])) {
    				attr_dev(iframe_1, "src", iframe_1_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(iframe_1);
    			/*iframe_1_binding*/ ctx[13](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(78:24) <PageViewer>",
    		ctx
    	});

    	return block;
    }

    // (76:20) <Panel                          style="background:var(--color-1); overflow:hidden!important; height: calc(100% - 3rem); margin-top: 2.5rem; padding: 2rem 0 2rem 0;">
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

    			if (dirty & /*$$scope, htmlUrl, iframe*/ 16401) {
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
    		source: "(76:20) <Panel                          style=\\\"background:var(--color-1); overflow:hidden!important; height: calc(100% - 3rem); margin-top: 2.5rem; padding: 2rem 0 2rem 0;\\\">",
    		ctx
    	});

    	return block;
    }

    // (74:12) <TabPanel>
    function create_default_slot_7(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*htmlUrl*/ ctx[4] && create_if_block_3$1(ctx);

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
    			if (/*htmlUrl*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_3$1(ctx);
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
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(74:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (92:20) {#if svgUrl}
    function create_if_block_2$1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "alt", "svg");
    			if (img.src !== (img_src_value = /*componentUrl*/ ctx[2])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-1pwsn1t");
    			add_location(img, file$a, 92, 24, 3384);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*componentUrl*/ 4 && img.src !== (img_src_value = /*componentUrl*/ ctx[2])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(92:20) {#if svgUrl}",
    		ctx
    	});

    	return block;
    }

    // (91:16) <Panel style="height: calc(100% - 3rem); overflow:auto;">
    function create_default_slot_6(ctx) {
    	let if_block_anchor;
    	let if_block = /*svgUrl*/ ctx[1] && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*svgUrl*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(91:16) <Panel style=\\\"height: calc(100% - 3rem); overflow:auto;\\\">",
    		ctx
    	});

    	return block;
    }

    // (90:12) <TabPanel>
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

    			if (dirty & /*$$scope, svgUrl, componentUrl*/ 16390) {
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
    		source: "(90:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (100:20) {#if svgUrl}
    function create_if_block_1$2(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "alt", "svg");
    			if (img.src !== (img_src_value = /*svgUrl*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-1pwsn1t");
    			add_location(img, file$a, 100, 24, 3659);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*svgUrl*/ 2 && img.src !== (img_src_value = /*svgUrl*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(100:20) {#if svgUrl}",
    		ctx
    	});

    	return block;
    }

    // (99:16) <Panel style="height: calc(100% - 3rem); overflow:auto;">
    function create_default_slot_4(ctx) {
    	let if_block_anchor;
    	let if_block = /*svgUrl*/ ctx[1] && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*svgUrl*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
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
    		source: "(99:16) <Panel style=\\\"height: calc(100% - 3rem); overflow:auto;\\\">",
    		ctx
    	});

    	return block;
    }

    // (98:12) <TabPanel>
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

    			if (dirty & /*$$scope, svgUrl*/ 16386) {
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
    		source: "(98:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (108:20) {#if planningSvgUrl}
    function create_if_block$3(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			set_style(img, "min-width", "100%");
    			attr_dev(img, "alt", "svg");
    			if (img.src !== (img_src_value = /*planningSvgUrl*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-1pwsn1t");
    			add_location(img, file$a, 108, 24, 3936);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*planningSvgUrl*/ 8 && img.src !== (img_src_value = /*planningSvgUrl*/ ctx[3])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(108:20) {#if planningSvgUrl}",
    		ctx
    	});

    	return block;
    }

    // (107:16) <Panel style="height: calc(100% - 3rem); overflow:auto;">
    function create_default_slot_2(ctx) {
    	let if_block_anchor;
    	let if_block = /*planningSvgUrl*/ ctx[3] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*planningSvgUrl*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
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
    		source: "(107:16) <Panel style=\\\"height: calc(100% - 3rem); overflow:auto;\\\">",
    		ctx
    	});

    	return block;
    }

    // (106:12) <TabPanel>
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

    			if (dirty & /*$$scope, planningSvgUrl*/ 16392) {
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
    		source: "(106:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (66:8) <Tabs>
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

    			if (dirty & /*$$scope*/ 16384) {
    				tablist_changes.$$scope = { dirty, ctx };
    			}

    			tablist.$set(tablist_changes);
    			const tabpanel0_changes = {};

    			if (dirty & /*$$scope, htmlUrl, iframe*/ 16401) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};

    			if (dirty & /*$$scope, svgUrl, componentUrl*/ 16390) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    			const tabpanel2_changes = {};

    			if (dirty & /*$$scope, svgUrl*/ 16386) {
    				tabpanel2_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel2.$set(tabpanel2_changes);
    			const tabpanel3_changes = {};

    			if (dirty & /*$$scope, planningSvgUrl*/ 16392) {
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
    		source: "(66:8) <Tabs>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let div5;
    	let div0;
    	let t0;
    	let div2;
    	let div1;
    	let t1;
    	let div4;
    	let t2;
    	let div3;
    	let i;
    	let current;
    	let dispose;
    	const fileexplorer = new FileExplorer({ $$inline: true });

    	const documenteditor = new DocumentEditor({
    			props: { context: /*context*/ ctx[5] },
    			$$inline: true
    		});

    	const tabs = new Tabs({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			create_component(fileexplorer.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			create_component(documenteditor.$$.fragment);
    			t1 = space();
    			div4 = element("div");
    			create_component(tabs.$$.fragment);
    			t2 = space();
    			div3 = element("div");
    			i = element("i");
    			attr_dev(div0, "class", "file-explorer--container svelte-1pwsn1t");
    			add_location(div0, file$a, 56, 4, 2075);
    			attr_dev(div1, "class", "svelte-1pwsn1t");
    			add_location(div1, file$a, 60, 8, 2196);
    			attr_dev(div2, "class", "document-editor svelte-1pwsn1t");
    			add_location(div2, file$a, 59, 4, 2157);
    			attr_dev(i, "class", "fa fa-print svelte-1pwsn1t");
    			add_location(i, file$a, 118, 12, 4249);
    			attr_dev(div3, "class", "print-button svelte-1pwsn1t");
    			add_location(div3, file$a, 117, 8, 4192);
    			attr_dev(div4, "class", "page-viewer svelte-1pwsn1t");
    			add_location(div4, file$a, 64, 4, 2277);
    			attr_dev(div5, "class", "container svelte-1pwsn1t");
    			add_location(div5, file$a, 55, 0, 2046);
    			dispose = listen_dev(div3, "click", /*print*/ ctx[6], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			mount_component(fileexplorer, div0, null);
    			append_dev(div5, t0);
    			append_dev(div5, div2);
    			append_dev(div2, div1);
    			mount_component(documenteditor, div1, null);
    			append_dev(div5, t1);
    			append_dev(div5, div4);
    			mount_component(tabs, div4, null);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, i);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tabs_changes = {};

    			if (dirty & /*$$scope, planningSvgUrl, svgUrl, componentUrl, htmlUrl, iframe*/ 16415) {
    				tabs_changes.$$scope = { dirty, ctx };
    			}

    			tabs.$set(tabs_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fileexplorer.$$.fragment, local);
    			transition_in(documenteditor.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fileexplorer.$$.fragment, local);
    			transition_out(documenteditor.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(fileexplorer);
    			destroy_component(documenteditor);
    			destroy_component(tabs);
    			dispose();
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
    	let { namespace = "" } = $$props;
    	var oldNamespace = "";
    	let iframe;
    	let timeout;
    	let module;
    	let svgUrl;
    	let componentUrl;
    	let planningSvgUrl;
    	let htmlUrl;
    	let scrollY = 0;
    	let context = [];

    	const generateUrls = event => {
    		var _a;

    		$$invalidate(9, scrollY = (_a = iframe === null || iframe === void 0
    		? void 0
    		: iframe.contentWindow.scrollY) !== null && _a !== void 0
    		? _a
    		: 0);

    		if (!namespace) return;
    		$$invalidate(1, svgUrl = `/documents/${namespace}/data.svg?timestamp=${new Date().getMilliseconds()}`);
    		$$invalidate(2, componentUrl = `/documents/${namespace}/components.svg?timestamp=${new Date().getMilliseconds()}`);
    		$$invalidate(3, planningSvgUrl = `/documents/${namespace}/roadmap.svg?timestamp=${new Date().getMilliseconds()}`);
    		$$invalidate(4, htmlUrl = `/documents/${namespace}/page.html?timestamp=${new Date().getMilliseconds()}`);
    	};

    	onMount(() => {
    		window.addEventListener("module_changed", generateUrls, false);
    		generateUrls();
    	});

    	onDestroy(() => {
    		window.removeEventListener("module_changed", generateUrls, false);
    	});

    	let print = () => {
    		iframe.contentWindow.focus();
    		iframe.contentWindow.print();
    	};

    	const writable_props = ["namespace"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<EditorPage> was created with unknown prop '${key}'`);
    	});

    	function iframe_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, iframe = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("namespace" in $$props) $$invalidate(7, namespace = $$props.namespace);
    	};

    	$$self.$capture_state = () => {
    		return {
    			namespace,
    			oldNamespace,
    			iframe,
    			timeout,
    			module,
    			svgUrl,
    			componentUrl,
    			planningSvgUrl,
    			htmlUrl,
    			scrollY,
    			context,
    			print
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("namespace" in $$props) $$invalidate(7, namespace = $$props.namespace);
    		if ("oldNamespace" in $$props) $$invalidate(8, oldNamespace = $$props.oldNamespace);
    		if ("iframe" in $$props) $$invalidate(0, iframe = $$props.iframe);
    		if ("timeout" in $$props) timeout = $$props.timeout;
    		if ("module" in $$props) module = $$props.module;
    		if ("svgUrl" in $$props) $$invalidate(1, svgUrl = $$props.svgUrl);
    		if ("componentUrl" in $$props) $$invalidate(2, componentUrl = $$props.componentUrl);
    		if ("planningSvgUrl" in $$props) $$invalidate(3, planningSvgUrl = $$props.planningSvgUrl);
    		if ("htmlUrl" in $$props) $$invalidate(4, htmlUrl = $$props.htmlUrl);
    		if ("scrollY" in $$props) $$invalidate(9, scrollY = $$props.scrollY);
    		if ("context" in $$props) $$invalidate(5, context = $$props.context);
    		if ("print" in $$props) $$invalidate(6, print = $$props.print);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*oldNamespace, namespace, iframe, scrollY*/ 897) {
    			 {
    				if (moduleStore && oldNamespace !== namespace) {
    					selectModuleByNamespace(namespace);
    					generateUrls();
    					$$invalidate(8, oldNamespace = namespace);
    				}

    				if (iframe && !iframe.onload) {
    					$$invalidate(
    						0,
    						iframe.onload = function () {
    							setTimeout(() => {
    								iframe === null || iframe === void 0
    								? void 0
    								: iframe.contentWindow.scroll(0, scrollY);
    							});
    						},
    						iframe
    					);
    				}
    			}
    		}
    	};

    	return [
    		iframe,
    		svgUrl,
    		componentUrl,
    		planningSvgUrl,
    		htmlUrl,
    		context,
    		print,
    		namespace,
    		oldNamespace,
    		scrollY,
    		timeout,
    		module,
    		generateUrls,
    		iframe_1_binding
    	];
    }

    class EditorPage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { namespace: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditorPage",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get namespace() {
    		throw new Error("<EditorPage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set namespace(value) {
    		throw new Error("<EditorPage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Pages\Home.svelte generated by Svelte v3.16.7 */
    const file$b = "src\\Pages\\Home.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (30:12) {#if selectedApp == application}
    function create_if_block$4(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fa fa-check svelte-116j3ha");
    			add_location(i, file$b, 30, 16, 880);
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
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(30:12) {#if selectedApp == application}",
    		ctx
    	});

    	return block;
    }

    // (25:4) {#each applications as application}
    function create_each_block$2(ctx) {
    	let div;
    	let t0;
    	let span;
    	let t1_value = /*application*/ ctx[6] + "";
    	let t1;
    	let t2;
    	let dispose;
    	let if_block = /*selectedApp*/ ctx[1] == /*application*/ ctx[6] && create_if_block$4(ctx);

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[4](/*application*/ ctx[6], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(span, "class", "svelte-116j3ha");
    			add_location(span, file$b, 32, 12, 938);
    			attr_dev(div, "class", "application svelte-116j3ha");
    			toggle_class(div, "selected", /*selectedApp*/ ctx[1] == /*application*/ ctx[6]);
    			add_location(div, file$b, 25, 8, 675);
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

    			if (/*selectedApp*/ ctx[1] == /*application*/ ctx[6]) {
    				if (!if_block) {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*applications*/ 1 && t1_value !== (t1_value = /*application*/ ctx[6] + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*selectedApp, applications*/ 3) {
    				toggle_class(div, "selected", /*selectedApp*/ ctx[1] == /*application*/ ctx[6]);
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
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(25:4) {#each applications as application}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let div0;
    	let t;
    	let div1;
    	let i;
    	let dispose;
    	let each_value = /*applications*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			div1 = element("div");
    			i = element("i");
    			attr_dev(div0, "class", "home svelte-116j3ha");
    			add_location(div0, file$b, 23, 0, 606);
    			attr_dev(i, "class", "fa fa-times svelte-116j3ha");
    			add_location(i, file$b, 37, 4, 1085);
    			attr_dev(div1, "class", "clear svelte-116j3ha");
    			add_location(div1, file$b, 36, 0, 1003);
    			dispose = listen_dev(div1, "click", /*click_handler_1*/ ctx[5], false, false, false);
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
    			if (dirty & /*selectedApp, applications, sa*/ 7) {
    				each_value = /*applications*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let applications = [];
    	let selectedApp;
    	var a = localStorage.getItem("applications");

    	if (a != null) {
    		applications = JSON.parse(a).sort();
    	}

    	let sa = async app => {
    		selectApplication(app);
    		let pUrl = app.replace(/\//g, "__$__").replace(/\\/g, "__$__");
    		await post("/project/init/" + pUrl, {});
    	};

    	stateStore.subscribe(s => {
    		$$invalidate(1, selectedApp = s.application);
    	});

    	const click_handler = application => sa(application);
    	const click_handler_1 = () => localStorage.removeItem("applications");

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("applications" in $$props) $$invalidate(0, applications = $$props.applications);
    		if ("selectedApp" in $$props) $$invalidate(1, selectedApp = $$props.selectedApp);
    		if ("a" in $$props) a = $$props.a;
    		if ("sa" in $$props) $$invalidate(2, sa = $$props.sa);
    	};

    	return [applications, selectedApp, sa, a, click_handler, click_handler_1];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src\Pages\About.svelte generated by Svelte v3.16.7 */

    const file$c = "src\\Pages\\About.svelte";

    function create_fragment$f(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "About";
    			add_location(div, file$c, 0, 0, 0);
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
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src\Components\NavButton.svelte generated by Svelte v3.16.7 */
    const file$d = "src\\Components\\NavButton.svelte";

    // (42:0) {:else}
    function create_else_block$1(ctx) {
    	let span;
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*title*/ ctx[0]);
    			attr_dev(span, "class", "nav-button svelte-6ucpud");
    			toggle_class(span, "selected", /*selected*/ ctx[1]);
    			toggle_class(span, "link", /*link*/ ctx[3]);
    			add_location(span, file$d, 42, 4, 941);
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
    		source: "(42:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (36:0) {#if icon}
    function create_if_block$5(ctx) {
    	let span;
    	let i;
    	let i_class_value;
    	let t0;
    	let br;
    	let t1;
    	let dispose;
    	let if_block = /*title*/ ctx[0] && /*title*/ ctx[0].length > 0 && create_if_block_1$3(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			br = element("br");
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(i, "class", i_class_value = "" + (null_to_empty(/*icon*/ ctx[2]) + " svelte-6ucpud"));
    			add_location(i, file$d, 37, 8, 799);
    			add_location(br, file$d, 38, 8, 827);
    			attr_dev(span, "class", "nav-button icon svelte-6ucpud");
    			toggle_class(span, "selected", /*selected*/ ctx[1]);
    			toggle_class(span, "link", /*link*/ ctx[3]);
    			add_location(span, file$d, 36, 4, 716);
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
    			if (dirty & /*icon*/ 4 && i_class_value !== (i_class_value = "" + (null_to_empty(/*icon*/ ctx[2]) + " svelte-6ucpud"))) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (/*title*/ ctx[0] && /*title*/ ctx[0].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$3(ctx);
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
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(36:0) {#if icon}",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if title && title.length > 0}
    function create_if_block_1$3(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*title*/ ctx[0]);
    			attr_dev(span, "class", "title");
    			add_location(span, file$d, 39, 39, 874);
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
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(40:8) {#if title && title.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*icon*/ ctx[2]) return create_if_block$5;
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
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
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
    		if (href && !restricted) navigate(href);
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

    		init(this, options, instance$f, create_fragment$g, safe_not_equal, {
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
    			id: create_fragment$g.name
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
    const file$e = "src\\Components\\Menu.svelte";

    // (14:4) {#if selectedApp}
    function create_if_block$6(ctx) {
    	let current;

    	const navbutton = new NavButton({
    			props: {
    				href: "editor",
    				icon: "fa fa-file",
    				title: "Editor"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(navbutton.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(navbutton, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navbutton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(14:4) {#if selectedApp}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$h(ctx) {
    	let nav;
    	let t;
    	let current;

    	const navbutton = new NavButton({
    			props: {
    				href: "/",
    				icon: "fa fa-home",
    				title: "Home"
    			},
    			$$inline: true
    		});

    	let if_block = /*selectedApp*/ ctx[0] && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			create_component(navbutton.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(nav, "class", "svelte-z2p9zd");
    			add_location(nav, file$e, 11, 0, 277);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			mount_component(navbutton, nav, null);
    			append_dev(nav, t);
    			if (if_block) if_block.m(nav, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*selectedApp*/ ctx[0]) {
    				if (!if_block) {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(nav, null);
    				} else {
    					transition_in(if_block, 1);
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
    			transition_in(navbutton.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbutton.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_component(navbutton);
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

    function instance$g($$self, $$props, $$invalidate) {
    	let selectedApp;

    	stateStore.subscribe(s => {
    		$$invalidate(0, selectedApp = s.application);
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("selectedApp" in $$props) $$invalidate(0, selectedApp = $$props.selectedApp);
    	};

    	return [selectedApp];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src\Forms\SelectFolder.svelte generated by Svelte v3.16.7 */

    const { console: console_1$1 } = globals;
    const file$f = "src\\Forms\\SelectFolder.svelte";

    function create_fragment$i(ctx) {
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
    			form = element("form");
    			div0 = element("div");
    			div0.textContent = "Because of the limitations of the web we cannot select a directory from\r\n        the file system. This is why we will need a full path to open the\r\n        correct directory.";
    			t1 = space();
    			div1 = element("div");
    			label = element("label");
    			label.textContent = "Folder Full Path";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			attr_dev(div0, "class", "note svelte-1j30ob9");
    			add_location(div0, file$f, 43, 4, 1378);
    			attr_dev(label, "for", "ca_001");
    			add_location(label, file$f, 49, 8, 1633);
    			attr_dev(input, "id", "ca_001");
    			add_location(input, file$f, 50, 8, 1687);
    			attr_dev(div1, "class", "form--field");
    			add_location(div1, file$f, 48, 4, 1598);
    			attr_dev(button, "type", "button");
    			add_location(button, file$f, 53, 4, 1760);
    			attr_dev(form, "class", "form");
    			add_location(form, file$f, 42, 0, 1353);

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
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
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

    			let isValid = validateApp($app);
    			let path = $app.path;

    			if (isValid) {
    				var applications = localStorage.getItem("applications");
    				if (applications == null) applications = []; else applications = JSON.parse(applications);

    				if (applications.indexOf(path) < 0) {
    					applications.unshift(path);
    					localStorage.setItem("applications", JSON.stringify(applications));
    				}

    				let pUrl = path.replace(/\//g, "__$__").replace(/\\/g, "__$__");
    				await post("/project/init/" + pUrl, {});
    				close();
    			}
    		} catch(err) {
    			console.log(err);
    		}
    	};

    	const writable_props = ["close"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<SelectFolder> was created with unknown prop '${key}'`);
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

    class SelectFolder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$i, safe_not_equal, { close: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectFolder",
    			options,
    			id: create_fragment$i.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*close*/ ctx[3] === undefined && !("close" in props)) {
    			console_1$1.warn("<SelectFolder> was created without expected prop 'close'");
    		}
    	}

    	get close() {
    		throw new Error("<SelectFolder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set close(value) {
    		throw new Error("<SelectFolder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Forms\CreateFile.svelte generated by Svelte v3.16.7 */
    const file_1 = "src\\Forms\\CreateFile.svelte";

    function create_fragment$j(ctx) {
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
    	let select_value_value;
    	let t11;
    	let div2;
    	let label2;
    	let t13;
    	let input1;
    	let t14;
    	let div3;
    	let label3;
    	let t16;
    	let textarea;
    	let t17;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element("form");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "File Name";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Type";
    			t4 = space();
    			select = element("select");
    			option0 = element("option");
    			option1 = element("option");
    			option1.textContent = "Component";
    			option2 = element("option");
    			option2.textContent = "Feature";
    			option3 = element("option");
    			option3.textContent = "Database";
    			option4 = element("option");
    			option4.textContent = "Endpoint";
    			option5 = element("option");
    			option5.textContent = "Model";
    			option6 = element("option");
    			option6.textContent = "Empty";
    			t11 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "Application Name";
    			t13 = space();
    			input1 = element("input");
    			t14 = space();
    			div3 = element("div");
    			label3 = element("label");
    			label3.textContent = "Description";
    			t16 = space();
    			textarea = element("textarea");
    			t17 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			attr_dev(label0, "for", "cf_001");
    			add_location(label0, file_1, 30, 8, 846);
    			attr_dev(input0, "id", "cf_001");
    			add_location(input0, file_1, 31, 8, 893);
    			attr_dev(div0, "class", "form--field");
    			add_location(div0, file_1, 29, 4, 811);
    			attr_dev(label1, "for", "cf_002");
    			add_location(label1, file_1, 35, 8, 1001);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file_1, 37, 12, 1128);
    			option1.__value = "Component";
    			option1.value = option1.__value;
    			add_location(option1, file_1, 38, 12, 1152);
    			option2.__value = "Feature";
    			option2.value = option2.__value;
    			add_location(option2, file_1, 39, 12, 1192);
    			option3.__value = "Database";
    			option3.value = option3.__value;
    			add_location(option3, file_1, 40, 12, 1230);
    			option4.__value = "Endpoint";
    			option4.value = option4.__value;
    			add_location(option4, file_1, 41, 12, 1269);
    			option5.__value = "Model";
    			option5.value = option5.__value;
    			add_location(option5, file_1, 42, 12, 1308);
    			option6.__value = "Empty";
    			option6.value = option6.__value;
    			add_location(option6, file_1, 43, 12, 1344);
    			attr_dev(select, "id", "cf_002");
    			add_location(select, file_1, 36, 8, 1043);
    			attr_dev(div1, "class", "form--field");
    			add_location(div1, file_1, 34, 4, 966);
    			attr_dev(label2, "for", "cf_003");
    			add_location(label2, file_1, 48, 8, 1440);
    			attr_dev(input1, "id", "cf_003");
    			add_location(input1, file_1, 49, 8, 1494);
    			attr_dev(div2, "class", "form--field");
    			add_location(div2, file_1, 47, 4, 1405);
    			attr_dev(label3, "for", "cf_004");
    			add_location(label3, file_1, 53, 8, 1605);
    			attr_dev(textarea, "id", "cf_004");
    			add_location(textarea, file_1, 54, 8, 1654);
    			attr_dev(div3, "class", "form--field");
    			add_location(div3, file_1, 52, 4, 1570);
    			attr_dev(button, "type", "button");
    			add_location(button, file_1, 57, 4, 1737);
    			attr_dev(form, "class", "form");
    			add_location(form, file_1, 28, 0, 786);

    			dispose = [
    				listen_dev(input0, "change", /*changeValue*/ ctx[2]("name"), false, false, false),
    				listen_dev(select, "change", /*changeValue*/ ctx[2]("type"), false, false, false),
    				listen_dev(input1, "change", /*changeValue*/ ctx[2]("appName"), false, false, false),
    				listen_dev(textarea, "change", /*changeValue*/ ctx[2]("description"), false, false, false),
    				listen_dev(button, "click", /*submitForm*/ ctx[3], false, false, false)
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
    			select_value_value = /*$file*/ ctx[0].type;

    			for (var i = 0; i < select.options.length; i += 1) {
    				var option = select.options[i];

    				if (option.__value === select_value_value) {
    					option.selected = true;
    					break;
    				}
    			}

    			append_dev(form, t11);
    			append_dev(form, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t13);
    			append_dev(div2, input1);
    			append_dev(form, t14);
    			append_dev(form, div3);
    			append_dev(div3, label3);
    			append_dev(div3, t16);
    			append_dev(div3, textarea);
    			append_dev(form, t17);
    			append_dev(form, button);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$file*/ 1 && select_value_value !== (select_value_value = /*$file*/ ctx[0].type)) {
    				for (var i = 0; i < select.options.length; i += 1) {
    					var option = select.options[i];

    					if (option.__value === select_value_value) {
    						option.selected = true;
    						break;
    					}
    				}
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
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let $file;
    	var file = writable({ type: "Feature" });
    	validate_store(file, "file");
    	component_subscribe($$self, file, value => $$invalidate(0, $file = value));

    	const changeValue = name => e => {
    		set_store_value(file, $file = { ...$file, [name]: e.target.value });
    	};

    	const submitForm = async () => {
    		try {
    			let validateFile = ({ name, type, appName, description }) => {
    				return name && type;
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

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("file" in $$props) $$invalidate(1, file = $$props.file);
    		if ("$file" in $$props) file.set($file = $$props.$file);
    	};

    	return [$file, file, changeValue, submitForm];
    }

    class CreateFile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateFile",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src\Forms\CreateApplication.svelte generated by Svelte v3.16.7 */
    const file$g = "src\\Forms\\CreateApplication.svelte";

    function create_fragment$k(ctx) {
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
    			form = element("form");
    			div = element("div");
    			label = element("label");
    			label.textContent = "Application Name";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			attr_dev(label, "for", "ca_001");
    			add_location(label, file$g, 28, 8, 788);
    			attr_dev(input, "id", "ca_001");
    			add_location(input, file$g, 29, 8, 842);
    			attr_dev(div, "class", "form--field");
    			add_location(div, file$g, 27, 4, 753);
    			attr_dev(button, "type", "button");
    			add_location(button, file$g, 32, 4, 915);
    			attr_dev(form, "class", "form");
    			add_location(form, file$g, 26, 0, 728);

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
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$j, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateApplication",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src\Components\App\ToolbarItem.svelte generated by Svelte v3.16.7 */
    const file$h = "src\\Components\\App\\ToolbarItem.svelte";

    function create_fragment$l(ctx) {
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
    			div1 = element("div");
    			div0 = element("div");
    			i = element("i");
    			t0 = space();
    			span = element("span");
    			t1 = text(/*title*/ ctx[1]);
    			attr_dev(i, "class", i_class_value = "" + (null_to_empty(/*icon*/ ctx[0]) + " svelte-suzuev"));
    			add_location(i, file$h, 14, 8, 332);
    			attr_dev(span, "class", "svelte-suzuev");
    			add_location(span, file$h, 15, 8, 360);
    			attr_dev(div0, "class", "inner svelte-suzuev");
    			add_location(div0, file$h, 13, 4, 303);
    			attr_dev(div1, "class", "app--toole-bar--item svelte-suzuev");
    			add_location(div1, file$h, 12, 0, 244);
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
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$k, create_fragment$l, safe_not_equal, { icon: 0, title: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ToolbarItem",
    			options,
    			id: create_fragment$l.name
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

    /* src\Components\App\Toolbar.svelte generated by Svelte v3.16.7 */
    const file$i = "src\\Components\\App\\Toolbar.svelte";

    // (41:4) {#if selectedApp}
    function create_if_block$7(ctx) {
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
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(41:4) {#if selectedApp}",
    		ctx
    	});

    	return block;
    }

    // (59:0) <Modal title="Select Directory" {show} close={() => (show = false)}>
    function create_default_slot_2$1(ctx) {
    	let current;

    	const selectfolder = new SelectFolder({
    			props: { close: /*func_1*/ ctx[7] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(selectfolder.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(selectfolder, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const selectfolder_changes = {};
    			if (dirty & /*show*/ 1) selectfolder_changes.close = /*func_1*/ ctx[7];
    			selectfolder.$set(selectfolder_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(selectfolder.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(selectfolder.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(selectfolder, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(59:0) <Modal title=\\\"Select Directory\\\" {show} close={() => (show = false)}>",
    		ctx
    	});

    	return block;
    }

    // (62:0) <Modal title="Add File" show={showAddFileDialog} close={toggleAddFileDialog}>
    function create_default_slot_1$1(ctx) {
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
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(62:0) <Modal title=\\\"Add File\\\" show={showAddFileDialog} close={toggleAddFileDialog}>",
    		ctx
    	});

    	return block;
    }

    // (65:0) <Modal      title="Add Application"      show={showAddApplicationDialog}      close={toggleAddApplicationDialog}>
    function create_default_slot$1(ctx) {
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
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(65:0) <Modal      title=\\\"Add Application\\\"      show={showAddApplicationDialog}      close={toggleAddApplicationDialog}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$m(ctx) {
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
    	let t4;
    	let t5;
    	let t6;
    	let current;
    	let if_block = /*selectedApp*/ ctx[1] && create_if_block$7(ctx);

    	const toolbaritem = new ToolbarItem({
    			props: { icon: "fa fa-folder", title: "Open" },
    			$$inline: true
    		});

    	toolbaritem.$on("click", /*selectDirectory*/ ctx[4]);

    	const modal0 = new Modal({
    			props: {
    				title: "Select Directory",
    				show: /*show*/ ctx[0],
    				close: /*func*/ ctx[6],
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const modal1 = new Modal({
    			props: {
    				title: "Add File",
    				show: /*showAddFileDialog*/ ctx[3],
    				close: toggleAddFileDialog,
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const modal2 = new Modal({
    			props: {
    				title: "Add Application",
    				show: /*showAddApplicationDialog*/ ctx[2],
    				close: toggleAddApplicationDialog,
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = text("\r\n        ZDragon");
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			create_component(toolbaritem.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			i = element("i");
    			t4 = space();
    			create_component(modal0.$$.fragment);
    			t5 = space();
    			create_component(modal1.$$.fragment);
    			t6 = space();
    			create_component(modal2.$$.fragment);
    			set_style(img, "height", "1.5rem");
    			if (img.src !== (img_src_value = "favicon.ico")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "fav");
    			attr_dev(img, "class", "svelte-10hr968");
    			add_location(img, file$i, 37, 8, 1122);
    			attr_dev(div0, "class", "filler svelte-10hr968");
    			add_location(div0, file$i, 36, 4, 1092);
    			attr_dev(i, "class", "fa fa-times");
    			add_location(i, file$i, 54, 8, 1706);
    			attr_dev(div1, "class", "app--toolbar--close svelte-10hr968");
    			add_location(div1, file$i, 53, 4, 1663);
    			attr_dev(div2, "class", "app--toolbar svelte-10hr968");
    			add_location(div2, file$i, 35, 0, 1060);
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
    			insert_dev(target, t4, anchor);
    			mount_component(modal0, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(modal1, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(modal2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*selectedApp*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$7(ctx);
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

    			const modal0_changes = {};
    			if (dirty & /*show*/ 1) modal0_changes.show = /*show*/ ctx[0];
    			if (dirty & /*show*/ 1) modal0_changes.close = /*func*/ ctx[6];

    			if (dirty & /*$$scope, show*/ 257) {
    				modal0_changes.$$scope = { dirty, ctx };
    			}

    			modal0.$set(modal0_changes);
    			const modal1_changes = {};
    			if (dirty & /*showAddFileDialog*/ 8) modal1_changes.show = /*showAddFileDialog*/ ctx[3];

    			if (dirty & /*$$scope*/ 256) {
    				modal1_changes.$$scope = { dirty, ctx };
    			}

    			modal1.$set(modal1_changes);
    			const modal2_changes = {};
    			if (dirty & /*showAddApplicationDialog*/ 4) modal2_changes.show = /*showAddApplicationDialog*/ ctx[2];

    			if (dirty & /*$$scope*/ 256) {
    				modal2_changes.$$scope = { dirty, ctx };
    			}

    			modal2.$set(modal2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(toolbaritem.$$.fragment, local);
    			transition_in(modal0.$$.fragment, local);
    			transition_in(modal1.$$.fragment, local);
    			transition_in(modal2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(toolbaritem.$$.fragment, local);
    			transition_out(modal0.$$.fragment, local);
    			transition_out(modal1.$$.fragment, local);
    			transition_out(modal2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			destroy_component(toolbaritem);
    			if (detaching) detach_dev(t4);
    			destroy_component(modal0, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(modal1, detaching);
    			if (detaching) detach_dev(t6);
    			destroy_component(modal2, detaching);
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
    	let show = false;

    	let selectDirectory = () => {
    		$$invalidate(0, show = !show);
    	};

    	let selectedApp;

    	stateStore.subscribe(s => {
    		$$invalidate(1, selectedApp = s.application);
    	});

    	let showAddApplicationDialog = false;
    	let showAddFileDialog = false;
    	let showRefactorDialog = false;

    	stateStore.subscribe(s => {
    		$$invalidate(3, showAddFileDialog = !!s.showAddFileDialog);
    		$$invalidate(2, showAddApplicationDialog = !!s.showAddApplicationDialog);
    		showRefactorDialog = !!s.showRefactorDialog;
    	});

    	const func = () => $$invalidate(0, show = false);
    	const func_1 = () => $$invalidate(0, show = false);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("selectDirectory" in $$props) $$invalidate(4, selectDirectory = $$props.selectDirectory);
    		if ("selectedApp" in $$props) $$invalidate(1, selectedApp = $$props.selectedApp);
    		if ("showAddApplicationDialog" in $$props) $$invalidate(2, showAddApplicationDialog = $$props.showAddApplicationDialog);
    		if ("showAddFileDialog" in $$props) $$invalidate(3, showAddFileDialog = $$props.showAddFileDialog);
    		if ("showRefactorDialog" in $$props) showRefactorDialog = $$props.showRefactorDialog;
    	};

    	return [
    		show,
    		selectedApp,
    		showAddApplicationDialog,
    		showAddFileDialog,
    		selectDirectory,
    		showRefactorDialog,
    		func,
    		func_1
    	];
    }

    class Toolbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$m, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toolbar",
    			options,
    			id: create_fragment$m.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.16.7 */
    const file$j = "src\\App.svelte";

    // (18:8) <Route path="/editor">
    function create_default_slot_4$1(ctx) {
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
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(18:8) <Route path=\\\"/editor\\\">",
    		ctx
    	});

    	return block;
    }

    // (21:8) <Route path="/editor/:namespace" let:params>
    function create_default_slot_3$1(ctx) {
    	let current;

    	const editorpage = new EditorPage({
    			props: { namespace: /*params*/ ctx[0].namespace },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(editorpage.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editorpage, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const editorpage_changes = {};
    			if (dirty & /*params*/ 1) editorpage_changes.namespace = /*params*/ ctx[0].namespace;
    			editorpage.$set(editorpage_changes);
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
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(21:8) <Route path=\\\"/editor/:namespace\\\" let:params>",
    		ctx
    	});

    	return block;
    }

    // (25:8) <Route path="/">
    function create_default_slot_2$2(ctx) {
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
    		id: create_default_slot_2$2.name,
    		type: "slot",
    		source: "(25:8) <Route path=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (28:8) <Route path="/home">
    function create_default_slot_1$2(ctx) {
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
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(28:8) <Route path=\\\"/home\\\">",
    		ctx
    	});

    	return block;
    }

    // (12:0) <Router>
    function create_default_slot$2(ctx) {
    	let div2;
    	let t0;
    	let div1;
    	let t1;
    	let div0;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let current;
    	const toolbar = new Toolbar({ $$inline: true });
    	const menu = new Menu({ $$inline: true });

    	const route0 = new Route({
    			props: {
    				path: "/editor",
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route1 = new Route({
    			props: {
    				path: "/editor/:namespace",
    				$$slots: {
    					default: [
    						create_default_slot_3$1,
    						({ params }) => ({ 0: params }),
    						({ params }) => params ? 1 : 0
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
    				$$slots: { default: [create_default_slot_2$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route4 = new Route({
    			props: {
    				path: "/home",
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			create_component(toolbar.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(menu.$$.fragment);
    			t1 = space();
    			div0 = element("div");
    			create_component(route0.$$.fragment);
    			t2 = space();
    			create_component(route1.$$.fragment);
    			t3 = space();
    			create_component(route2.$$.fragment);
    			t4 = space();
    			create_component(route3.$$.fragment);
    			t5 = space();
    			create_component(route4.$$.fragment);
    			attr_dev(div0, "class", "panel svelte-11g6d2h");
    			add_location(div0, file$j, 16, 6, 440);
    			attr_dev(div1, "class", "content-container svelte-11g6d2h");
    			add_location(div1, file$j, 14, 4, 385);
    			attr_dev(div2, "class", "app--main svelte-11g6d2h");
    			add_location(div2, file$j, 12, 2, 339);
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
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const route0_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				route0_changes.$$scope = { dirty, ctx };
    			}

    			route0.$set(route0_changes);
    			const route1_changes = {};

    			if (dirty & /*$$scope, params*/ 3) {
    				route1_changes.$$scope = { dirty, ctx };
    			}

    			route1.$set(route1_changes);
    			const route3_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				route3_changes.$$scope = { dirty, ctx };
    			}

    			route3.$set(route3_changes);
    			const route4_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				route4_changes.$$scope = { dirty, ctx };
    			}

    			route4.$set(route4_changes);
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
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(12:0) <Router>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$n(ctx) {
    	let current;

    	const router = new Router({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
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

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$n, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$n.name
    		});
    	}
    }

    const tokenizer = {
        brackets: [{ open: "{*", close: "*}", token: "delimiter.bracket" }],
        keywords: [
            "record",
            "choice",
            "data",
            "open",
        ],
        autoClosingPairs: [{ open: "{*", close: "*}" }],
        digits: /\d+(_+\d+)*/,
        tokenizer: {
            root: [
                { include: "chapter" },
                { include: "annotation" },
                { include: "directive" },
                { include: "lang" },
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
                { include: "lang" }
            ],
            data: [
                [/'[a-z]/, "generic-parameter"], // generic types
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
                [/([A-Z][a-zA-Z_]*)(:)/, ["type.identifier", "number"]],
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

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
    }

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

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
      // console.log("Ready from SignalR: " + data);
    });
    connection.on("ModuleChanged", function (ns) {
      console.log("ModuleChanged");
      var event = new CustomEvent("module_changed", {});
      window.dispatchEvent(event);
    });
    connection.on("ProjectChanged", function (result) {
      console.log(result);
      setFiles(result);
    });
    connection.start();


    // Initialize the application
    setTimeout(() => {
      var applications = localStorage.getItem("applications");
      if (applications != null) {
        applications = JSON.parse(applications);
        if (applications.length > 0) {
          let path = applications[0]
            .replace(/\//g, "__$__")
            .replace(/\\/g, "__$__");

          selectApplication(applications[0]);
          post("/project/init/" + path, {});
        }
      }
    }, 500);

    return app;

}());
//# sourceMappingURL=bundle.js.map
