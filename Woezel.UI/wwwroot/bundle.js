var woezel = (function () {
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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
    			attr_dev(div, "class", "tabs svelte-14d7cfw");
    			add_location(div, file, 60, 0, 1578);
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
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "tab-list svelte-138kyvh");
    			add_location(div, file$1, 7, 0, 113);
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
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
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
    			attr_dev(button, "class", "svelte-17jjrxs");
    			toggle_class(button, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
    			add_location(button, file$2, 27, 0, 460);
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
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "panel svelte-7ud1ka");
    			add_location(div, file$3, 9, 0, 139);
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

    class Panel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Panel",
    			options,
    			id: create_fragment$6.name
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
    var getText = function (url) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, err_6;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    fetcher.set(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    _a = manageResult;
                    return [4 /*yield*/, fetch(url)];
                case 2: return [2 /*return*/, _a.apply(void 0, [_b.sent(), true])];
                case 3:
                    err_6 = _b.sent();
                    fetcher.set(false);
                    console.log(err_6);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };

    var documentStore = writable({});
    var selectFile = function (file) { return __awaiter(void 0, void 0, void 0, function () {
        var text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getTxt(file)];
                case 1:
                    text = _a.sent();
                    documentStore.update(function (s) { return (__assign(__assign({}, s), { selectedFile: file, text: text })); });
                    return [2 /*return*/];
            }
        });
    }); };
    var getTxt = function (file) { return __awaiter(void 0, void 0, void 0, function () {
        var encodedURI, url, text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!file)
                        return [2 /*return*/];
                    encodedURI = encodeURI(file.path);
                    url = "/document/" + encodedURI;
                    return [4 /*yield*/, getText(url)];
                case 1:
                    text = _a.sent();
                    return [2 /*return*/, text];
            }
        });
    }); };

    /* src\Components\FileExplorer\File.svelte generated by Svelte v3.16.7 */
    const file_1 = "src\\Components\\FileExplorer\\File.svelte";

    function create_fragment$7(ctx) {
    	let li;
    	let fa;
    	let t_value = /*file*/ ctx[0].name + "";
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			fa = element("fa");
    			t = text(t_value);
    			attr_dev(fa, "class", "fa fa-file-o svelte-tc5pah");
    			add_location(fa, file_1, 20, 4, 394);
    			toggle_class(li, "selected", /*selected*/ ctx[1]);
    			add_location(li, file_1, 19, 0, 345);
    			dispose = listen_dev(li, "click", /*fileSelected*/ ctx[2], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, fa);
    			append_dev(li, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*file*/ 1 && t_value !== (t_value = /*file*/ ctx[0].name + "")) set_data_dev(t, t_value);

    			if (dirty & /*selected*/ 2) {
    				toggle_class(li, "selected", /*selected*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
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
    	let { file } = $$props;
    	let { selected = false } = $$props;

    	const fileSelected = () => {
    		selectFile(file);
    	};

    	const writable_props = ["file", "selected"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<File> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("file" in $$props) $$invalidate(0, file = $$props.file);
    		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
    	};

    	$$self.$capture_state = () => {
    		return { file, selected };
    	};

    	$$self.$inject_state = $$props => {
    		if ("file" in $$props) $$invalidate(0, file = $$props.file);
    		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
    	};

    	return [file, selected, fileSelected];
    }

    class File extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { file: 0, selected: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "File",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*file*/ ctx[0] === undefined && !("file" in props)) {
    			console.warn("<File> was created without expected prop 'file'");
    		}
    	}

    	get file() {
    		throw new Error("<File>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set file(value) {
    		throw new Error("<File>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selected() {
    		throw new Error("<File>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected(value) {
    		throw new Error("<File>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\FileExplorer\Directory.svelte generated by Svelte v3.16.7 */
    const file$4 = "src\\Components\\FileExplorer\\Directory.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (37:19) 
    function create_if_block_2(ctx) {
    	let li;
    	let fa;
    	let t_value = /*directory*/ ctx[1].name + "";
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			fa = element("fa");
    			t = text(t_value);
    			attr_dev(fa, "class", "fa fa-folder-o svelte-1ph3g49");
    			add_location(fa, file$4, 38, 8, 1048);
    			add_location(li, file$4, 37, 4, 1002);
    			dispose = listen_dev(li, "click", /*click_handler_1*/ ctx[7], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, fa);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*directory*/ 2 && t_value !== (t_value = /*directory*/ ctx[1].name + "")) set_data_dev(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(37:19) ",
    		ctx
    	});

    	return block;
    }

    // (19:0) {#if open}
    function create_if_block$2(ctx) {
    	let t0;
    	let ul;
    	let t1;
    	let ul_class_value;
    	let current;
    	let if_block = /*showSelf*/ ctx[2] && create_if_block_1$1(ctx);
    	let each_value_1 = /*directory*/ ctx[1].directories;
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*directory*/ ctx[1].files;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", ul_class_value = `indent-${/*indent*/ ctx[3]}`);
    			add_location(ul, file$4, 24, 4, 581);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul, null);
    			}

    			append_dev(ul, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*showSelf*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*directory, indent*/ 10) {
    				each_value_1 = /*directory*/ ctx[1].directories;
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(ul, t1);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*directory, selectedFile*/ 18) {
    				each_value = /*directory*/ ctx[1].files;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*indent*/ 8 && ul_class_value !== (ul_class_value = `indent-${/*indent*/ ctx[3]}`)) {
    				attr_dev(ul, "class", ul_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(19:0) {#if open}",
    		ctx
    	});

    	return block;
    }

    // (20:4) {#if showSelf}
    function create_if_block_1$1(ctx) {
    	let li;
    	let fa;
    	let t_value = /*directory*/ ctx[1].name + "";
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			fa = element("fa");
    			t = text(t_value);
    			attr_dev(fa, "class", "fa fa-folder-open-o svelte-1ph3g49");
    			add_location(fa, file$4, 21, 12, 499);
    			add_location(li, file$4, 20, 8, 449);
    			dispose = listen_dev(li, "click", /*click_handler*/ ctx[6], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, fa);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*directory*/ 2 && t_value !== (t_value = /*directory*/ ctx[1].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(20:4) {#if showSelf}",
    		ctx
    	});

    	return block;
    }

    // (26:8) {#each directory.directories as dir}
    function create_each_block_1(ctx) {
    	let li;
    	let current;

    	const directory_1 = new Directory({
    			props: {
    				directory: /*dir*/ ctx[11],
    				indent: /*indent*/ ctx[3] + 1
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(directory_1.$$.fragment);
    			add_location(li, file$4, 26, 12, 672);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(directory_1, li, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const directory_1_changes = {};
    			if (dirty & /*directory*/ 2) directory_1_changes.directory = /*dir*/ ctx[11];
    			if (dirty & /*indent*/ 8) directory_1_changes.indent = /*indent*/ ctx[3] + 1;
    			directory_1.$set(directory_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(directory_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(directory_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(directory_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(26:8) {#each directory.directories as dir}",
    		ctx
    	});

    	return block;
    }

    // (31:8) {#each directory.files as file}
    function create_each_block(ctx) {
    	let current;

    	const file_1 = new File({
    			props: {
    				file: /*file*/ ctx[8],
    				selected: /*file*/ ctx[8] && /*selectedFile*/ ctx[4] && /*file*/ ctx[8].id == /*selectedFile*/ ctx[4].id
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(file_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(file_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const file_1_changes = {};
    			if (dirty & /*directory*/ 2) file_1_changes.file = /*file*/ ctx[8];
    			if (dirty & /*directory, selectedFile*/ 18) file_1_changes.selected = /*file*/ ctx[8] && /*selectedFile*/ ctx[4] && /*file*/ ctx[8].id == /*selectedFile*/ ctx[4].id;
    			file_1.$set(file_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(file_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(file_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(file_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(31:8) {#each directory.files as file}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_if_block_2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*open*/ ctx[0]) return 0;
    		if (/*showSelf*/ ctx[2]) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
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
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

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
    	let $documentStore;
    	validate_store(documentStore, "documentStore");
    	component_subscribe($$self, documentStore, $$value => $$invalidate(5, $documentStore = $$value));
    	let { directory } = $$props;
    	let { open = false } = $$props;
    	let { showSelf = true } = $$props;
    	let { indent = 0 } = $$props;
    	const writable_props = ["directory", "open", "showSelf", "indent"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Directory> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, open = !open);
    	const click_handler_1 = () => $$invalidate(0, open = !open);

    	$$self.$set = $$props => {
    		if ("directory" in $$props) $$invalidate(1, directory = $$props.directory);
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("showSelf" in $$props) $$invalidate(2, showSelf = $$props.showSelf);
    		if ("indent" in $$props) $$invalidate(3, indent = $$props.indent);
    	};

    	$$self.$capture_state = () => {
    		return {
    			directory,
    			open,
    			showSelf,
    			indent,
    			selectedFile,
    			$documentStore
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("directory" in $$props) $$invalidate(1, directory = $$props.directory);
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("showSelf" in $$props) $$invalidate(2, showSelf = $$props.showSelf);
    		if ("indent" in $$props) $$invalidate(3, indent = $$props.indent);
    		if ("selectedFile" in $$props) $$invalidate(4, selectedFile = $$props.selectedFile);
    		if ("$documentStore" in $$props) documentStore.set($documentStore = $$props.$documentStore);
    	};

    	let selectedFile;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$documentStore*/ 32) {
    			 $$invalidate(4, selectedFile = $documentStore.selectedFile);
    		}
    	};

    	return [
    		open,
    		directory,
    		showSelf,
    		indent,
    		selectedFile,
    		$documentStore,
    		click_handler,
    		click_handler_1
    	];
    }

    class Directory extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			directory: 1,
    			open: 0,
    			showSelf: 2,
    			indent: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Directory",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*directory*/ ctx[1] === undefined && !("directory" in props)) {
    			console.warn("<Directory> was created without expected prop 'directory'");
    		}
    	}

    	get directory() {
    		throw new Error("<Directory>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set directory(value) {
    		throw new Error("<Directory>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get open() {
    		throw new Error("<Directory>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set open(value) {
    		throw new Error("<Directory>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showSelf() {
    		throw new Error("<Directory>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showSelf(value) {
    		throw new Error("<Directory>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get indent() {
    		throw new Error("<Directory>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set indent(value) {
    		throw new Error("<Directory>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\FileExplorer\FileExplorer.svelte generated by Svelte v3.16.7 */
    const file$5 = "src\\Components\\FileExplorer\\FileExplorer.svelte";

    // (14:4) {#if documents}
    function create_if_block$3(ctx) {
    	let current;

    	const directory = new Directory({
    			props: {
    				directory: /*documents*/ ctx[0],
    				open: true,
    				showSelf: false
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(directory.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(directory, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const directory_changes = {};
    			if (dirty & /*documents*/ 1) directory_changes.directory = /*documents*/ ctx[0];
    			directory.$set(directory_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(directory.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(directory.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(directory, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(14:4) {#if documents}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div;
    	let current;
    	let if_block = /*documents*/ ctx[0] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "file-explorer");
    			add_location(div, file$5, 12, 0, 259);
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
    			if (/*documents*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$3(ctx);
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let documents;

    	const getDocuments = async () => {
    		$$invalidate(0, documents = await get("/documents"));
    	};

    	getDocuments();

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("documents" in $$props) $$invalidate(0, documents = $$props.documents);
    	};

    	return [documents];
    }

    class FileExplorer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FileExplorer",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\Components\Editor.svelte generated by Svelte v3.16.7 */
    const file$6 = "src\\Components\\Editor.svelte";

    function create_fragment$a(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "editor svelte-1dng18m");
    			attr_dev(div, "id", /*id*/ ctx[1]);
    			add_location(div, file$6, 115, 0, 3409);
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
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
    			scrollBeyondLastLine: false,
    			roundedSelection: true,
    			fontSize: "12px",
    			wordWrapColumn: 120,
    			wordWrap: wordWrap ? "on" : "off",
    			minimap: { enabled: true }
    		}));

    		$$invalidate(8, editor.dragAndDrop = false, editor);
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
    		if ((e.ctrlKey === true || e.metaKey == true) && e.key == "s") {
    			dispatch("save", editor.getValue());
    			onKeyPress(e, editor.getValue());
    			e.preventDefault();
    			return false;
    		}
    	}

    	const writable_props = ["onKeyPress", "text", "language", "theme", "wordWrap", "markers"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Editor> was created with unknown prop '${key}'`);
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
    			editorContainer,
    			timeout
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("onKeyPress" in $$props) $$invalidate(2, onKeyPress = $$props.onKeyPress);
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("editor" in $$props) $$invalidate(8, editor = $$props.editor);
    		if ("text" in $$props) $$invalidate(3, text = $$props.text);
    		if ("language" in $$props) $$invalidate(4, language = $$props.language);
    		if ("theme" in $$props) $$invalidate(5, theme = $$props.theme);
    		if ("wordWrap" in $$props) $$invalidate(6, wordWrap = $$props.wordWrap);
    		if ("markers" in $$props) $$invalidate(7, markers = $$props.markers);
    		if ("editorContainer" in $$props) $$invalidate(0, editorContainer = $$props.editorContainer);
    		if ("timeout" in $$props) timeout = $$props.timeout;
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*language, editor*/ 272) {
    			 if (language) {
    				(() => {
    					if (!editor) return;
    					monaco.editor.setModelLanguage(editor.getModel(), language);
    				})();
    			}
    		}

    		if ($$self.$$.dirty & /*text, editor*/ 264) {
    			 if (text) {
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
    		editor,
    		timeout,
    		dispatch,
    		initEditor,
    		keyTrap,
    		div_binding
    	];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			onKeyPress: 2,
    			text: 3,
    			language: 4,
    			theme: 5,
    			wordWrap: 6,
    			markers: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$a.name
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
    }

    var astStore = writable({});
    var parseCode = function (file, code) { return __awaiter(void 0, void 0, void 0, function () {
        var ast;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, post("/Document", { path: file.path, code: code })];
                case 1:
                    ast = _a.sent();
                    console.log(ast);
                    astStore.update(function (s) { return ast; });
                    return [2 /*return*/];
            }
        });
    }); };

    /* src\Components\DocumentEditor.svelte generated by Svelte v3.16.7 */
    const file_1$1 = "src\\Components\\DocumentEditor.svelte";

    function create_fragment$b(ctx) {
    	let div3;
    	let div0;

    	let t0_value = (/*file*/ ctx[0]
    	? /*file*/ ctx[0].namespace || /*file*/ ctx[0].path
    	: "unknown file") + "";

    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let div2;
    	let current;

    	const editor = new Editor({
    			props: {
    				text: /*text*/ ctx[1],
    				language: /*type*/ ctx[2]
    			},
    			$$inline: true
    		});

    	editor.$on("save", /*onSave*/ ctx[3]);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			create_component(editor.$$.fragment);
    			t2 = space();
    			div2 = element("div");
    			div2.textContent = "footer";
    			attr_dev(div0, "class", "header svelte-1sgju34");
    			add_location(div0, file_1$1, 60, 4, 1922);
    			attr_dev(div1, "class", "editor svelte-1sgju34");
    			add_location(div1, file_1$1, 64, 4, 2025);
    			attr_dev(div2, "class", "footer svelte-1sgju34");
    			add_location(div2, file_1$1, 68, 4, 2125);
    			attr_dev(div3, "class", "container svelte-1sgju34");
    			add_location(div3, file_1$1, 59, 0, 1893);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			mount_component(editor, div1, null);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*file*/ 1) && t0_value !== (t0_value = (/*file*/ ctx[0]
    			? /*file*/ ctx[0].namespace || /*file*/ ctx[0].path
    			: "unknown file") + "")) set_data_dev(t0, t0_value);

    			const editor_changes = {};
    			if (dirty & /*text*/ 2) editor_changes.text = /*text*/ ctx[1];
    			if (dirty & /*type*/ 4) editor_changes.language = /*type*/ ctx[2];
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
    			if (detaching) detach_dev(div3);
    			destroy_component(editor);
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

    	let file;
    	let text = "";
    	let type = "carlang";

    	let onSave = event => __awaiter(void 0, void 0, void 0, function* () {
    		if (!file || !event) return;
    		let code = event.detail;
    		parseCode(file, code);
    	});

    	documentStore.subscribe(value => {
    		$$invalidate(0, file = value.selectedFile);
    		$$invalidate(1, text = value.text);

    		if (file && file.path && file.path.endsWith(".json")) {
    			$$invalidate(2, type = "json");
    			$$invalidate(1, text = JSON.stringify(JSON.parse(text), null, 4));
    		} else {
    			$$invalidate(2, type = "carlang");
    		}
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("file" in $$props) $$invalidate(0, file = $$props.file);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("type" in $$props) $$invalidate(2, type = $$props.type);
    		if ("onSave" in $$props) $$invalidate(3, onSave = $$props.onSave);
    	};

    	return [file, text, type, onSave];
    }

    class DocumentEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DocumentEditor",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src\Components\Page.svelte generated by Svelte v3.16.7 */

    const file$7 = "src\\Components\\Page.svelte";

    function create_fragment$c(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let pre;
    	let t3;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text("This is the page:\r\n        ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = space();
    			pre = element("pre");
    			t3 = text(/*content*/ ctx[1]);
    			add_location(pre, file$7, 26, 8, 538);
    			attr_dev(div0, "class", "page svelte-2mev25");
    			add_location(div0, file$7, 23, 4, 450);
    			attr_dev(div1, "class", "page-container");
    			add_location(div1, file$7, 22, 0, 416);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, pre);
    			append_dev(pre, t3);
    			/*div0_binding*/ ctx[3](div0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    			if (dirty & /*content*/ 2) set_data_dev(t3, /*content*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*div0_binding*/ ctx[3](null);
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
    	let { name = "default" } = $$props;
    	let { content = "" } = $$props;
    	let page;
    	const writable_props = ["name", "content"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Page> was created with unknown prop '${key}'`);
    	});

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, page = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("content" in $$props) $$invalidate(1, content = $$props.content);
    	};

    	$$self.$capture_state = () => {
    		return { name, content, page };
    	};

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("content" in $$props) $$invalidate(1, content = $$props.content);
    		if ("page" in $$props) $$invalidate(2, page = $$props.page);
    	};

    	return [name, content, page, div0_binding];
    }

    class Page extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { name: 0, content: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get name() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get content() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\PageViewer.svelte generated by Svelte v3.16.7 */
    const file$8 = "src\\Components\\PageViewer.svelte";

    function create_fragment$d(ctx) {
    	let div1;
    	let t0;
    	let t1;
    	let t2;
    	let div0;
    	let current;

    	const page0 = new Page({
    			props: { content: /*content*/ ctx[0] },
    			$$inline: true
    		});

    	const page1 = new Page({
    			props: { name: "Carlos" },
    			$$inline: true
    		});

    	const page2 = new Page({
    			props: { name: "Vincent" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			create_component(page0.$$.fragment);
    			t0 = space();
    			create_component(page1.$$.fragment);
    			t1 = space();
    			create_component(page2.$$.fragment);
    			t2 = space();
    			div0 = element("div");
    			attr_dev(div0, "class", "bottom svelte-ghxxov");
    			add_location(div0, file$8, 51, 4, 1132);
    			attr_dev(div1, "class", "page-wrapper svelte-ghxxov");
    			add_location(div1, file$8, 47, 0, 997);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			mount_component(page0, div1, null);
    			append_dev(div1, t0);
    			mount_component(page1, div1, null);
    			append_dev(div1, t1);
    			mount_component(page2, div1, null);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			/*div1_binding*/ ctx[4](div1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const page0_changes = {};
    			if (dirty & /*content*/ 1) page0_changes.content = /*content*/ ctx[0];
    			page0.$set(page0_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(page0.$$.fragment, local);
    			transition_in(page1.$$.fragment, local);
    			transition_in(page2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(page0.$$.fragment, local);
    			transition_out(page1.$$.fragment, local);
    			transition_out(page2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(page0);
    			destroy_component(page1);
    			destroy_component(page2);
    			/*div1_binding*/ ctx[4](null);
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
    	let { content = "NO CONTENT" } = $$props;
    	let container;

    	function resize() {
    		if (!container) return;
    		var scaleX = container.clientWidth / 900;

    		if (scaleX < 1) {
    			container.setAttribute("style", `transform: scale(${scaleX})`);
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

    	const writable_props = ["content"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PageViewer> was created with unknown prop '${key}'`);
    	});

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, container = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("content" in $$props) $$invalidate(0, content = $$props.content);
    	};

    	$$self.$capture_state = () => {
    		return { content, container };
    	};

    	$$self.$inject_state = $$props => {
    		if ("content" in $$props) $$invalidate(0, content = $$props.content);
    		if ("container" in $$props) $$invalidate(1, container = $$props.container);
    	};

    	return [content, container, resize, watch, div1_binding];
    }

    class PageViewer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { content: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PageViewer",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get content() {
    		throw new Error("<PageViewer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<PageViewer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var contextKey = {};

    /* node_modules\svelte-json-tree\src\JSONArrow.svelte generated by Svelte v3.16.7 */

    const file$9 = "node_modules\\svelte-json-tree\\src\\JSONArrow.svelte";

    function create_fragment$e(ctx) {
    	let div1;
    	let div0;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = `${"▶"}`;
    			attr_dev(div0, "class", "arrow svelte-1vyml86");
    			toggle_class(div0, "expanded", /*expanded*/ ctx[0]);
    			add_location(div0, file$9, 29, 2, 622);
    			attr_dev(div1, "class", "container svelte-1vyml86");
    			add_location(div1, file$9, 28, 0, 587);
    			dispose = listen_dev(div1, "click", /*click_handler*/ ctx[1], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*expanded*/ 1) {
    				toggle_class(div0, "expanded", /*expanded*/ ctx[0]);
    			}
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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { expanded } = $$props;
    	const writable_props = ["expanded"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONArrow> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => {
    		return { expanded };
    	};

    	$$self.$inject_state = $$props => {
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    	};

    	return [expanded, click_handler];
    }

    class JSONArrow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { expanded: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONArrow",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*expanded*/ ctx[0] === undefined && !("expanded" in props)) {
    			console.warn("<JSONArrow> was created without expected prop 'expanded'");
    		}
    	}

    	get expanded() {
    		throw new Error("<JSONArrow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONArrow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-json-tree\src\JSONKey.svelte generated by Svelte v3.16.7 */

    const file$a = "node_modules\\svelte-json-tree\\src\\JSONKey.svelte";

    // (16:0) {#if showKey && key}
    function create_if_block$4(ctx) {
    	let label;
    	let span;
    	let t0;
    	let t1;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			span = element("span");
    			t0 = text(/*key*/ ctx[0]);
    			t1 = text(/*colon*/ ctx[2]);
    			add_location(span, file$a, 17, 4, 399);
    			attr_dev(label, "class", "svelte-1vlbacg");
    			toggle_class(label, "spaced", /*isParentExpanded*/ ctx[1]);
    			add_location(label, file$a, 16, 2, 346);
    			dispose = listen_dev(label, "click", /*click_handler*/ ctx[5], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*key*/ 1) set_data_dev(t0, /*key*/ ctx[0]);
    			if (dirty & /*colon*/ 4) set_data_dev(t1, /*colon*/ ctx[2]);

    			if (dirty & /*isParentExpanded*/ 2) {
    				toggle_class(label, "spaced", /*isParentExpanded*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(16:0) {#if showKey && key}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let if_block_anchor;
    	let if_block = /*showKey*/ ctx[3] && /*key*/ ctx[0] && create_if_block$4(ctx);

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
    			if (/*showKey*/ ctx[3] && /*key*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
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
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { key } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray = false } = $$props,
    		{ colon = ":" } = $$props;

    	const writable_props = ["key", "isParentExpanded", "isParentArray", "colon"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONKey> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("colon" in $$props) $$invalidate(2, colon = $$props.colon);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			isParentExpanded,
    			isParentArray,
    			colon,
    			showKey
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("colon" in $$props) $$invalidate(2, colon = $$props.colon);
    		if ("showKey" in $$props) $$invalidate(3, showKey = $$props.showKey);
    	};

    	let showKey;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isParentExpanded, isParentArray, key*/ 19) {
    			 $$invalidate(3, showKey = isParentExpanded || !isParentArray || key != +key);
    		}
    	};

    	return [key, isParentExpanded, colon, showKey, isParentArray, click_handler];
    }

    class JSONKey extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {
    			key: 0,
    			isParentExpanded: 1,
    			isParentArray: 4,
    			colon: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONKey",
    			options,
    			id: create_fragment$f.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONKey> was created without expected prop 'key'");
    		}

    		if (/*isParentExpanded*/ ctx[1] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONKey> was created without expected prop 'isParentExpanded'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONKey>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONKey>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONKey>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONKey>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONKey>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONKey>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colon() {
    		throw new Error("<JSONKey>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colon(value) {
    		throw new Error("<JSONKey>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-json-tree\src\JSONNested.svelte generated by Svelte v3.16.7 */
    const file$b = "node_modules\\svelte-json-tree\\src\\JSONNested.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	child_ctx[20] = i;
    	return child_ctx;
    }

    // (57:4) {#if expandable && isParentExpanded}
    function create_if_block_3(ctx) {
    	let current;

    	const jsonarrow = new JSONArrow({
    			props: { expanded: /*expanded*/ ctx[0] },
    			$$inline: true
    		});

    	jsonarrow.$on("click", /*toggleExpand*/ ctx[15]);

    	const block = {
    		c: function create() {
    			create_component(jsonarrow.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonarrow, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsonarrow_changes = {};
    			if (dirty & /*expanded*/ 1) jsonarrow_changes.expanded = /*expanded*/ ctx[0];
    			jsonarrow.$set(jsonarrow_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonarrow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonarrow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonarrow, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(57:4) {#if expandable && isParentExpanded}",
    		ctx
    	});

    	return block;
    }

    // (75:4) {:else}
    function create_else_block$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "…";
    			add_location(span, file$b, 75, 6, 2085);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(75:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (63:4) {#if isParentExpanded}
    function create_if_block$5(ctx) {
    	let ul;
    	let t;
    	let current;
    	let dispose;
    	let each_value = /*slicedKeys*/ ctx[13];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block = /*slicedKeys*/ ctx[13].length < /*previewKeys*/ ctx[7].length && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(ul, "class", "svelte-rwxv37");
    			toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
    			add_location(ul, file$b, 63, 6, 1589);
    			dispose = listen_dev(ul, "click", /*expand*/ ctx[16], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(ul, t);
    			if (if_block) if_block.m(ul, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*expanded, previewKeys, getKey, slicedKeys, isArray, getValue, getPreviewValue*/ 10129) {
    				each_value = /*slicedKeys*/ ctx[13];
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
    						each_blocks[i].m(ul, t);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*slicedKeys*/ ctx[13].length < /*previewKeys*/ ctx[7].length) {
    				if (!if_block) {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(ul, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*expanded*/ 1) {
    				toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
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
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(63:4) {#if isParentExpanded}",
    		ctx
    	});

    	return block;
    }

    // (67:10) {#if !expanded && index < previewKeys.length - 1}
    function create_if_block_2$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = ",";
    			attr_dev(span, "class", "comma svelte-rwxv37");
    			add_location(span, file$b, 67, 12, 1901);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(67:10) {#if !expanded && index < previewKeys.length - 1}",
    		ctx
    	});

    	return block;
    }

    // (65:8) {#each slicedKeys as key, index}
    function create_each_block$1(ctx) {
    	let t;
    	let if_block_anchor;
    	let current;

    	const jsonnode = new JSONNode({
    			props: {
    				key: /*getKey*/ ctx[8](/*key*/ ctx[12]),
    				isParentExpanded: /*expanded*/ ctx[0],
    				isParentArray: /*isArray*/ ctx[4],
    				value: /*expanded*/ ctx[0]
    				? /*getValue*/ ctx[9](/*key*/ ctx[12])
    				: /*getPreviewValue*/ ctx[10](/*key*/ ctx[12])
    			},
    			$$inline: true
    		});

    	let if_block = !/*expanded*/ ctx[0] && /*index*/ ctx[20] < /*previewKeys*/ ctx[7].length - 1 && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			create_component(jsonnode.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnode, target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsonnode_changes = {};
    			if (dirty & /*getKey, slicedKeys*/ 8448) jsonnode_changes.key = /*getKey*/ ctx[8](/*key*/ ctx[12]);
    			if (dirty & /*expanded*/ 1) jsonnode_changes.isParentExpanded = /*expanded*/ ctx[0];
    			if (dirty & /*isArray*/ 16) jsonnode_changes.isParentArray = /*isArray*/ ctx[4];

    			if (dirty & /*expanded, getValue, slicedKeys, getPreviewValue*/ 9729) jsonnode_changes.value = /*expanded*/ ctx[0]
    			? /*getValue*/ ctx[9](/*key*/ ctx[12])
    			: /*getPreviewValue*/ ctx[10](/*key*/ ctx[12]);

    			jsonnode.$set(jsonnode_changes);

    			if (!/*expanded*/ ctx[0] && /*index*/ ctx[20] < /*previewKeys*/ ctx[7].length - 1) {
    				if (!if_block) {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnode.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnode.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnode, detaching);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(65:8) {#each slicedKeys as key, index}",
    		ctx
    	});

    	return block;
    }

    // (71:8) {#if slicedKeys.length < previewKeys.length }
    function create_if_block_1$2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "…";
    			add_location(span, file$b, 71, 10, 2026);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(71:8) {#if slicedKeys.length < previewKeys.length }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let li;
    	let label_1;
    	let t0;
    	let t1;
    	let span1;
    	let span0;
    	let t2;
    	let t3;
    	let t4;
    	let current_block_type_index;
    	let if_block1;
    	let t5;
    	let span2;
    	let t6;
    	let current;
    	let dispose;
    	let if_block0 = /*expandable*/ ctx[11] && /*isParentExpanded*/ ctx[2] && create_if_block_3(ctx);

    	const jsonkey = new JSONKey({
    			props: {
    				key: /*key*/ ctx[12],
    				colon: /*context*/ ctx[14].colon,
    				isParentExpanded: /*isParentExpanded*/ ctx[2],
    				isParentArray: /*isParentArray*/ ctx[3]
    			},
    			$$inline: true
    		});

    	jsonkey.$on("click", /*toggleExpand*/ ctx[15]);
    	const if_block_creators = [create_if_block$5, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isParentExpanded*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			label_1 = element("label");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			create_component(jsonkey.$$.fragment);
    			t1 = space();
    			span1 = element("span");
    			span0 = element("span");
    			t2 = text(/*label*/ ctx[1]);
    			t3 = text(/*bracketOpen*/ ctx[5]);
    			t4 = space();
    			if_block1.c();
    			t5 = space();
    			span2 = element("span");
    			t6 = text(/*bracketClose*/ ctx[6]);
    			add_location(span0, file$b, 60, 34, 1504);
    			add_location(span1, file$b, 60, 4, 1474);
    			attr_dev(label_1, "class", "svelte-rwxv37");
    			add_location(label_1, file$b, 55, 2, 1253);
    			add_location(span2, file$b, 77, 2, 2112);
    			attr_dev(li, "class", "svelte-rwxv37");
    			toggle_class(li, "indent", /*isParentExpanded*/ ctx[2]);
    			add_location(li, file$b, 54, 0, 1214);
    			dispose = listen_dev(span1, "click", /*toggleExpand*/ ctx[15], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, label_1);
    			if (if_block0) if_block0.m(label_1, null);
    			append_dev(label_1, t0);
    			mount_component(jsonkey, label_1, null);
    			append_dev(label_1, t1);
    			append_dev(label_1, span1);
    			append_dev(span1, span0);
    			append_dev(span0, t2);
    			append_dev(span1, t3);
    			append_dev(li, t4);
    			if_blocks[current_block_type_index].m(li, null);
    			append_dev(li, t5);
    			append_dev(li, span2);
    			append_dev(span2, t6);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*expandable*/ ctx[11] && /*isParentExpanded*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(label_1, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const jsonkey_changes = {};
    			if (dirty & /*key*/ 4096) jsonkey_changes.key = /*key*/ ctx[12];
    			if (dirty & /*isParentExpanded*/ 4) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
    			if (dirty & /*isParentArray*/ 8) jsonkey_changes.isParentArray = /*isParentArray*/ ctx[3];
    			jsonkey.$set(jsonkey_changes);
    			if (!current || dirty & /*label*/ 2) set_data_dev(t2, /*label*/ ctx[1]);
    			if (!current || dirty & /*bracketOpen*/ 32) set_data_dev(t3, /*bracketOpen*/ ctx[5]);
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
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(li, t5);
    			}

    			if (!current || dirty & /*bracketClose*/ 64) set_data_dev(t6, /*bracketClose*/ ctx[6]);

    			if (dirty & /*isParentExpanded*/ 4) {
    				toggle_class(li, "indent", /*isParentExpanded*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(jsonkey.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(jsonkey.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block0) if_block0.d();
    			destroy_component(jsonkey);
    			if_blocks[current_block_type_index].d();
    			dispose();
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
    	let { key } = $$props,
    		{ keys } = $$props,
    		{ colon = ":" } = $$props,
    		{ label = "" } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ isArray = false } = $$props,
    		{ bracketOpen } = $$props,
    		{ bracketClose } = $$props;

    	let { previewKeys = keys } = $$props;
    	let { getKey = key => key } = $$props;
    	let { getValue = key => key } = $$props;
    	let { getPreviewValue = getValue } = $$props;
    	let { expanded = false } = $$props, { expandable = true } = $$props;
    	const context = getContext(contextKey);
    	setContext(contextKey, { ...context, colon });

    	function toggleExpand() {
    		$$invalidate(0, expanded = !expanded);
    	}

    	function expand() {
    		$$invalidate(0, expanded = true);
    	}

    	const writable_props = [
    		"key",
    		"keys",
    		"colon",
    		"label",
    		"isParentExpanded",
    		"isParentArray",
    		"isArray",
    		"bracketOpen",
    		"bracketClose",
    		"previewKeys",
    		"getKey",
    		"getValue",
    		"getPreviewValue",
    		"expanded",
    		"expandable"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONNested> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(12, key = $$props.key);
    		if ("keys" in $$props) $$invalidate(17, keys = $$props.keys);
    		if ("colon" in $$props) $$invalidate(18, colon = $$props.colon);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("isArray" in $$props) $$invalidate(4, isArray = $$props.isArray);
    		if ("bracketOpen" in $$props) $$invalidate(5, bracketOpen = $$props.bracketOpen);
    		if ("bracketClose" in $$props) $$invalidate(6, bracketClose = $$props.bracketClose);
    		if ("previewKeys" in $$props) $$invalidate(7, previewKeys = $$props.previewKeys);
    		if ("getKey" in $$props) $$invalidate(8, getKey = $$props.getKey);
    		if ("getValue" in $$props) $$invalidate(9, getValue = $$props.getValue);
    		if ("getPreviewValue" in $$props) $$invalidate(10, getPreviewValue = $$props.getPreviewValue);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    		if ("expandable" in $$props) $$invalidate(11, expandable = $$props.expandable);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			keys,
    			colon,
    			label,
    			isParentExpanded,
    			isParentArray,
    			isArray,
    			bracketOpen,
    			bracketClose,
    			previewKeys,
    			getKey,
    			getValue,
    			getPreviewValue,
    			expanded,
    			expandable,
    			slicedKeys
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(12, key = $$props.key);
    		if ("keys" in $$props) $$invalidate(17, keys = $$props.keys);
    		if ("colon" in $$props) $$invalidate(18, colon = $$props.colon);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("isArray" in $$props) $$invalidate(4, isArray = $$props.isArray);
    		if ("bracketOpen" in $$props) $$invalidate(5, bracketOpen = $$props.bracketOpen);
    		if ("bracketClose" in $$props) $$invalidate(6, bracketClose = $$props.bracketClose);
    		if ("previewKeys" in $$props) $$invalidate(7, previewKeys = $$props.previewKeys);
    		if ("getKey" in $$props) $$invalidate(8, getKey = $$props.getKey);
    		if ("getValue" in $$props) $$invalidate(9, getValue = $$props.getValue);
    		if ("getPreviewValue" in $$props) $$invalidate(10, getPreviewValue = $$props.getPreviewValue);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    		if ("expandable" in $$props) $$invalidate(11, expandable = $$props.expandable);
    		if ("slicedKeys" in $$props) $$invalidate(13, slicedKeys = $$props.slicedKeys);
    	};

    	let slicedKeys;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isParentExpanded*/ 4) {
    			 if (!isParentExpanded) {
    				$$invalidate(0, expanded = false);
    			}
    		}

    		if ($$self.$$.dirty & /*expanded, keys, previewKeys*/ 131201) {
    			 $$invalidate(13, slicedKeys = expanded ? keys : previewKeys.slice(0, 5));
    		}
    	};

    	return [
    		expanded,
    		label,
    		isParentExpanded,
    		isParentArray,
    		isArray,
    		bracketOpen,
    		bracketClose,
    		previewKeys,
    		getKey,
    		getValue,
    		getPreviewValue,
    		expandable,
    		key,
    		slicedKeys,
    		context,
    		toggleExpand,
    		expand,
    		keys,
    		colon
    	];
    }

    class JSONNested extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {
    			key: 12,
    			keys: 17,
    			colon: 18,
    			label: 1,
    			isParentExpanded: 2,
    			isParentArray: 3,
    			isArray: 4,
    			bracketOpen: 5,
    			bracketClose: 6,
    			previewKeys: 7,
    			getKey: 8,
    			getValue: 9,
    			getPreviewValue: 10,
    			expanded: 0,
    			expandable: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONNested",
    			options,
    			id: create_fragment$g.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[12] === undefined && !("key" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'key'");
    		}

    		if (/*keys*/ ctx[17] === undefined && !("keys" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'keys'");
    		}

    		if (/*isParentExpanded*/ ctx[2] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[3] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'isParentArray'");
    		}

    		if (/*bracketOpen*/ ctx[5] === undefined && !("bracketOpen" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'bracketOpen'");
    		}

    		if (/*bracketClose*/ ctx[6] === undefined && !("bracketClose" in props)) {
    			console.warn("<JSONNested> was created without expected prop 'bracketClose'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get keys() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set keys(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colon() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colon(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isArray() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isArray(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bracketOpen() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bracketOpen(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bracketClose() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bracketClose(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get previewKeys() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set previewKeys(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getKey() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getKey(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getValue() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getValue(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getPreviewValue() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getPreviewValue(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expandable() {
    		throw new Error("<JSONNested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expandable(value) {
    		throw new Error("<JSONNested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-json-tree\src\JSONObjectNode.svelte generated by Svelte v3.16.7 */

    const { Object: Object_1 } = globals;

    function create_fragment$h(ctx) {
    	let current;

    	const jsonnested = new JSONNested({
    			props: {
    				key: /*key*/ ctx[0],
    				expanded: /*expanded*/ ctx[4],
    				isParentExpanded: /*isParentExpanded*/ ctx[1],
    				isParentArray: /*isParentArray*/ ctx[2],
    				keys: /*keys*/ ctx[5],
    				previewKeys: /*keys*/ ctx[5],
    				getValue: /*getValue*/ ctx[6],
    				label: "" + (/*nodeType*/ ctx[3] + " "),
    				bracketOpen: "{",
    				bracketClose: "}"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
    			if (dirty & /*expanded*/ 16) jsonnested_changes.expanded = /*expanded*/ ctx[4];
    			if (dirty & /*isParentExpanded*/ 2) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[1];
    			if (dirty & /*isParentArray*/ 4) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[2];
    			if (dirty & /*keys*/ 32) jsonnested_changes.keys = /*keys*/ ctx[5];
    			if (dirty & /*keys*/ 32) jsonnested_changes.previewKeys = /*keys*/ ctx[5];
    			if (dirty & /*nodeType*/ 8) jsonnested_changes.label = "" + (/*nodeType*/ ctx[3] + " ");
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
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
    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ nodeType } = $$props;

    	let { expanded = false } = $$props;

    	function getValue(key) {
    		return value[key];
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "nodeType", "expanded"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONObjectNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(7, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			value,
    			isParentExpanded,
    			isParentArray,
    			nodeType,
    			expanded,
    			keys
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(7, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    		if ("keys" in $$props) $$invalidate(5, keys = $$props.keys);
    	};

    	let keys;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 128) {
    			 $$invalidate(5, keys = Object.getOwnPropertyNames(value));
    		}
    	};

    	return [
    		key,
    		isParentExpanded,
    		isParentArray,
    		nodeType,
    		expanded,
    		keys,
    		getValue,
    		value
    	];
    }

    class JSONObjectNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {
    			key: 0,
    			value: 7,
    			isParentExpanded: 1,
    			isParentArray: 2,
    			nodeType: 3,
    			expanded: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONObjectNode",
    			options,
    			id: create_fragment$h.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[7] === undefined && !("value" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[1] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[2] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'isParentArray'");
    		}

    		if (/*nodeType*/ ctx[3] === undefined && !("nodeType" in props)) {
    			console.warn("<JSONObjectNode> was created without expected prop 'nodeType'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nodeType() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nodeType(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<JSONObjectNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONObjectNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-json-tree\src\JSONArrayNode.svelte generated by Svelte v3.16.7 */

    const { Object: Object_1$1 } = globals;

    function create_fragment$i(ctx) {
    	let current;

    	const jsonnested = new JSONNested({
    			props: {
    				key: /*key*/ ctx[0],
    				expanded: /*expanded*/ ctx[4],
    				isParentExpanded: /*isParentExpanded*/ ctx[2],
    				isParentArray: /*isParentArray*/ ctx[3],
    				isArray: true,
    				keys: /*keys*/ ctx[5],
    				previewKeys: /*previewKeys*/ ctx[6],
    				getValue: /*getValue*/ ctx[7],
    				label: "Array(" + /*value*/ ctx[1].length + ")",
    				bracketOpen: "[",
    				bracketClose: "]"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
    			if (dirty & /*expanded*/ 16) jsonnested_changes.expanded = /*expanded*/ ctx[4];
    			if (dirty & /*isParentExpanded*/ 4) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
    			if (dirty & /*isParentArray*/ 8) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[3];
    			if (dirty & /*keys*/ 32) jsonnested_changes.keys = /*keys*/ ctx[5];
    			if (dirty & /*previewKeys*/ 64) jsonnested_changes.previewKeys = /*previewKeys*/ ctx[6];
    			if (dirty & /*value*/ 2) jsonnested_changes.label = "Array(" + /*value*/ ctx[1].length + ")";
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
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
    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props;

    	let { expanded = false } = $$props;
    	const filteredKey = new Set(["length"]);

    	function getValue(key) {
    		return value[key];
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "expanded"];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONArrayNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			value,
    			isParentExpanded,
    			isParentArray,
    			expanded,
    			keys,
    			previewKeys
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    		if ("keys" in $$props) $$invalidate(5, keys = $$props.keys);
    		if ("previewKeys" in $$props) $$invalidate(6, previewKeys = $$props.previewKeys);
    	};

    	let keys;
    	let previewKeys;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 2) {
    			 $$invalidate(5, keys = Object.getOwnPropertyNames(value));
    		}

    		if ($$self.$$.dirty & /*keys*/ 32) {
    			 $$invalidate(6, previewKeys = keys.filter(key => !filteredKey.has(key)));
    		}
    	};

    	return [
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		expanded,
    		keys,
    		previewKeys,
    		getValue
    	];
    }

    class JSONArrayNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {
    			key: 0,
    			value: 1,
    			isParentExpanded: 2,
    			isParentArray: 3,
    			expanded: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONArrayNode",
    			options,
    			id: create_fragment$i.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONArrayNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<JSONArrayNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[2] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONArrayNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[3] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONArrayNode> was created without expected prop 'isParentArray'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<JSONArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-json-tree\src\JSONIterableArrayNode.svelte generated by Svelte v3.16.7 */

    function create_fragment$j(ctx) {
    	let current;

    	const jsonnested = new JSONNested({
    			props: {
    				key: /*key*/ ctx[0],
    				isParentExpanded: /*isParentExpanded*/ ctx[1],
    				isParentArray: /*isParentArray*/ ctx[2],
    				keys: /*keys*/ ctx[4],
    				getKey,
    				getValue,
    				isArray: true,
    				label: "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")"),
    				bracketOpen: "{",
    				bracketClose: "}"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
    			if (dirty & /*isParentExpanded*/ 2) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[1];
    			if (dirty & /*isParentArray*/ 4) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[2];
    			if (dirty & /*keys*/ 16) jsonnested_changes.keys = /*keys*/ ctx[4];
    			if (dirty & /*nodeType, keys*/ 24) jsonnested_changes.label = "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")");
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
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

    function getKey(key) {
    	return String(key[0]);
    }

    function getValue(key) {
    	return key[1];
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ nodeType } = $$props;

    	let keys = [];
    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "nodeType"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONIterableArrayNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(5, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			value,
    			isParentExpanded,
    			isParentArray,
    			nodeType,
    			keys
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(5, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    		if ("keys" in $$props) $$invalidate(4, keys = $$props.keys);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 32) {
    			 {
    				let result = [];
    				let i = 0;

    				for (const entry of value) {
    					result.push([i++, entry]);
    				}

    				$$invalidate(4, keys = result);
    			}
    		}
    	};

    	return [key, isParentExpanded, isParentArray, nodeType, keys, value];
    }

    class JSONIterableArrayNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {
    			key: 0,
    			value: 5,
    			isParentExpanded: 1,
    			isParentArray: 2,
    			nodeType: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONIterableArrayNode",
    			options,
    			id: create_fragment$j.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[5] === undefined && !("value" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[1] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[2] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'isParentArray'");
    		}

    		if (/*nodeType*/ ctx[3] === undefined && !("nodeType" in props)) {
    			console.warn("<JSONIterableArrayNode> was created without expected prop 'nodeType'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nodeType() {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nodeType(value) {
    		throw new Error("<JSONIterableArrayNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    class MapEntry {
      constructor(key, value) {
        this.key = key;
        this.value = value;
      }
    }

    /* node_modules\svelte-json-tree\src\JSONIterableMapNode.svelte generated by Svelte v3.16.7 */

    function create_fragment$k(ctx) {
    	let current;

    	const jsonnested = new JSONNested({
    			props: {
    				key: /*key*/ ctx[0],
    				isParentExpanded: /*isParentExpanded*/ ctx[1],
    				isParentArray: /*isParentArray*/ ctx[2],
    				keys: /*keys*/ ctx[4],
    				getKey: getKey$1,
    				getValue: getValue$1,
    				label: "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")"),
    				colon: "",
    				bracketOpen: "{",
    				bracketClose: "}"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
    			if (dirty & /*isParentExpanded*/ 2) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[1];
    			if (dirty & /*isParentArray*/ 4) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[2];
    			if (dirty & /*keys*/ 16) jsonnested_changes.keys = /*keys*/ ctx[4];
    			if (dirty & /*nodeType, keys*/ 24) jsonnested_changes.label = "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")");
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
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

    function getKey$1(entry) {
    	return entry[0];
    }

    function getValue$1(entry) {
    	return entry[1];
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ nodeType } = $$props;

    	let keys = [];
    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "nodeType"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONIterableMapNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(5, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			value,
    			isParentExpanded,
    			isParentArray,
    			nodeType,
    			keys
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(5, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
    		if ("keys" in $$props) $$invalidate(4, keys = $$props.keys);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 32) {
    			 {
    				let result = [];
    				let i = 0;

    				for (const entry of value) {
    					result.push([i++, new MapEntry(entry[0], entry[1])]);
    				}

    				$$invalidate(4, keys = result);
    			}
    		}
    	};

    	return [key, isParentExpanded, isParentArray, nodeType, keys, value];
    }

    class JSONIterableMapNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {
    			key: 0,
    			value: 5,
    			isParentExpanded: 1,
    			isParentArray: 2,
    			nodeType: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONIterableMapNode",
    			options,
    			id: create_fragment$k.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[5] === undefined && !("value" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[1] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[2] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'isParentArray'");
    		}

    		if (/*nodeType*/ ctx[3] === undefined && !("nodeType" in props)) {
    			console.warn("<JSONIterableMapNode> was created without expected prop 'nodeType'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nodeType() {
    		throw new Error("<JSONIterableMapNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nodeType(value) {
    		throw new Error("<JSONIterableMapNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-json-tree\src\JSONMapEntryNode.svelte generated by Svelte v3.16.7 */

    function create_fragment$l(ctx) {
    	let current;

    	const jsonnested = new JSONNested({
    			props: {
    				expanded: /*expanded*/ ctx[4],
    				isParentExpanded: /*isParentExpanded*/ ctx[2],
    				isParentArray: /*isParentArray*/ ctx[3],
    				key: /*isParentExpanded*/ ctx[2]
    				? String(/*key*/ ctx[0])
    				: /*value*/ ctx[1].key,
    				keys: /*keys*/ ctx[5],
    				getValue: /*getValue*/ ctx[6],
    				label: /*isParentExpanded*/ ctx[2] ? "Entry " : "=> ",
    				bracketOpen: "{",
    				bracketClose: "}"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsonnested.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnested, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnested_changes = {};
    			if (dirty & /*expanded*/ 16) jsonnested_changes.expanded = /*expanded*/ ctx[4];
    			if (dirty & /*isParentExpanded*/ 4) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
    			if (dirty & /*isParentArray*/ 8) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[3];

    			if (dirty & /*isParentExpanded, key, value*/ 7) jsonnested_changes.key = /*isParentExpanded*/ ctx[2]
    			? String(/*key*/ ctx[0])
    			: /*value*/ ctx[1].key;

    			if (dirty & /*isParentExpanded*/ 4) jsonnested_changes.label = /*isParentExpanded*/ ctx[2] ? "Entry " : "=> ";
    			jsonnested.$set(jsonnested_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnested.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnested.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnested, detaching);
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

    function instance$l($$self, $$props, $$invalidate) {
    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props;

    	let { expanded = false } = $$props;
    	const keys = ["key", "value"];

    	function getValue(key) {
    		return value[key];
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "expanded"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONMapEntryNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			value,
    			isParentExpanded,
    			isParentArray,
    			expanded
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
    	};

    	return [key, value, isParentExpanded, isParentArray, expanded, keys, getValue];
    }

    class JSONMapEntryNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {
    			key: 0,
    			value: 1,
    			isParentExpanded: 2,
    			isParentArray: 3,
    			expanded: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONMapEntryNode",
    			options,
    			id: create_fragment$l.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONMapEntryNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<JSONMapEntryNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[2] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONMapEntryNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[3] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONMapEntryNode> was created without expected prop 'isParentArray'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<JSONMapEntryNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<JSONMapEntryNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-json-tree\src\JSONValueNode.svelte generated by Svelte v3.16.7 */
    const file$c = "node_modules\\svelte-json-tree\\src\\JSONValueNode.svelte";

    function create_fragment$m(ctx) {
    	let li;
    	let t0;
    	let span;

    	let t1_value = (/*valueGetter*/ ctx[2]
    	? /*valueGetter*/ ctx[2](/*value*/ ctx[1])
    	: /*value*/ ctx[1]) + "";

    	let t1;
    	let span_class_value;
    	let current;

    	const jsonkey = new JSONKey({
    			props: {
    				key: /*key*/ ctx[0],
    				colon: /*colon*/ ctx[6],
    				isParentExpanded: /*isParentExpanded*/ ctx[3],
    				isParentArray: /*isParentArray*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(jsonkey.$$.fragment);
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(span, "class", span_class_value = "" + (null_to_empty(/*nodeType*/ ctx[5]) + " svelte-3bjyvl"));
    			add_location(span, file$c, 47, 2, 948);
    			attr_dev(li, "class", "svelte-3bjyvl");
    			toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
    			add_location(li, file$c, 45, 0, 846);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(jsonkey, li, null);
    			append_dev(li, t0);
    			append_dev(li, span);
    			append_dev(span, t1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonkey_changes = {};
    			if (dirty & /*key*/ 1) jsonkey_changes.key = /*key*/ ctx[0];
    			if (dirty & /*isParentExpanded*/ 8) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[3];
    			if (dirty & /*isParentArray*/ 16) jsonkey_changes.isParentArray = /*isParentArray*/ ctx[4];
    			jsonkey.$set(jsonkey_changes);

    			if ((!current || dirty & /*valueGetter, value*/ 6) && t1_value !== (t1_value = (/*valueGetter*/ ctx[2]
    			? /*valueGetter*/ ctx[2](/*value*/ ctx[1])
    			: /*value*/ ctx[1]) + "")) set_data_dev(t1, t1_value);

    			if (!current || dirty & /*nodeType*/ 32 && span_class_value !== (span_class_value = "" + (null_to_empty(/*nodeType*/ ctx[5]) + " svelte-3bjyvl"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty & /*isParentExpanded*/ 8) {
    				toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonkey.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonkey.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(jsonkey);
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

    function instance$m($$self, $$props, $$invalidate) {
    	let { key } = $$props,
    		{ value } = $$props,
    		{ valueGetter = null } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props,
    		{ nodeType } = $$props;

    	const { colon } = getContext(contextKey);
    	const writable_props = ["key", "value", "valueGetter", "isParentExpanded", "isParentArray", "nodeType"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONValueNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("valueGetter" in $$props) $$invalidate(2, valueGetter = $$props.valueGetter);
    		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(5, nodeType = $$props.nodeType);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			value,
    			valueGetter,
    			isParentExpanded,
    			isParentArray,
    			nodeType
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("valueGetter" in $$props) $$invalidate(2, valueGetter = $$props.valueGetter);
    		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(5, nodeType = $$props.nodeType);
    	};

    	return [key, value, valueGetter, isParentExpanded, isParentArray, nodeType, colon];
    }

    class JSONValueNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {
    			key: 0,
    			value: 1,
    			valueGetter: 2,
    			isParentExpanded: 3,
    			isParentArray: 4,
    			nodeType: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONValueNode",
    			options,
    			id: create_fragment$m.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[3] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[4] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'isParentArray'");
    		}

    		if (/*nodeType*/ ctx[5] === undefined && !("nodeType" in props)) {
    			console.warn("<JSONValueNode> was created without expected prop 'nodeType'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valueGetter() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valueGetter(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nodeType() {
    		throw new Error("<JSONValueNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nodeType(value) {
    		throw new Error("<JSONValueNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-json-tree\src\ErrorNode.svelte generated by Svelte v3.16.7 */
    const file$d = "node_modules\\svelte-json-tree\\src\\ErrorNode.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (40:2) {#if isParentExpanded}
    function create_if_block_2$2(ctx) {
    	let current;

    	const jsonarrow = new JSONArrow({
    			props: { expanded: /*expanded*/ ctx[0] },
    			$$inline: true
    		});

    	jsonarrow.$on("click", /*toggleExpand*/ ctx[7]);

    	const block = {
    		c: function create() {
    			create_component(jsonarrow.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonarrow, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsonarrow_changes = {};
    			if (dirty & /*expanded*/ 1) jsonarrow_changes.expanded = /*expanded*/ ctx[0];
    			jsonarrow.$set(jsonarrow_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonarrow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonarrow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonarrow, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(40:2) {#if isParentExpanded}",
    		ctx
    	});

    	return block;
    }

    // (45:2) {#if isParentExpanded}
    function create_if_block$6(ctx) {
    	let ul;
    	let current;
    	let if_block = /*expanded*/ ctx[0] && create_if_block_1$3(ctx);

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			if (if_block) if_block.c();
    			attr_dev(ul, "class", "svelte-1ca3gb2");
    			toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
    			add_location(ul, file$d, 45, 4, 1134);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			if (if_block) if_block.m(ul, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*expanded*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(ul, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*expanded*/ 1) {
    				toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
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
    			if (detaching) detach_dev(ul);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(45:2) {#if isParentExpanded}",
    		ctx
    	});

    	return block;
    }

    // (47:6) {#if expanded}
    function create_if_block_1$3(ctx) {
    	let t0;
    	let li;
    	let t1;
    	let span;
    	let current;

    	const jsonnode = new JSONNode({
    			props: {
    				key: "message",
    				value: /*value*/ ctx[2].message
    			},
    			$$inline: true
    		});

    	const jsonkey = new JSONKey({
    			props: {
    				key: "stack",
    				colon: ":",
    				isParentExpanded: /*isParentExpanded*/ ctx[3]
    			},
    			$$inline: true
    		});

    	let each_value = /*stack*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			create_component(jsonnode.$$.fragment);
    			t0 = space();
    			li = element("li");
    			create_component(jsonkey.$$.fragment);
    			t1 = space();
    			span = element("span");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(span, file$d, 50, 10, 1330);
    			attr_dev(li, "class", "svelte-1ca3gb2");
    			add_location(li, file$d, 48, 8, 1252);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsonnode, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, li, anchor);
    			mount_component(jsonkey, li, null);
    			append_dev(li, t1);
    			append_dev(li, span);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(span, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsonnode_changes = {};
    			if (dirty & /*value*/ 4) jsonnode_changes.value = /*value*/ ctx[2].message;
    			jsonnode.$set(jsonnode_changes);
    			const jsonkey_changes = {};
    			if (dirty & /*isParentExpanded*/ 8) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[3];
    			jsonkey.$set(jsonkey_changes);

    			if (dirty & /*stack*/ 32) {
    				each_value = /*stack*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(span, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnode.$$.fragment, local);
    			transition_in(jsonkey.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnode.$$.fragment, local);
    			transition_out(jsonkey.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsonnode, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(li);
    			destroy_component(jsonkey);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(47:6) {#if expanded}",
    		ctx
    	});

    	return block;
    }

    // (52:12) {#each stack as line, index}
    function create_each_block$2(ctx) {
    	let span;
    	let t_value = /*line*/ ctx[8] + "";
    	let t;
    	let br;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			br = element("br");
    			attr_dev(span, "class", "svelte-1ca3gb2");
    			toggle_class(span, "indent", /*index*/ ctx[10] > 0);
    			add_location(span, file$d, 52, 14, 1392);
    			add_location(br, file$d, 52, 58, 1436);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*stack*/ 32 && t_value !== (t_value = /*line*/ ctx[8] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(52:12) {#each stack as line, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$n(ctx) {
    	let li;
    	let t0;
    	let t1;
    	let span;
    	let t2;
    	let t3_value = (/*expanded*/ ctx[0] ? "" : /*value*/ ctx[2].message) + "";
    	let t3;
    	let t4;
    	let current;
    	let dispose;
    	let if_block0 = /*isParentExpanded*/ ctx[3] && create_if_block_2$2(ctx);

    	const jsonkey = new JSONKey({
    			props: {
    				key: /*key*/ ctx[1],
    				colon: /*context*/ ctx[6].colon,
    				isParentExpanded: /*isParentExpanded*/ ctx[3],
    				isParentArray: /*isParentArray*/ ctx[4]
    			},
    			$$inline: true
    		});

    	let if_block1 = /*isParentExpanded*/ ctx[3] && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			create_component(jsonkey.$$.fragment);
    			t1 = space();
    			span = element("span");
    			t2 = text("Error: ");
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block1) if_block1.c();
    			add_location(span, file$d, 43, 2, 1033);
    			attr_dev(li, "class", "svelte-1ca3gb2");
    			toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
    			add_location(li, file$d, 38, 0, 831);
    			dispose = listen_dev(span, "click", /*toggleExpand*/ ctx[7], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			if (if_block0) if_block0.m(li, null);
    			append_dev(li, t0);
    			mount_component(jsonkey, li, null);
    			append_dev(li, t1);
    			append_dev(li, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(li, t4);
    			if (if_block1) if_block1.m(li, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isParentExpanded*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_2$2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(li, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const jsonkey_changes = {};
    			if (dirty & /*key*/ 2) jsonkey_changes.key = /*key*/ ctx[1];
    			if (dirty & /*isParentExpanded*/ 8) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[3];
    			if (dirty & /*isParentArray*/ 16) jsonkey_changes.isParentArray = /*isParentArray*/ ctx[4];
    			jsonkey.$set(jsonkey_changes);
    			if ((!current || dirty & /*expanded, value*/ 5) && t3_value !== (t3_value = (/*expanded*/ ctx[0] ? "" : /*value*/ ctx[2].message) + "")) set_data_dev(t3, t3_value);

    			if (/*isParentExpanded*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$6(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(li, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*isParentExpanded*/ 8) {
    				toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(jsonkey.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(jsonkey.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block0) if_block0.d();
    			destroy_component(jsonkey);
    			if (if_block1) if_block1.d();
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

    function instance$n($$self, $$props, $$invalidate) {
    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props;

    	let { expanded = false } = $$props;
    	const context = getContext(contextKey);
    	setContext(contextKey, { ...context, colon: ":" });

    	function toggleExpand() {
    		$$invalidate(0, expanded = !expanded);
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray", "expanded"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ErrorNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(1, key = $$props.key);
    		if ("value" in $$props) $$invalidate(2, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			value,
    			isParentExpanded,
    			isParentArray,
    			expanded,
    			stack
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(1, key = $$props.key);
    		if ("value" in $$props) $$invalidate(2, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
    		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
    		if ("stack" in $$props) $$invalidate(5, stack = $$props.stack);
    	};

    	let stack;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 4) {
    			 $$invalidate(5, stack = value.stack.split("\n"));
    		}

    		if ($$self.$$.dirty & /*isParentExpanded*/ 8) {
    			 if (!isParentExpanded) {
    				$$invalidate(0, expanded = false);
    			}
    		}
    	};

    	return [
    		expanded,
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		stack,
    		context,
    		toggleExpand
    	];
    }

    class ErrorNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {
    			key: 1,
    			value: 2,
    			isParentExpanded: 3,
    			isParentArray: 4,
    			expanded: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ErrorNode",
    			options,
    			id: create_fragment$n.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[1] === undefined && !("key" in props)) {
    			console.warn("<ErrorNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[2] === undefined && !("value" in props)) {
    			console.warn("<ErrorNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[3] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<ErrorNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[4] === undefined && !("isParentArray" in props)) {
    			console.warn("<ErrorNode> was created without expected prop 'isParentArray'");
    		}
    	}

    	get key() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expanded() {
    		throw new Error("<ErrorNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expanded(value) {
    		throw new Error("<ErrorNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function objType(obj) {
      const type = Object.prototype.toString.call(obj).slice(8, -1);
      if (type === 'Object') {
        if (typeof obj[Symbol.iterator] === 'function') {
          return 'Iterable';
        }
        return obj.constructor.name;
      }

      return type;
    }

    /* node_modules\svelte-json-tree\src\JSONNode.svelte generated by Svelte v3.16.7 */

    function create_fragment$o(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*componentType*/ ctx[5];

    	function switch_props(ctx) {
    		return {
    			props: {
    				key: /*key*/ ctx[0],
    				value: /*value*/ ctx[1],
    				isParentExpanded: /*isParentExpanded*/ ctx[2],
    				isParentArray: /*isParentArray*/ ctx[3],
    				nodeType: /*nodeType*/ ctx[4],
    				valueGetter: /*valueGetter*/ ctx[6]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*key*/ 1) switch_instance_changes.key = /*key*/ ctx[0];
    			if (dirty & /*value*/ 2) switch_instance_changes.value = /*value*/ ctx[1];
    			if (dirty & /*isParentExpanded*/ 4) switch_instance_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
    			if (dirty & /*isParentArray*/ 8) switch_instance_changes.isParentArray = /*isParentArray*/ ctx[3];
    			if (dirty & /*nodeType*/ 16) switch_instance_changes.nodeType = /*nodeType*/ ctx[4];
    			if (dirty & /*valueGetter*/ 64) switch_instance_changes.valueGetter = /*valueGetter*/ ctx[6];

    			if (switch_value !== (switch_value = /*componentType*/ ctx[5])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
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
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let { key } = $$props,
    		{ value } = $$props,
    		{ isParentExpanded } = $$props,
    		{ isParentArray } = $$props;

    	function getComponent(nodeType) {
    		switch (nodeType) {
    			case "Object":
    				return JSONObjectNode;
    			case "Error":
    				return ErrorNode;
    			case "Array":
    				return JSONArrayNode;
    			case "Iterable":
    			case "Map":
    			case "Set":
    				return typeof value.set === "function"
    				? JSONIterableMapNode
    				: JSONIterableArrayNode;
    			case "MapEntry":
    				return JSONMapEntryNode;
    			default:
    				return JSONValueNode;
    		}
    	}

    	function getValueGetter(nodeType) {
    		switch (nodeType) {
    			case "Object":
    			case "Error":
    			case "Array":
    			case "Iterable":
    			case "Map":
    			case "Set":
    			case "MapEntry":
    			case "Number":
    				return undefined;
    			case "String":
    				return raw => `"${raw}"`;
    			case "Boolean":
    				return raw => raw ? "true" : "false";
    			case "Date":
    				return raw => raw.toISOString();
    			case "Null":
    				return () => "null";
    			case "Undefined":
    				return () => "undefined";
    			case "Function":
    			case "Symbol":
    				return raw => raw.toString();
    			default:
    				return () => `<${nodeType}>`;
    		}
    	}

    	const writable_props = ["key", "value", "isParentExpanded", "isParentArray"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSONNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			value,
    			isParentExpanded,
    			isParentArray,
    			nodeType,
    			componentType,
    			valueGetter
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
    		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
    		if ("nodeType" in $$props) $$invalidate(4, nodeType = $$props.nodeType);
    		if ("componentType" in $$props) $$invalidate(5, componentType = $$props.componentType);
    		if ("valueGetter" in $$props) $$invalidate(6, valueGetter = $$props.valueGetter);
    	};

    	let nodeType;
    	let componentType;
    	let valueGetter;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 2) {
    			 $$invalidate(4, nodeType = objType(value));
    		}

    		if ($$self.$$.dirty & /*nodeType*/ 16) {
    			 $$invalidate(5, componentType = getComponent(nodeType));
    		}

    		if ($$self.$$.dirty & /*nodeType*/ 16) {
    			 $$invalidate(6, valueGetter = getValueGetter(nodeType));
    		}
    	};

    	return [
    		key,
    		value,
    		isParentExpanded,
    		isParentArray,
    		nodeType,
    		componentType,
    		valueGetter
    	];
    }

    class JSONNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {
    			key: 0,
    			value: 1,
    			isParentExpanded: 2,
    			isParentArray: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSONNode",
    			options,
    			id: create_fragment$o.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*key*/ ctx[0] === undefined && !("key" in props)) {
    			console.warn("<JSONNode> was created without expected prop 'key'");
    		}

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<JSONNode> was created without expected prop 'value'");
    		}

    		if (/*isParentExpanded*/ ctx[2] === undefined && !("isParentExpanded" in props)) {
    			console.warn("<JSONNode> was created without expected prop 'isParentExpanded'");
    		}

    		if (/*isParentArray*/ ctx[3] === undefined && !("isParentArray" in props)) {
    			console.warn("<JSONNode> was created without expected prop 'isParentArray'");
    		}
    	}

    	get key() {
    		throw new Error("<JSONNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<JSONNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<JSONNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<JSONNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentExpanded() {
    		throw new Error("<JSONNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentExpanded(value) {
    		throw new Error("<JSONNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isParentArray() {
    		throw new Error("<JSONNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isParentArray(value) {
    		throw new Error("<JSONNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-json-tree\src\Root.svelte generated by Svelte v3.16.7 */
    const file$e = "node_modules\\svelte-json-tree\\src\\Root.svelte";

    function create_fragment$p(ctx) {
    	let ul;
    	let current;

    	const jsonnode = new JSONNode({
    			props: {
    				key: /*key*/ ctx[0],
    				value: /*value*/ ctx[1],
    				isParentExpanded: true,
    				isParentArray: false
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			create_component(jsonnode.$$.fragment);
    			attr_dev(ul, "class", "svelte-773n60");
    			add_location(ul, file$e, 37, 0, 1295);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			mount_component(jsonnode, ul, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const jsonnode_changes = {};
    			if (dirty & /*key*/ 1) jsonnode_changes.key = /*key*/ ctx[0];
    			if (dirty & /*value*/ 2) jsonnode_changes.value = /*value*/ ctx[1];
    			jsonnode.$set(jsonnode_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsonnode.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsonnode.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_component(jsonnode);
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

    function instance$p($$self, $$props, $$invalidate) {
    	setContext(contextKey, {});
    	let { key = "" } = $$props, { value } = $$props;
    	const writable_props = ["key", "value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Root> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    	};

    	$$self.$capture_state = () => {
    		return { key, value };
    	};

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    	};

    	return [key, value];
    }

    class Root extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, { key: 0, value: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Root",
    			options,
    			id: create_fragment$p.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<Root> was created without expected prop 'value'");
    		}
    	}

    	get key() {
    		throw new Error("<Root>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<Root>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Root>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Root>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\ASTViewer.svelte generated by Svelte v3.16.7 */

    // (13:0) <Panel>
    function create_default_slot(ctx) {
    	let current;

    	const jsontree = new Root({
    			props: {
    				value: /*value*/ ctx[0],
    				isParentExpanded: true
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(jsontree.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jsontree, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const jsontree_changes = {};
    			if (dirty & /*value*/ 1) jsontree_changes.value = /*value*/ ctx[0];
    			jsontree.$set(jsontree_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jsontree.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jsontree.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jsontree, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(13:0) <Panel>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$q(ctx) {
    	let current;

    	const panel = new Panel({
    			props: {
    				$$slots: { default: [create_default_slot] },
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

    			if (dirty & /*$$scope, value*/ 3) {
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
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props, $$invalidate) {
    	var value = {};

    	astStore.subscribe(s => {
    		$$invalidate(0, value = s);
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    	};

    	return [value];
    }

    class ASTViewer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ASTViewer",
    			options,
    			id: create_fragment$q.name
    		});
    	}
    }

    /* src\Pages\EditorPage.svelte generated by Svelte v3.16.7 */
    const file$f = "src\\Pages\\EditorPage.svelte";

    // (57:16) <Tab>
    function create_default_slot_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("JSON");
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
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(57:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (58:16) <Tab>
    function create_default_slot_4(ctx) {
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
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(58:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (56:12) <TabList>
    function create_default_slot_3(ctx) {
    	let t;
    	let current;

    	const tab0 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab1 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tab0.$$.fragment);
    			t = space();
    			create_component(tab1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tab0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(tab1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				tab0_changes.$$scope = { dirty, ctx };
    			}

    			tab0.$set(tab0_changes);
    			const tab1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				tab1_changes.$$scope = { dirty, ctx };
    			}

    			tab1.$set(tab1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab0.$$.fragment, local);
    			transition_in(tab1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab0.$$.fragment, local);
    			transition_out(tab1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tab0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(tab1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(56:12) <TabList>",
    		ctx
    	});

    	return block;
    }

    // (61:12) <TabPanel>
    function create_default_slot_2(ctx) {
    	let current;
    	const astviewer = new ASTViewer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(astviewer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(astviewer, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(astviewer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(astviewer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(astviewer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(61:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (65:12) <TabPanel>
    function create_default_slot_1(ctx) {
    	let current;
    	const pageviewer = new PageViewer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(pageviewer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(pageviewer, target, anchor);
    			current = true;
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
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(65:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (55:8) <Tabs>
    function create_default_slot$1(ctx) {
    	let t0;
    	let t1;
    	let current;

    	const tablist = new TabList({
    			props: {
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel0 = new TabPanel({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tabpanel1 = new TabPanel({
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
    		},
    		m: function mount(target, anchor) {
    			mount_component(tablist, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tabpanel0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tabpanel1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tablist_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				tablist_changes.$$scope = { dirty, ctx };
    			}

    			tablist.$set(tablist_changes);
    			const tabpanel0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tablist.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tablist.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tablist, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tabpanel0, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tabpanel1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(55:8) <Tabs>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$r(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div2;
    	let div1;
    	let t1;
    	let div3;
    	let current;
    	const fileexplorer = new FileExplorer({ $$inline: true });
    	const documenteditor = new DocumentEditor({ $$inline: true });

    	const tabs = new Tabs({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			create_component(fileexplorer.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			create_component(documenteditor.$$.fragment);
    			t1 = space();
    			div3 = element("div");
    			create_component(tabs.$$.fragment);
    			attr_dev(div0, "class", "file-explorer svelte-ieo0kf");
    			add_location(div0, file$f, 45, 4, 1047);
    			attr_dev(div1, "class", "svelte-ieo0kf");
    			add_location(div1, file$f, 49, 8, 1157);
    			attr_dev(div2, "class", "document-editor svelte-ieo0kf");
    			add_location(div2, file$f, 48, 4, 1118);
    			attr_dev(div3, "class", "page-viewer svelte-ieo0kf");
    			add_location(div3, file$f, 53, 4, 1228);
    			attr_dev(div4, "class", "container svelte-ieo0kf");
    			add_location(div4, file$f, 44, 0, 1018);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			mount_component(fileexplorer, div0, null);
    			append_dev(div4, t0);
    			append_dev(div4, div2);
    			append_dev(div2, div1);
    			mount_component(documenteditor, div1, null);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			mount_component(tabs, div3, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tabs_changes = {};

    			if (dirty & /*$$scope*/ 1) {
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
    			if (detaching) detach_dev(div4);
    			destroy_component(fileexplorer);
    			destroy_component(documenteditor);
    			destroy_component(tabs);
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

    class EditorPage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$r, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditorPage",
    			options,
    			id: create_fragment$r.name
    		});
    	}
    }

    /* src\Pages\Home.svelte generated by Svelte v3.16.7 */

    const file$g = "src\\Pages\\Home.svelte";

    function create_fragment$s(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Home";
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
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$s, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$s.name
    		});
    	}
    }

    /* src\Pages\About.svelte generated by Svelte v3.16.7 */

    const file$h = "src\\Pages\\About.svelte";

    function create_fragment$t(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "About";
    			add_location(div, file$h, 0, 0, 0);
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
    		id: create_fragment$t.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$t, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$t.name
    		});
    	}
    }

    /* src\Components\NavButton.svelte generated by Svelte v3.16.7 */
    const file$i = "src\\Components\\NavButton.svelte";

    // (42:0) {:else}
    function create_else_block$2(ctx) {
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
    			add_location(span, file$i, 42, 4, 941);
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
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(42:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (36:0) {#if icon}
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
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			br = element("br");
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(i, "class", i_class_value = "" + (null_to_empty(/*icon*/ ctx[2]) + " svelte-6ucpud"));
    			add_location(i, file$i, 37, 8, 799);
    			add_location(br, file$i, 38, 8, 827);
    			attr_dev(span, "class", "nav-button icon svelte-6ucpud");
    			toggle_class(span, "selected", /*selected*/ ctx[1]);
    			toggle_class(span, "link", /*link*/ ctx[3]);
    			add_location(span, file$i, 36, 4, 716);
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
    		source: "(36:0) {#if icon}",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#if title && title.length > 0}
    function create_if_block_1$4(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*title*/ ctx[0]);
    			attr_dev(span, "class", "title");
    			add_location(span, file$i, 39, 39, 874);
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
    		source: "(40:8) {#if title && title.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$u(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*icon*/ ctx[2]) return create_if_block$7;
    		return create_else_block$2;
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
    		id: create_fragment$u.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$r, create_fragment$u, safe_not_equal, {
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
    			id: create_fragment$u.name
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
    const file$j = "src\\Components\\Menu.svelte";

    function create_fragment$v(ctx) {
    	let nav;
    	let t0;
    	let t1;
    	let current;

    	const navbutton0 = new NavButton({
    			props: {
    				href: "/",
    				icon: "fa fa-home",
    				title: "Home"
    			},
    			$$inline: true
    		});

    	const navbutton1 = new NavButton({
    			props: {
    				href: "about",
    				icon: "fa fa-cogs",
    				title: "Abount"
    			},
    			$$inline: true
    		});

    	const navbutton2 = new NavButton({
    			props: {
    				href: "editor",
    				icon: "fa fa-file",
    				title: "Editor"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			create_component(navbutton0.$$.fragment);
    			t0 = space();
    			create_component(navbutton1.$$.fragment);
    			t1 = space();
    			create_component(navbutton2.$$.fragment);
    			attr_dev(nav, "class", "svelte-1kf5xti");
    			add_location(nav, file$j, 19, 0, 376);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			mount_component(navbutton0, nav, null);
    			append_dev(nav, t0);
    			mount_component(navbutton1, nav, null);
    			append_dev(nav, t1);
    			mount_component(navbutton2, nav, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbutton0.$$.fragment, local);
    			transition_in(navbutton1.$$.fragment, local);
    			transition_in(navbutton2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbutton0.$$.fragment, local);
    			transition_out(navbutton1.$$.fragment, local);
    			transition_out(navbutton2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_component(navbutton0);
    			destroy_component(navbutton1);
    			destroy_component(navbutton2);
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

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$v, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$v.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.16.7 */
    const file$k = "src\\App.svelte";

    // (24:6) <Route path="/editor">
    function create_default_slot_2$1(ctx) {
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
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(24:6) <Route path=\\\"/editor\\\">",
    		ctx
    	});

    	return block;
    }

    // (28:6) <Route path="/">
    function create_default_slot_1$1(ctx) {
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
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(28:6) <Route path=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (20:0) <Router {url}>
    function create_default_slot$2(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let current;
    	const menu = new Menu({ $$inline: true });

    	const route0 = new Route({
    			props: {
    				path: "/editor",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route1 = new Route({
    			props: { path: "/about", component: About },
    			$$inline: true
    		});

    	const route2 = new Route({
    			props: {
    				path: "/",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			create_component(menu.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			create_component(route0.$$.fragment);
    			t1 = space();
    			create_component(route1.$$.fragment);
    			t2 = space();
    			create_component(route2.$$.fragment);
    			attr_dev(div0, "class", "page-content svelte-sl0cek");
    			add_location(div0, file$k, 22, 4, 489);
    			attr_dev(div1, "class", "root svelte-sl0cek");
    			add_location(div1, file$k, 20, 2, 451);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			mount_component(menu, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			mount_component(route0, div0, null);
    			append_dev(div0, t1);
    			mount_component(route1, div0, null);
    			append_dev(div0, t2);
    			mount_component(route2, div0, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const route0_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				route0_changes.$$scope = { dirty, ctx };
    			}

    			route0.$set(route0_changes);
    			const route2_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				route2_changes.$$scope = { dirty, ctx };
    			}

    			route2.$set(route2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(menu);
    			destroy_component(route0);
    			destroy_component(route1);
    			destroy_component(route2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(20:0) <Router {url}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$w(ctx) {
    	let current;

    	const router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
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
    		id: create_fragment$w.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self) {
    	let url = "";

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	return [url];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$s, create_fragment$w, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$w.name
    		});
    	}
    }

    const tokenizer = {
        brackets: [{ open: "{*", close: "*}", token: "delimiter.bracket" }],
        keywords: [
            "type",
            "record",
            "choice",
            "data",
            "open",
            "view",
            "process",
            "database",
            "extends",
            "extend",
            "service",
            "include",
            "error",
            "event",
            "operation",
            "pluck",
            "image",
            "chart",
            "task",
            "roadmap",
            "lane",
            "column",
        ],
        baseTypes: [
            "String",
            "Date",
            "DateTime",
            "Time",
            "Number",
            "Boolean",
            "Decimal"
        ],
        autoClosingPairs: [{ open: "{*", close: "*}" }],
        digits: /\d+(_+\d+)*/,
        tokenizer: {
            root: [
                { include: "@chapter" },
                { include: "@annotation" },
                { include: "@directive" },
                { include: "common" }
            ],
            qualified: [
                { include: "@whitespace" },
                { include: "@identifier" },
                ["", "", "@pop"]
            ],
            chapter: [[/#.*/, "chapter"]],
            annotation: [[/@.*/, "annotation"]],
            directive: [[/(%)(.*)(:)(.*)/, ["number", "annotation", "number", "word"]]],
            identifier: [
                [
                    /[A-Z][a-zA-Z0-9_-]*/,
                    {
                        cases: {
                            "@baseTypes": { token: "baseyype" },
                            "@default": { token: "identifier" }
                        }
                    },
                    [/\./, "delimiter"]
                ]
            ],
            litstring: [
                [/[^"]+/, 'string'],
                [/"/, { token: 'string.quote', next: '@pop' }]
            ],
            whitespace: [[/[ \t\v\f\r\n]+/, ""]],
            carLang: [
                [/(@digits)n?/, "number"],
                [/"/, { token: 'string.quote', next: '@litstring' }],
                [/\sif\s/, "keyword"],
                [/\selseif\s/, "keyword"],
                [/\selse\s*$/, "keyword"],
                [/\sendif\s*$/, "keyword"],
                [/\swhile\s/, "keyword"],
                [/\sendwhile\*$s/, "keyword"],
                [/\sas\s/, "keyword"],
                [/\sin\s/, "keyword"],
                [/\stype\s/, "keyword"],
                [/(extends)( [A-Z])/, ["keyword", "nothing"]],
                [/\/\/.*$/, "comment"],
            ],
            common: [
                [
                    /^.[a-z$][\w$]*/,
                    {
                        cases: {
                            "@keywords": { token: "keyword", next: "@qualified" }
                        }
                    }
                ]
            ]
        }
    };

    const theme = {
        base: "vs",
        inherit: true,
        rules: [
            { token: "chapter", foreground: "#ea5dd5" },
            { token: "annotation", foreground: "#800000" },
            { token: "identifier", foreground: "#00aa9e" },
            { token: "basetype", foreground: "#fdf8ea" }
        ]
    };

    monaco.languages.register({ id: "carlang" });
    monaco.languages.setMonarchTokensProvider("carlang", tokenizer);
    monaco.editor.defineTheme("carlangTheme", theme);


    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
