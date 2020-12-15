
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
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
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
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
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
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
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const locations = (substring, string) => {
    	let a = [],
    		i = -1;
    	while ((i = string.indexOf(substring, i + 1)) >= 0) a.push(i);
    	return a;
    };

    const makePairsOfMatchingIndecies = (substring, string) => {
    	const locs = locations(substring, string);

    	const pairs = locs.reduce((res, v, i, arr) => {
    		if (i % 2 === 0) res.push(arr.slice(i, i + 2));
    		return res;
    	}, []);

    	return pairs;
    };

    const getSelectionAndPosition = (element) => {
    	const selection = window.getSelection();
    	const range = selection.getRangeAt(0);
    	range.setStart(element, 0);
    	const position = range.toString().length;

    	return [selection, position];
    };

    // fanstatic solution from
    // https://stackoverflow.com/a/38479462
    const saveCaretPosition = (element, offset = 0) => {
    	const [selection, position] = getSelectionAndPosition(element);

    	return () => {
    		// restore the position of the cursor
    		const pos = getTextNodeAtPosition(element, position + offset);
    		selection.removeAllRanges();
    		const range = new Range();
    		range.setStart(pos.node, pos.position);
    		selection.addRange(range);
    	};
    };

    const getCaretPosition = (element) => {
    	const [selection, position] = getSelectionAndPosition(element);
    	return getTextNodeAtPosition(element, position);
    };

    const getTextNodeAtPosition = (root, index) => {
    	const treeWalker = document.createTreeWalker(
    		root,
    		NodeFilter.SHOW_TEXT,
    		(elem) => {
    			if (index > elem.textContent.length) {
    				index -= elem.textContent.length;
    				return NodeFilter.FILTER_REJECT;
    			}
    			return NodeFilter.FILTER_ACCEPT;
    		}
    	);
    	const c = treeWalker.nextNode();
    	return {
    		node: c ? c : root,
    		position: index,
    	};
    };

    /* src\Editor.svelte generated by Svelte v3.31.0 */
    const file = "src\\Editor.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			attr_dev(div, "id", "editable");
    			attr_dev(div, "contenteditable", "true");
    			attr_dev(div, "class", "svelte-1ucb901");
    			if (/*html*/ ctx[0] === void 0) add_render_callback(() => /*div_input_handler*/ ctx[6].call(div));
    			add_location(div, file, 151, 1, 5066);
    			add_location(main, file, 150, 0, 5057);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			/*div_binding*/ ctx[5](div);

    			if (/*html*/ ctx[0] !== void 0) {
    				div.innerHTML = /*html*/ ctx[0];
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "input", /*div_input_handler*/ ctx[6]),
    					listen_dev(div, "keydown", /*onKeyDown*/ ctx[2], false, false, false),
    					listen_dev(div, "paste", stop_propagation(prevent_default(/*onPaste*/ ctx[3])), false, true, true)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*html*/ 1 && /*html*/ ctx[0] !== div.innerHTML) {
    				div.innerHTML = /*html*/ ctx[0];
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*div_binding*/ ctx[5](null);
    			mounted = false;
    			run_all(dispose);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Editor", slots, []);
    	let { html } = $$props;
    	let { textToAdd } = $$props;

    	const entities = [
    		{ e: "**", t: ["<b>", "</b>"] },
    		{ e: "__", t: ["<strong>", "</strong>"] },
    		{ e: "*", t: ["<em>", "</em>"] },
    		{ e: "_", t: ["<em>", "</em>"] },
    		{ e: "`", t: ["<code>", "</code>"] },
    		{ e: "#", t: ["<cite>", "</cite>"] }
    	];

    	let setCursorPosition = null;
    	let editorElement = null;

    	const checkForMissingMarkdownAndRemoveTags = (entity, tags, html) => {
    		const pairs = makePairsOfMatchingIndecies(entity, html);

    		for (const pair of pairs) {
    			if (pair.length === 1) {
    				// determine if this is the start or end of a tag 
    				const pre = html.substring(pair[0] + entity.length, pair[0] + tags[0].length + entity.length);

    				const post = html.substring(pair[0] - tags[1].length, pair[0]);

    				if (pre === tags[0]) {
    					// this is the first tag, so there's an unmatched closing tag after it somewhere 
    					const end = html.substring(pair[0]).indexOf(tags[1]) + html.substring(0, pair[0]).length;

    					// now remove both the opening and closing tags 
    					return html.substring(0, pair[0] + entity.length) + html.substring(pair[0] + tags[0].length + entity.length, end) + html.substring(end + tags[1].length);
    				} else if (post === tags[1]) {
    					// this is the second tag, so there's an unmatched opening tag 
    					const start = html.substring(0, pair[0]).lastIndexOf(tags[0]);

    					return html.substring(0, start) + html.substring(start + tags[0].length, pair[0] - tags[1].length) + html.substring(pair[0]);
    				}
    			}
    		}
    	};

    	const checkForMarkdownAndInsertTags = (entity, tags, html) => {
    		const pairs = makePairsOfMatchingIndecies(entity, html);

    		for (const pair of pairs) {
    			if (pair.length === 2 && pair[0] + 1 !== pair[1]) {
    				// get the positions that the tags should exist if they did 
    				const pre = html.substring(pair[0] + entity.length, pair[0] + tags[0].length + entity.length);

    				const pre2 = html.substring(pair[1] + entity.length, pair[1] + tags[0].length + entity.length);
    				const post = html.substring(pair[1] - tags[1].length, pair[1]);

    				if (pre2 === tags[0]) {
    					// we're before the first instance of the tag, do nothing
    					return;
    				} else if (pre !== tags[0] && post !== tags[1]) {
    					// add the tags and stop searching for more things to fix
    					return html.substring(0, pair[0] + entity.length) + tags[0] + html.substring(pair[0] + entity.length, pair[1]) + tags[1] + html.substring(pair[1], html.length);
    				}
    			}
    		}
    	};

    	const insertTextAtCursor = text => {
    		// reset the cursor position after the inserted text 
    		setCursorPosition = saveCaretPosition(editorElement, text.length);

    		const pos = getCaretPosition(editorElement);

    		// insert the new text in the element
    		const c = pos.node.textContent;

    		const n = c.substring(0, pos.position) + text + c.substring(pos.position);
    		pos.node.textContent = n;

    		// set the cursor at the updated position
    		setCursorPosition();

    		// save the cursor pos again because we're about to reformat 
    		setCursorPosition = saveCaretPosition(editorElement);

    		// reassign html with its own content so we force a reformatting of the 
    		// new content in the case it included markdown
    		$$invalidate(0, html = editorElement.innerHTML);
    	};

    	afterUpdate(() => {
    		if (setCursorPosition !== null) {
    			// once the formatting has been updated, reset the curor position 
    			setCursorPosition();

    			setCursorPosition = null;
    		}
    	});

    	const onKeyDown = e => {
    		
    	}; // TODO: keep track of which key was pressed and if it was one of the ones
    	// in a markdown entity, reformat the text. Otherwise don't recheck formatting.

    	const onPaste = e => {
    		const clipboardData = e.clipboardData || window.clipboardData;

    		// get the text version of pasted data, not including any html
    		const pastedData = clipboardData.getData("Text");

    		// insert the content into the current cursor position 
    		insertTextAtCursor(pastedData);
    	};

    	const writable_props = ["html", "textToAdd"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			editorElement = $$value;
    			$$invalidate(1, editorElement);
    		});
    	}

    	function div_input_handler() {
    		html = this.innerHTML;
    		(($$invalidate(0, html), $$invalidate(4, textToAdd)), $$invalidate(1, editorElement));
    	}

    	$$self.$$set = $$props => {
    		if ("html" in $$props) $$invalidate(0, html = $$props.html);
    		if ("textToAdd" in $$props) $$invalidate(4, textToAdd = $$props.textToAdd);
    	};

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		saveCaretPosition,
    		getCaretPosition,
    		makePairsOfMatchingIndecies,
    		html,
    		textToAdd,
    		entities,
    		setCursorPosition,
    		editorElement,
    		checkForMissingMarkdownAndRemoveTags,
    		checkForMarkdownAndInsertTags,
    		insertTextAtCursor,
    		onKeyDown,
    		onPaste
    	});

    	$$self.$inject_state = $$props => {
    		if ("html" in $$props) $$invalidate(0, html = $$props.html);
    		if ("textToAdd" in $$props) $$invalidate(4, textToAdd = $$props.textToAdd);
    		if ("setCursorPosition" in $$props) setCursorPosition = $$props.setCursorPosition;
    		if ("editorElement" in $$props) $$invalidate(1, editorElement = $$props.editorElement);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*textToAdd, html, editorElement*/ 19) {
    			 {
    				// insert any text 
    				if (textToAdd !== undefined && textToAdd !== null) {
    					insertTextAtCursor(textToAdd);
    				}

    				const checkAllMarkdown = () => {
    					for (const entity of entities) {
    						const h = checkForMarkdownAndInsertTags(entity.e, entity.t, html);

    						if (h !== undefined) {
    							return h;
    						} else {
    							const n = checkForMissingMarkdownAndRemoveTags(entity.e, entity.t, html);
    							if (n !== undefined) return n;
    						}
    					}
    				};

    				const res = checkAllMarkdown();

    				// we updated formatting
    				if (res !== undefined) {
    					// record the caret pos so we can reset it after updating content
    					setCursorPosition = saveCaretPosition(editorElement);

    					// set the updated HTML with the new fomatting
    					$$invalidate(0, html = res);
    				}
    			}
    		}
    	};

    	return [
    		html,
    		editorElement,
    		onKeyDown,
    		onPaste,
    		textToAdd,
    		div_binding,
    		div_input_handler
    	];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { html: 0, textToAdd: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*html*/ ctx[0] === undefined && !("html" in props)) {
    			console.warn("<Editor> was created without expected prop 'html'");
    		}

    		if (/*textToAdd*/ ctx[4] === undefined && !("textToAdd" in props)) {
    			console.warn("<Editor> was created without expected prop 'textToAdd'");
    		}
    	}

    	get html() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set html(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get textToAdd() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set textToAdd(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* demo\App.svelte generated by Svelte v3.31.0 */
    const file$1 = "demo\\App.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let button;
    	let t1;
    	let editor;
    	let current;
    	let mounted;
    	let dispose;

    	editor = new Editor({
    			props: {
    				html: /*html*/ ctx[1],
    				textToAdd: /*textToAdd*/ ctx[0]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			button = element("button");
    			button.textContent = "add content";
    			t1 = space();
    			create_component(editor.$$.fragment);
    			add_location(button, file$1, 22, 1, 536);
    			add_location(main, file$1, 21, 0, 527);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, button);
    			append_dev(main, t1);
    			mount_component(editor, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*updateHtml*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const editor_changes = {};
    			if (dirty & /*textToAdd*/ 1) editor_changes.textToAdd = /*textToAdd*/ ctx[0];
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
    			if (detaching) detach_dev(main);
    			destroy_component(editor);
    			mounted = false;
    			dispose();
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let html = "hello, welcome!";
    	let textToAdd = null;

    	const updateHtml = () => {
    		const choices = [
    			"**this is pretty easy to do tbh**",
    			"_I'm making an important point_",
    			"*italics are fun*"
    		];

    		$$invalidate(0, textToAdd = choices[Math.floor(Math.random() * choices.length)]);
    	};

    	afterUpdate(() => {
    		if (textToAdd !== null) {
    			// reset the html to nothing
    			$$invalidate(0, textToAdd = null);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		Editor,
    		html,
    		textToAdd,
    		updateHtml
    	});

    	$$self.$inject_state = $$props => {
    		if ("html" in $$props) $$invalidate(1, html = $$props.html);
    		if ("textToAdd" in $$props) $$invalidate(0, textToAdd = $$props.textToAdd);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [textToAdd, html, updateHtml];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		html: "<h1>hey there peeps</h1>",
    	},
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
