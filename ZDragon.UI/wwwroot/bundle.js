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
    			attr_dev(div0, "class", "tab-list svelte-aq562r");
    			add_location(div0, file$1, 0, 0, 0);
    			attr_dev(div1, "class", "tab-list--sep svelte-aq562r");
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
    			attr_dev(button, "class", "svelte-ndv01m");
    			toggle_class(button, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
    			add_location(button, file$2, 30, 0, 514);
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
    			attr_dev(div, "class", "panel svelte-x2vmpr");
    			attr_dev(div, "style", /*style*/ ctx[0]);
    			add_location(div, file$3, 13, 0, 219);
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
    			attr_dev(div0, "class", "background svelte-ab2af5");
    			toggle_class(div0, "show", /*show*/ ctx[1]);
    			add_location(div0, file$4, 7, 0, 181);
    			attr_dev(i, "class", "fa fa-times svelte-ab2af5");
    			add_location(i, file$4, 12, 8, 304);
    			attr_dev(div1, "class", "title svelte-ab2af5");
    			add_location(div1, file$4, 10, 4, 258);
    			attr_dev(div2, "class", "content svelte-ab2af5");
    			add_location(div2, file$4, 15, 4, 382);
    			attr_dev(div3, "class", "modal svelte-ab2af5");
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

    var moduleStore = writable({});
    var selectModule = function (module) { return __awaiter(void 0, void 0, void 0, function () {
        var result, text, compilationResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getModuleText(module)];
                case 1:
                    result = _a.sent();
                    text = result.text;
                    compilationResult = result.compilationResult;
                    moduleStore.update(function (s) {
                        var nm = ((s === null || s === void 0 ? void 0 : s.modules) || {})[module.namespace] || module;
                        var m = __assign(__assign({}, nm), { text: text, compilationResult: compilationResult });
                        var modules = (s === null || s === void 0 ? void 0 : s.modules) || {};
                        modules[module.namespace] = m;
                        return __assign(__assign({}, s), { selectedModule: module.namespace, modules: modules });
                    });
                    return [2 /*return*/];
            }
        });
    }); };
    var parseCode = function (module, code) { return __awaiter(void 0, void 0, void 0, function () {
        var compilationResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!module || !code)
                        return [2 /*return*/];
                    return [4 /*yield*/, post("/document/" + module.namespace, { code: code })];
                case 1:
                    compilationResult = _a.sent();
                    moduleStore.update(function (s) {
                        var _a;
                        var m = __assign(__assign({}, module), { compilationResult: compilationResult });
                        var modules = __assign(__assign({}, s.modules), (_a = {}, _a[module.namespace] = m, _a));
                        return __assign(__assign({}, s), { modules: modules });
                    });
                    return [2 /*return*/];
            }
        });
    }); };
    var getModuleText = function (module) { return __awaiter(void 0, void 0, void 0, function () {
        var encodedURI, url, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!module)
                        return [2 /*return*/];
                    encodedURI = encodeURI(module.namespace);
                    url = "/document/" + encodedURI;
                    return [4 /*yield*/, get(url)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    }); };
    //# sourceMappingURL=module.js.map

    var stateStore = writable({});
    var toggleAddFileDialog = function () {
        stateStore.update(function (s) { return (__assign(__assign({}, s), { showAddFileDialog: !!!s.showAddFileDialog })); });
    };
    var toggleAddApplicationDialog = function () {
        stateStore.update(function (s) { return (__assign(__assign({}, s), { showAddApplicationDialog: !!!s.showAddApplicationDialog })); });
    };
    var getFiles = function () { return __awaiter(void 0, void 0, void 0, function () {
        var files;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, get("/domains")];
                case 1:
                    files = _a.sent();
                    stateStore.update(function (s) { return (__assign(__assign({}, s), { files: files })); });
                    return [2 /*return*/];
            }
        });
    }); };
    //# sourceMappingURL=state.js.map

    /* src\Components\FileExplorer\FileToolbar.svelte generated by Svelte v3.16.7 */

    const file$5 = "src\\Components\\FileExplorer\\FileToolbar.svelte";

    function create_fragment$8(ctx) {
    	let div2;
    	let div0;
    	let i0;
    	let t;
    	let div1;
    	let i1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			i0 = element("i");
    			t = space();
    			div1 = element("div");
    			i1 = element("i");
    			attr_dev(i0, "class", "fa fa-file-o svelte-t36d98");
    			add_location(i0, file$5, 8, 40, 206);
    			add_location(div0, file$5, 8, 4, 170);
    			attr_dev(i1, "class", "fa fa-folder-o svelte-t36d98");
    			add_location(i1, file$5, 10, 8, 297);
    			add_location(div1, file$5, 9, 4, 244);
    			attr_dev(div2, "class", "toolbar svelte-t36d98");
    			add_location(div2, file$5, 7, 0, 143);

    			dispose = [
    				listen_dev(div0, "click", toggleAddFileDialog, false, false, false),
    				listen_dev(div1, "click", toggleAddApplicationDialog, false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, i0);
    			append_dev(div2, t);
    			append_dev(div2, div1);
    			append_dev(div1, i1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
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

    class FileToolbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FileToolbar",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

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

    // (24:0) {#if application}
    function create_if_block$2(ctx) {
    	let div;
    	let title;
    	let i;
    	let t0_value = /*application*/ ctx[0].name + "";
    	let t0;
    	let t1;
    	let dispose;
    	let if_block = /*selectedApplication*/ ctx[1] === /*application*/ ctx[0].namespace && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			title = element("title");
    			i = element("i");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(i, "class", "fa fa-institution svelte-1w95vbt");
    			add_location(i, file$6, 26, 13, 794);
    			attr_dev(title, "class", "svelte-1w95vbt");
    			add_location(title, file$6, 25, 8, 744);
    			attr_dev(div, "class", "application svelte-1w95vbt");
    			add_location(div, file$6, 24, 4, 709);
    			dispose = listen_dev(title, "click", /*selectApplication*/ ctx[6], false, false, false);
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
    			if (dirty & /*application*/ 1 && t0_value !== (t0_value = /*application*/ ctx[0].name + "")) set_data_dev(t0, t0_value);

    			if (/*selectedApplication*/ ctx[1] === /*application*/ ctx[0].namespace) {
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
    		source: "(24:0) {#if application}",
    		ctx
    	});

    	return block;
    }

    // (28:8) {#if selectedApplication === application.namespace}
    function create_if_block_1$1(ctx) {
    	let div;
    	let t;
    	let if_block0 = /*components*/ ctx[4].length > 0 && create_if_block_3(ctx);
    	let if_block1 = /*features*/ ctx[3].length > 0 && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "class", "application--details svelte-1w95vbt");
    			add_location(div, file$6, 28, 12, 926);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t);
    			if (if_block1) if_block1.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*components*/ ctx[4].length > 0) if_block0.p(ctx, dirty);
    			if (/*features*/ ctx[3].length > 0) if_block1.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(28:8) {#if selectedApplication === application.namespace}",
    		ctx
    	});

    	return block;
    }

    // (30:16) {#if components.length > 0}
    function create_if_block_3(ctx) {
    	let h2;
    	let t1;
    	let each_1_anchor;
    	let each_value_1 = /*components*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
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
    			attr_dev(h2, "class", "svelte-1w95vbt");
    			add_location(h2, file$6, 30, 20, 1027);
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
    			if (dirty & /*components, $moduleStore, onClick*/ 52) {
    				each_value_1 = /*components*/ ctx[4];
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
    		source: "(30:16) {#if components.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (32:20) {#each components as node}
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
    			attr_dev(i, "class", "fa fa-cogs svelte-1w95vbt");
    			add_location(i, file$6, 37, 28, 1387);
    			attr_dev(div, "class", "item item--node svelte-1w95vbt");
    			toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			add_location(div, file$6, 32, 24, 1120);
    			dispose = listen_dev(div, "click", /*onClick*/ ctx[5](/*node*/ ctx[10]), false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*components, $moduleStore*/ 20) {
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
    		source: "(32:20) {#each components as node}",
    		ctx
    	});

    	return block;
    }

    // (43:16) {#if features.length > 0}
    function create_if_block_2(ctx) {
    	let h2;
    	let t1;
    	let each_1_anchor;
    	let each_value = /*features*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    			attr_dev(h2, "class", "svelte-1w95vbt");
    			add_location(h2, file$6, 43, 20, 1573);
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
    			if (dirty & /*features, $moduleStore, onClick*/ 44) {
    				each_value = /*features*/ ctx[3];
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
    		source: "(43:16) {#if features.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (45:20) {#each features as node}
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
    			attr_dev(i, "class", "fa fa-diamond svelte-1w95vbt");
    			add_location(i, file$6, 50, 28, 1929);
    			attr_dev(div, "class", "item item--node svelte-1w95vbt");
    			toggle_class(div, "selected", /*node*/ ctx[10].namespace == /*$moduleStore*/ ctx[2].selectedModule);
    			add_location(div, file$6, 45, 24, 1662);
    			dispose = listen_dev(div, "click", /*onClick*/ ctx[5](/*node*/ ctx[10]), false, false, false);
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
    		id: create_each_block.name,
    		type: "each",
    		source: "(45:20) {#each features as node}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let if_block_anchor;
    	let if_block = /*application*/ ctx[0] && create_if_block$2(ctx);

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
    			if (/*application*/ ctx[0]) {
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

    function instance$8($$self, $$props, $$invalidate) {
    	let $moduleStore;
    	validate_store(moduleStore, "moduleStore");
    	component_subscribe($$self, moduleStore, $$value => $$invalidate(2, $moduleStore = $$value));
    	let { application = null } = $$props;
    	let selectedApplication = null;
    	let f = n => (application.modules || []).filter(m => m.fileType === n);
    	let features = f("Feature");
    	let databases = f("Database");
    	let endpoints = f("Endpoint");
    	let components = f("Component");
    	let onClick = module => () => selectModule(module);

    	let selectApplication = () => {
    		if (selectedApplication) $$invalidate(1, selectedApplication = null); else {
    			$$invalidate(1, selectedApplication = application.namespace);
    		}
    	};

    	const writable_props = ["application"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Application> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("application" in $$props) $$invalidate(0, application = $$props.application);
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
    		if ("application" in $$props) $$invalidate(0, application = $$props.application);
    		if ("selectedApplication" in $$props) $$invalidate(1, selectedApplication = $$props.selectedApplication);
    		if ("f" in $$props) f = $$props.f;
    		if ("features" in $$props) $$invalidate(3, features = $$props.features);
    		if ("databases" in $$props) databases = $$props.databases;
    		if ("endpoints" in $$props) endpoints = $$props.endpoints;
    		if ("components" in $$props) $$invalidate(4, components = $$props.components);
    		if ("onClick" in $$props) $$invalidate(5, onClick = $$props.onClick);
    		if ("selectApplication" in $$props) $$invalidate(6, selectApplication = $$props.selectApplication);
    		if ("$moduleStore" in $$props) moduleStore.set($moduleStore = $$props.$moduleStore);
    	};

    	return [
    		application,
    		selectedApplication,
    		$moduleStore,
    		features,
    		components,
    		onClick,
    		selectApplication
    	];
    }

    class Application extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, { application: 0 });

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
    }

    /* src\Components\FileExplorer\FileExplorer.svelte generated by Svelte v3.16.7 */
    const file$7 = "src\\Components\\FileExplorer\\FileExplorer.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (22:4) {#each applications as application}
    function create_each_block$1(ctx) {
    	let current;

    	const application = new Application({
    			props: { application: /*application*/ ctx[1] },
    			$$inline: true
    		});

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
    			if (dirty & /*applications*/ 1) application_changes.application = /*application*/ ctx[1];
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
    		source: "(22:4) {#each applications as application}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div;
    	let t;
    	let current;
    	const filetoolbar = new FileToolbar({ $$inline: true });
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
    			create_component(filetoolbar.$$.fragment);
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "file-explorer svelte-kfz6yl");
    			add_location(div, file$7, 18, 0, 538);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(filetoolbar, div, null);
    			append_dev(div, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*applications*/ 1) {
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
    			transition_in(filetoolbar.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(filetoolbar.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(filetoolbar);
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

    function instance$9($$self, $$props, $$invalidate) {
    	getFiles();
    	var applications = [];

    	stateStore.subscribe(({ files = {} }) => {
    		$$invalidate(0, applications = files.applications || []);
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("applications" in $$props) $$invalidate(0, applications = $$props.applications);
    	};

    	return [applications];
    }

    class FileExplorer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FileExplorer",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\Components\Editor.svelte generated by Svelte v3.16.7 */
    const file$8 = "src\\Components\\Editor.svelte";

    function create_fragment$b(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "editor svelte-1dng18m");
    			attr_dev(div, "id", /*id*/ ctx[1]);
    			add_location(div, file$8, 121, 0, 3933);
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
    		id: create_fragment$b.name,
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
    			fontSize: "16px",
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
    		if (editor.hasTextFocus()) {
    			if ((e.ctrlKey === true || e.metaKey == true) && e.key == "s") {
    				dispatch("save", editor.getValue());
    				onKeyPress(e, editor.getValue());
    				e.preventDefault();
    				return false;
    			} else if (language === "carlang" && e.key == "F2") {
    				var wordUnderCursor = editor.getModel().getWordAtPosition(editor.getPosition());

    				if (wordUnderCursor && wordUnderCursor.word) {
    					selectWord(wordUnderCursor.word);
    				}
    			}
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

    		init(this, options, instance$a, create_fragment$b, safe_not_equal, {
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
    }

    /* src\Components\DocumentEditor.svelte generated by Svelte v3.16.7 */
    const file$9 = "src\\Components\\DocumentEditor.svelte";

    function create_fragment$c(ctx) {
    	let div2;
    	let div0;

    	let t0_value = (/*module*/ ctx[0]
    	? /*module*/ ctx[0].namespace || /*module*/ ctx[0].path
    	: "unknown file") + "";

    	let t0;
    	let t1;
    	let div1;
    	let current;

    	const editor = new Editor({
    			props: {
    				text: /*text*/ ctx[1],
    				markers: /*markers*/ ctx[3],
    				language: /*type*/ ctx[2]
    			},
    			$$inline: true
    		});

    	editor.$on("save", /*onSave*/ ctx[4]);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			create_component(editor.$$.fragment);
    			attr_dev(div0, "class", "header svelte-whjbup");
    			add_location(div0, file$9, 56, 4, 2162);
    			attr_dev(div1, "class", "editor svelte-whjbup");
    			add_location(div1, file$9, 60, 4, 2271);
    			attr_dev(div2, "class", "container svelte-whjbup");
    			add_location(div2, file$9, 55, 0, 2133);
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
    			if ((!current || dirty & /*module*/ 1) && t0_value !== (t0_value = (/*module*/ ctx[0]
    			? /*module*/ ctx[0].namespace || /*module*/ ctx[0].path
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
    		$$invalidate(0, module = value.modules[value.selectedModule]);

    		if (!module) {
    			$$invalidate(1, text = "");
    			markers.set([]);
    			return;
    		}

    		$$invalidate(1, text = module.text);

    		var errors = ((_a = module.compilationResult) === null || _a === void 0
    		? void 0
    		: _a.errors) || [];

    		var mappedErrors = errors.map(mapErrorToken);
    		markers.set(mappedErrors);

    		if (module && module.path && module.path.endsWith(".json")) {
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
    		if ("module" in $$props) $$invalidate(0, module = $$props.module);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("type" in $$props) $$invalidate(2, type = $$props.type);
    		if ("markers" in $$props) $$invalidate(3, markers = $$props.markers);
    		if ("onSave" in $$props) $$invalidate(4, onSave = $$props.onSave);
    		if ("mapErrorToken" in $$props) mapErrorToken = $$props.mapErrorToken;
    	};

    	return [module, text, type, markers, onSave];
    }

    class DocumentEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DocumentEditor",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src\Forms\CreateFile.svelte generated by Svelte v3.16.7 */
    const file_1 = "src\\Forms\\CreateFile.svelte";

    function create_fragment$d(ctx) {
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
    			add_location(label0, file_1, 31, 8, 885);
    			attr_dev(input0, "id", "cf_001");
    			add_location(input0, file_1, 32, 8, 932);
    			attr_dev(div0, "class", "form--field");
    			add_location(div0, file_1, 30, 4, 850);
    			attr_dev(label1, "for", "cf_002");
    			add_location(label1, file_1, 36, 8, 1040);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file_1, 38, 12, 1167);
    			option1.__value = "Component";
    			option1.value = option1.__value;
    			add_location(option1, file_1, 39, 12, 1191);
    			option2.__value = "Feature";
    			option2.value = option2.__value;
    			add_location(option2, file_1, 40, 12, 1231);
    			option3.__value = "Database";
    			option3.value = option3.__value;
    			add_location(option3, file_1, 41, 12, 1269);
    			option4.__value = "Endpoint";
    			option4.value = option4.__value;
    			add_location(option4, file_1, 42, 12, 1308);
    			option5.__value = "Model";
    			option5.value = option5.__value;
    			add_location(option5, file_1, 43, 12, 1347);
    			option6.__value = "Empty";
    			option6.value = option6.__value;
    			add_location(option6, file_1, 44, 12, 1383);
    			attr_dev(select, "id", "cf_002");
    			add_location(select, file_1, 37, 8, 1082);
    			attr_dev(div1, "class", "form--field");
    			add_location(div1, file_1, 35, 4, 1005);
    			attr_dev(label2, "for", "cf_003");
    			add_location(label2, file_1, 49, 8, 1479);
    			attr_dev(input1, "id", "cf_003");
    			add_location(input1, file_1, 50, 8, 1533);
    			attr_dev(div2, "class", "form--field");
    			add_location(div2, file_1, 48, 4, 1444);
    			attr_dev(label3, "for", "cf_004");
    			add_location(label3, file_1, 54, 8, 1644);
    			attr_dev(textarea, "id", "cf_004");
    			add_location(textarea, file_1, 55, 8, 1693);
    			attr_dev(div3, "class", "form--field");
    			add_location(div3, file_1, 53, 4, 1609);
    			attr_dev(button, "type", "button");
    			add_location(button, file_1, 58, 4, 1776);
    			attr_dev(form, "class", "form");
    			add_location(form, file_1, 29, 0, 825);

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
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
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
    				getFiles();
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
    		init(this, options, instance$c, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateFile",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src\Forms\CreateApplication.svelte generated by Svelte v3.16.7 */
    const file$a = "src\\Forms\\CreateApplication.svelte";

    function create_fragment$e(ctx) {
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
    			add_location(label, file$a, 29, 8, 827);
    			attr_dev(input, "id", "ca_001");
    			add_location(input, file$a, 30, 8, 881);
    			attr_dev(div, "class", "form--field");
    			add_location(div, file$a, 28, 4, 792);
    			attr_dev(button, "type", "button");
    			add_location(button, file$a, 33, 4, 954);
    			attr_dev(form, "class", "form");
    			add_location(form, file$a, 27, 0, 767);

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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
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
    				getFiles();
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
    		init(this, options, instance$d, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateApplication",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src\Pages\EditorPage.svelte generated by Svelte v3.16.7 */
    const file$b = "src\\Pages\\EditorPage.svelte";

    // (62:16) <Tab>
    function create_default_slot_12(ctx) {
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
    		id: create_default_slot_12.name,
    		type: "slot",
    		source: "(62:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (63:16) <Tab>
    function create_default_slot_11(ctx) {
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
    		id: create_default_slot_11.name,
    		type: "slot",
    		source: "(63:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (64:16) <Tab>
    function create_default_slot_10(ctx) {
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
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(64:16) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (61:12) <TabList>
    function create_default_slot_9(ctx) {
    	let t0;
    	let t1;
    	let current;

    	const tab0 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_12] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab1 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_11] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const tab2 = new Tab({
    			props: {
    				$$slots: { default: [create_default_slot_10] },
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
    		},
    		m: function mount(target, anchor) {
    			mount_component(tab0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tab1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tab2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab0_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				tab0_changes.$$scope = { dirty, ctx };
    			}

    			tab0.$set(tab0_changes);
    			const tab1_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				tab1_changes.$$scope = { dirty, ctx };
    			}

    			tab1.$set(tab1_changes);
    			const tab2_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				tab2_changes.$$scope = { dirty, ctx };
    			}

    			tab2.$set(tab2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab0.$$.fragment, local);
    			transition_in(tab1.$$.fragment, local);
    			transition_in(tab2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab0.$$.fragment, local);
    			transition_out(tab1.$$.fragment, local);
    			transition_out(tab2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tab0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tab1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tab2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(61:12) <TabList>",
    		ctx
    	});

    	return block;
    }

    // (68:16) {#if htmlUrl}
    function create_if_block_2$1(ctx) {
    	let current;

    	const panel = new Panel({
    			props: {
    				style: "background:lightgray; height: calc(100% - 3rem); margin-top: 3rem; padding: 0; padding-top: 2rem;",
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

    			if (dirty & /*$$scope, htmlUrl, iframe*/ 2057) {
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
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(68:16) {#if htmlUrl}",
    		ctx
    	});

    	return block;
    }

    // (69:20) <Panel                          style="background:lightgray; height: calc(100% - 3rem); margin-top: 3rem; padding: 0; padding-top: 2rem;">
    function create_default_slot_8(ctx) {
    	let iframe_1;
    	let iframe_1_src_value;

    	const block = {
    		c: function create() {
    			iframe_1 = element("iframe");
    			attr_dev(iframe_1, "class", "html-iframe svelte-l9ppwg");
    			if (iframe_1.src !== (iframe_1_src_value = /*htmlUrl*/ ctx[3])) attr_dev(iframe_1, "src", iframe_1_src_value);
    			attr_dev(iframe_1, "title", "Page");
    			add_location(iframe_1, file$b, 71, 24, 2564);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, iframe_1, anchor);
    			/*iframe_1_binding*/ ctx[10](iframe_1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*htmlUrl*/ 8 && iframe_1.src !== (iframe_1_src_value = /*htmlUrl*/ ctx[3])) {
    				attr_dev(iframe_1, "src", iframe_1_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(iframe_1);
    			/*iframe_1_binding*/ ctx[10](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(69:20) <Panel                          style=\\\"background:lightgray; height: calc(100% - 3rem); margin-top: 3rem; padding: 0; padding-top: 2rem;\\\">",
    		ctx
    	});

    	return block;
    }

    // (67:12) <TabPanel>
    function create_default_slot_7(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*htmlUrl*/ ctx[3] && create_if_block_2$1(ctx);

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
    			if (/*htmlUrl*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_2$1(ctx);
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
    		source: "(67:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (83:20) {#if svgUrl}
    function create_if_block_1$2(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "alt", "svg");
    			if (img.src !== (img_src_value = /*componentUrl*/ ctx[2])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-l9ppwg");
    			add_location(img, file$b, 83, 24, 2945);
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
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(83:20) {#if svgUrl}",
    		ctx
    	});

    	return block;
    }

    // (82:16) <Panel>
    function create_default_slot_6(ctx) {
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
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(82:16) <Panel>",
    		ctx
    	});

    	return block;
    }

    // (81:12) <TabPanel>
    function create_default_slot_5(ctx) {
    	let current;

    	const panel = new Panel({
    			props: {
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

    			if (dirty & /*$$scope, svgUrl, componentUrl*/ 2054) {
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
    		source: "(81:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (91:20) {#if componentUrl}
    function create_if_block$3(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "alt", "svg");
    			if (img.src !== (img_src_value = /*svgUrl*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-l9ppwg");
    			add_location(img, file$b, 91, 24, 3176);
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
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(91:20) {#if componentUrl}",
    		ctx
    	});

    	return block;
    }

    // (90:16) <Panel>
    function create_default_slot_4(ctx) {
    	let if_block_anchor;
    	let if_block = /*componentUrl*/ ctx[2] && create_if_block$3(ctx);

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
    			if (/*componentUrl*/ ctx[2]) {
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
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(90:16) <Panel>",
    		ctx
    	});

    	return block;
    }

    // (89:12) <TabPanel>
    function create_default_slot_3(ctx) {
    	let current;

    	const panel = new Panel({
    			props: {
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

    			if (dirty & /*$$scope, componentUrl, svgUrl*/ 2054) {
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
    		source: "(89:12) <TabPanel>",
    		ctx
    	});

    	return block;
    }

    // (60:8) <Tabs>
    function create_default_slot_2(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let current;

    	const tablist = new TabList({
    			props: {
    				$$slots: { default: [create_default_slot_9] },
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

    	const block = {
    		c: function create() {
    			create_component(tablist.$$.fragment);
    			t0 = space();
    			create_component(tabpanel0.$$.fragment);
    			t1 = space();
    			create_component(tabpanel1.$$.fragment);
    			t2 = space();
    			create_component(tabpanel2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tablist, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tabpanel0, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tabpanel1, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(tabpanel2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tablist_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				tablist_changes.$$scope = { dirty, ctx };
    			}

    			tablist.$set(tablist_changes);
    			const tabpanel0_changes = {};

    			if (dirty & /*$$scope, htmlUrl, iframe*/ 2057) {
    				tabpanel0_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel0.$set(tabpanel0_changes);
    			const tabpanel1_changes = {};

    			if (dirty & /*$$scope, svgUrl, componentUrl*/ 2054) {
    				tabpanel1_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel1.$set(tabpanel1_changes);
    			const tabpanel2_changes = {};

    			if (dirty & /*$$scope, componentUrl, svgUrl*/ 2054) {
    				tabpanel2_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel2.$set(tabpanel2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tablist.$$.fragment, local);
    			transition_in(tabpanel0.$$.fragment, local);
    			transition_in(tabpanel1.$$.fragment, local);
    			transition_in(tabpanel2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tablist.$$.fragment, local);
    			transition_out(tabpanel0.$$.fragment, local);
    			transition_out(tabpanel1.$$.fragment, local);
    			transition_out(tabpanel2.$$.fragment, local);
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
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(60:8) <Tabs>",
    		ctx
    	});

    	return block;
    }

    // (103:4) <Modal          title="Add File"          show={showAddFileDialog}          close={toggleAddFileDialog}>
    function create_default_slot_1(ctx) {
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
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(103:4) <Modal          title=\\\"Add File\\\"          show={showAddFileDialog}          close={toggleAddFileDialog}>",
    		ctx
    	});

    	return block;
    }

    // (109:4) <Modal          title="Add Application"          show={showAddApplicationDialog}          close={toggleAddApplicationDialog}>
    function create_default_slot(ctx) {
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
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(109:4) <Modal          title=\\\"Add Application\\\"          show={showAddApplicationDialog}          close={toggleAddApplicationDialog}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
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
    	let t3;
    	let t4;
    	let current;
    	let dispose;
    	const fileexplorer = new FileExplorer({ $$inline: true });
    	const documenteditor = new DocumentEditor({ $$inline: true });

    	const tabs = new Tabs({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const modal0 = new Modal({
    			props: {
    				title: "Add File",
    				show: /*showAddFileDialog*/ ctx[5],
    				close: toggleAddFileDialog,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const modal1 = new Modal({
    			props: {
    				title: "Add Application",
    				show: /*showAddApplicationDialog*/ ctx[4],
    				close: toggleAddApplicationDialog,
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
    			t3 = space();
    			create_component(modal0.$$.fragment);
    			t4 = space();
    			create_component(modal1.$$.fragment);
    			attr_dev(div0, "class", "file-explorer--container svelte-l9ppwg");
    			add_location(div0, file$b, 50, 4, 1861);
    			attr_dev(div1, "class", "svelte-l9ppwg");
    			add_location(div1, file$b, 54, 8, 1982);
    			attr_dev(div2, "class", "document-editor svelte-l9ppwg");
    			add_location(div2, file$b, 53, 4, 1943);
    			attr_dev(i, "class", "fa fa-print svelte-l9ppwg");
    			add_location(i, file$b, 98, 12, 3370);
    			attr_dev(div3, "class", "print-button svelte-l9ppwg");
    			add_location(div3, file$b, 97, 8, 3313);
    			attr_dev(div4, "class", "page-viewer svelte-l9ppwg");
    			add_location(div4, file$b, 58, 4, 2053);
    			attr_dev(div5, "class", "container svelte-l9ppwg");
    			add_location(div5, file$b, 49, 0, 1832);
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
    			append_dev(div5, t3);
    			mount_component(modal0, div5, null);
    			append_dev(div5, t4);
    			mount_component(modal1, div5, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tabs_changes = {};

    			if (dirty & /*$$scope, componentUrl, svgUrl, htmlUrl, iframe*/ 2063) {
    				tabs_changes.$$scope = { dirty, ctx };
    			}

    			tabs.$set(tabs_changes);
    			const modal0_changes = {};
    			if (dirty & /*showAddFileDialog*/ 32) modal0_changes.show = /*showAddFileDialog*/ ctx[5];

    			if (dirty & /*$$scope*/ 2048) {
    				modal0_changes.$$scope = { dirty, ctx };
    			}

    			modal0.$set(modal0_changes);
    			const modal1_changes = {};
    			if (dirty & /*showAddApplicationDialog*/ 16) modal1_changes.show = /*showAddApplicationDialog*/ ctx[4];

    			if (dirty & /*$$scope*/ 2048) {
    				modal1_changes.$$scope = { dirty, ctx };
    			}

    			modal1.$set(modal1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fileexplorer.$$.fragment, local);
    			transition_in(documenteditor.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			transition_in(modal0.$$.fragment, local);
    			transition_in(modal1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fileexplorer.$$.fragment, local);
    			transition_out(documenteditor.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			transition_out(modal0.$$.fragment, local);
    			transition_out(modal1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(fileexplorer);
    			destroy_component(documenteditor);
    			destroy_component(tabs);
    			destroy_component(modal0);
    			destroy_component(modal1);
    			dispose();
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

    function instance$e($$self, $$props, $$invalidate) {
    	let iframe;
    	let timeout;
    	let module;
    	let svgUrl;
    	let componentUrl;
    	let htmlUrl;

    	const generateUrls = () => {
    		if (!module || !module.namespace) return;
    		var ns = module.namespace;
    		$$invalidate(1, svgUrl = `/documents/${ns}/data.svg?timestamp=${new Date().getMilliseconds()}`);
    		$$invalidate(2, componentUrl = `/documents/${ns}/components.svg?timestamp=${new Date().getMilliseconds()}`);
    		$$invalidate(3, htmlUrl = `/documents/${ns}/page.html?timestamp=${new Date().getMilliseconds()}`);
    	};

    	moduleStore.subscribe(s => {
    		if (timeout) clearTimeout(timeout);

    		timeout = setTimeout(
    			() => {
    				if (!s || !s.selectedModule || !s.modules) {
    					$$invalidate(1, svgUrl = undefined);
    					$$invalidate(2, componentUrl = undefined);
    					$$invalidate(3, htmlUrl = undefined);
    					return;
    				}

    				module = s.modules[s.selectedModule];
    				generateUrls();
    			},
    			2000
    		);
    	});

    	let showAddApplicationDialog = false;
    	let showAddFileDialog = false;

    	stateStore.subscribe(s => {
    		$$invalidate(5, showAddFileDialog = !!s.showAddFileDialog);
    		$$invalidate(4, showAddApplicationDialog = !!s.showAddApplicationDialog);
    	});

    	let print = () => {
    		iframe.contentWindow.focus();
    		iframe.contentWindow.print();
    	};

    	function iframe_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, iframe = $$value);
    		});
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("iframe" in $$props) $$invalidate(0, iframe = $$props.iframe);
    		if ("timeout" in $$props) timeout = $$props.timeout;
    		if ("module" in $$props) module = $$props.module;
    		if ("svgUrl" in $$props) $$invalidate(1, svgUrl = $$props.svgUrl);
    		if ("componentUrl" in $$props) $$invalidate(2, componentUrl = $$props.componentUrl);
    		if ("htmlUrl" in $$props) $$invalidate(3, htmlUrl = $$props.htmlUrl);
    		if ("showAddApplicationDialog" in $$props) $$invalidate(4, showAddApplicationDialog = $$props.showAddApplicationDialog);
    		if ("showAddFileDialog" in $$props) $$invalidate(5, showAddFileDialog = $$props.showAddFileDialog);
    		if ("print" in $$props) $$invalidate(6, print = $$props.print);
    	};

    	return [
    		iframe,
    		svgUrl,
    		componentUrl,
    		htmlUrl,
    		showAddApplicationDialog,
    		showAddFileDialog,
    		print,
    		timeout,
    		module,
    		generateUrls,
    		iframe_1_binding
    	];
    }

    class EditorPage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditorPage",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src\Pages\Home.svelte generated by Svelte v3.16.7 */

    const file$c = "src\\Pages\\Home.svelte";

    function create_fragment$g(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Home";
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
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src\Pages\About.svelte generated by Svelte v3.16.7 */

    const file$d = "src\\Pages\\About.svelte";

    function create_fragment$h(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "About";
    			add_location(div, file$d, 0, 0, 0);
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
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src\Components\NavButton.svelte generated by Svelte v3.16.7 */
    const file$e = "src\\Components\\NavButton.svelte";

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
    			add_location(span, file$e, 42, 4, 941);
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
    function create_if_block$4(ctx) {
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
    			add_location(i, file$e, 37, 8, 799);
    			add_location(br, file$e, 38, 8, 827);
    			attr_dev(span, "class", "nav-button icon svelte-6ucpud");
    			toggle_class(span, "selected", /*selected*/ ctx[1]);
    			toggle_class(span, "link", /*link*/ ctx[3]);
    			add_location(span, file$e, 36, 4, 716);
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
    		id: create_if_block$4.name,
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
    			add_location(span, file$e, 39, 39, 874);
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

    function create_fragment$i(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*icon*/ ctx[2]) return create_if_block$4;
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
    		id: create_fragment$i.name,
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

    		init(this, options, instance$f, create_fragment$i, safe_not_equal, {
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
    			id: create_fragment$i.name
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
    const file$f = "src\\Components\\Menu.svelte";

    function create_fragment$j(ctx) {
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
    			add_location(nav, file$f, 19, 0, 376);
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
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.16.7 */
    const file$g = "src\\App.svelte";

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
    function create_default_slot$1(ctx) {
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
    			add_location(div0, file$g, 22, 4, 489);
    			attr_dev(div1, "class", "root svelte-sl0cek");
    			add_location(div1, file$g, 20, 2, 451);
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
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(20:0) <Router {url}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$k(ctx) {
    	let current;

    	const router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot$1] },
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
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self) {
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
    		init(this, options, instance$g, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$k.name
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
                [/(%)([^:]*)(:)/, ["number", "annotation", "number"], "@directive_inner.$1"],
                [/(%)([^:]*)/, ["number", "annotation"]],
            ],
            directive_inner: [
                [/.+/, "number", "@pop"],
                [/([\t\s{4}])([^:]*)(:)([^:]*)/, ["word", "annotation", "number", "word"]]
            ],
            lang: [
                [/^([a-z][^ ]*)/, [
                    {
                        cases: {
                            "open": { token: "keyword" },
                            "record": { token: "keyword", next: "@record" },
                            "type": { token: "keyword", next: "@type" },
                            "choice": { token: "keyword", next: "@choice" },
                            "data": { token: "keyword", next: "@data" },
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
                //[/([\t\s{4}])([^:]*)(:)([^;]+)(;)/, ["nothing", "nothing", "number", { token: "", next: "@decode_type.$4" }, "number"], "@field"],
                //[/([\t\s{4}])([^:]*)(:)([^;]+)/, ["nothing", "nothing", "number", { token: "", next: "@decode_type.$4" }], "@field"],
                //[/( *)(&)( *)([^ ]+)/, ["", "number", "", "annotation"]],
                // [';', 'number', "@field"],
                { include: "lang" }
            ],
            attributes: [
                [/([A-Z][a-zA-Z ]*)(:)/, ["type.identifier", "number"]],
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
        base: "vs",
        inherit: true,
        rules: [
            { token: "chapter", foreground: "#ea5dd5" },
            { token: "annotation", foreground: "#800000" },
            { token: "identifier", foreground: "#00aa9e" },
            { token: "basetype", foreground: "#fdf8ea" },
            { token: "generic-parameter", foreground: "#ea5dd5" },
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
