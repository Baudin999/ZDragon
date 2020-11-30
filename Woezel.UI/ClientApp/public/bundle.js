var woezel = (function () {
    'use strict';

    function noop() { }
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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

    /* src\Components\FileExplorer.svelte generated by Svelte v3.16.7 */

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
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

    class FileExplorer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FileExplorer",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const subscriber_queue = [];
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

    /* src\Components\Editor.svelte generated by Svelte v3.16.7 */
    const file = "src\\Components\\Editor.svelte";

    function create_fragment$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "editor svelte-1dng18m");
    			attr_dev(div, "id", /*id*/ ctx[1]);
    			add_location(div, file, 119, 0, 3474);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
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

    		editorContainer.addEventListener("resize", function () {
    			if (editor) editor.layout();
    		});
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

    		init(this, options, instance, create_fragment$1, safe_not_equal, {
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
    			id: create_fragment$1.name
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
    const file$1 = "src\\Components\\DocumentEditor.svelte";

    function create_fragment$2(ctx) {
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let div2;
    	let current;
    	const editor = new Editor({ $$inline: true });

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "header";
    			t1 = space();
    			div1 = element("div");
    			create_component(editor.$$.fragment);
    			t2 = space();
    			div2 = element("div");
    			div2.textContent = "footer";
    			attr_dev(div0, "class", "header svelte-nsna1v");
    			add_location(div0, file$1, 23, 4, 395);
    			attr_dev(div1, "class", "editor svelte-nsna1v");
    			add_location(div1, file$1, 25, 4, 435);
    			attr_dev(div2, "class", "footer svelte-nsna1v");
    			add_location(div2, file$1, 29, 4, 495);
    			attr_dev(div3, "class", "container svelte-nsna1v");
    			add_location(div3, file$1, 22, 0, 366);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			mount_component(editor, div1, null);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			current = true;
    		},
    		p: noop,
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class DocumentEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DocumentEditor",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Components\Page.svelte generated by Svelte v3.16.7 */

    const file$2 = "src\\Components\\Page.svelte";

    function create_fragment$3(ctx) {
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
    			add_location(pre, file$2, 26, 8, 538);
    			attr_dev(div0, "class", "page svelte-2mev25");
    			add_location(div0, file$2, 23, 4, 450);
    			attr_dev(div1, "class", "page-container");
    			add_location(div1, file$2, 22, 0, 416);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$1, create_fragment$3, safe_not_equal, { name: 0, content: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page",
    			options,
    			id: create_fragment$3.name
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
    const file$3 = "src\\Components\\PageViewer.svelte";

    function create_fragment$4(ctx) {
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
    			add_location(div0, file$3, 49, 4, 1037);
    			attr_dev(div1, "class", "page-wrapper svelte-ghxxov");
    			add_location(div1, file$3, 45, 0, 902);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { content } = $$props;
    	let container;

    	function resize() {
    		var scaleX = container.clientWidth / 900;

    		if (scaleX < 1) {
    			container.setAttribute("style", `transform: scale(${scaleX})`);
    		}
    	}

    	function watch() {
    		var ro = new ResizeObserver(resize);
    		ro.observe(container);
    	}

    	onMount(() => {
    		resize();
    		watch();
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
    		init(this, options, instance$2, create_fragment$4, safe_not_equal, { content: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PageViewer",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*content*/ ctx[0] === undefined && !("content" in props)) {
    			console.warn("<PageViewer> was created without expected prop 'content'");
    		}
    	}

    	get content() {
    		throw new Error("<PageViewer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<PageViewer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Components\Menu.svelte generated by Svelte v3.16.7 */

    const file$4 = "src\\Components\\Menu.svelte";

    function create_fragment$5(ctx) {
    	let div1;
    	let div0;
    	let i;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			i = element("i");
    			attr_dev(i, "class", "fa fa-files-o");
    			add_location(i, file$4, 7, 28, 164);
    			attr_dev(div0, "class", "menu--item svelte-j2htbq");
    			add_location(div0, file$4, 7, 4, 140);
    			attr_dev(div1, "class", "menu");
    			add_location(div1, file$4, 6, 0, 116);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, i);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
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

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\Pages\EditorPage.svelte generated by Svelte v3.16.7 */
    const file$5 = "src\\Pages\\EditorPage.svelte";

    function create_fragment$6(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let t2;
    	let div3;
    	let current;
    	const menu = new Menu({ $$inline: true });
    	const fileexplorer = new FileExplorer({ $$inline: true });
    	const documenteditor = new DocumentEditor({ $$inline: true });
    	const pageviewer = new PageViewer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			create_component(menu.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(fileexplorer.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			create_component(documenteditor.$$.fragment);
    			t2 = space();
    			div3 = element("div");
    			create_component(pageviewer.$$.fragment);
    			attr_dev(div0, "class", "menu svelte-1d1x9aa");
    			add_location(div0, file$5, 40, 4, 848);
    			attr_dev(div1, "class", "file-explorer svelte-1d1x9aa");
    			add_location(div1, file$5, 43, 4, 902);
    			attr_dev(div2, "class", "document-editor svelte-1d1x9aa");
    			add_location(div2, file$5, 46, 4, 973);
    			attr_dev(div3, "class", "page-viewer svelte-1d1x9aa");
    			add_location(div3, file$5, 49, 4, 1048);
    			attr_dev(div4, "class", "container svelte-1d1x9aa");
    			add_location(div4, file$5, 39, 0, 819);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			mount_component(menu, div0, null);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			mount_component(fileexplorer, div1, null);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			mount_component(documenteditor, div2, null);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			mount_component(pageviewer, div3, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			transition_in(fileexplorer.$$.fragment, local);
    			transition_in(documenteditor.$$.fragment, local);
    			transition_in(pageviewer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			transition_out(fileexplorer.$$.fragment, local);
    			transition_out(documenteditor.$$.fragment, local);
    			transition_out(pageviewer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(menu);
    			destroy_component(fileexplorer);
    			destroy_component(documenteditor);
    			destroy_component(pageviewer);
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

    class EditorPage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EditorPage",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.16.7 */
    const file$6 = "src\\App.svelte";

    function create_fragment$7(ctx) {
    	let div;
    	let current;
    	const editor = new EditorPage({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(editor.$$.fragment);
    			attr_dev(div, "class", "root svelte-197jov9");
    			add_location(div, file$6, 10, 0, 162);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(editor, div, null);
    			current = true;
    		},
    		p: noop,
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
    			if (detaching) detach_dev(div);
    			destroy_component(editor);
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

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
