
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
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
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
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
    				return html.substring(0, pair[0] + entity.length) + 
    						html.substring(pair[0] + tags[0].length + 
    						entity.length, end) + html.substring(end + tags[1].length)
    			
    			} else if (post === tags[1]) {
    				// this is the second tag, so there's an unmatched opening tag 
    				const start = html.substring(0, pair[0]).lastIndexOf(tags[0]);
    				return html.substring(0, start) + 
    						html.substring(start + tags[0].length, pair[0] - tags[1].length) + 
    						html.substring(pair[0])

    			}
    		}
    	}
    };

    const checkForMarkdownAndInsertTags = (entity, tags, html) => {

    	const pairs = makePairsOfMatchingIndecies(entity, html);
    	for (const pair of pairs) {
    		if (pair.length === 2 && pair[0] + 1 !== pair[1] ) {

    			// get the positions that the tags should exist if they did 
    			const pre = html.substring(pair[0] + entity.length, pair[0] + tags[0].length + entity.length);
    			const pre2 = html.substring(pair[1] + entity.length, pair[1] + tags[0].length + entity.length);
    			const post = html.substring(pair[1] - tags[1].length, pair[1]);

    			if (pre2 === tags[0]) {
    				// we're before the first instance of the tag, do nothing
    				return;
    			} else if (pre !== tags[0] && post !== tags[1]) {
    			
    				// add the tags and stop searching for more things to fix
    				return (
    					html.substring(0, pair[0] + entity.length) +
    					tags[0] +
    					html.substring(pair[0] + entity.length, pair[1]) +
    					tags[1] +
    					html.substring(pair[1], html.length)
    					)
    			}
    		}
    	}
    };


    const checkAllMarkdown = (entities, html) => {
    	for (const entity of entities) {
    		const h = checkForMarkdownAndInsertTags(entity.e, entity.t, html);
    		if (h !== undefined) {
    			return h
    		} else {
    			const n = checkForMissingMarkdownAndRemoveTags(entity.e, entity.t, html);
    			if (n !== undefined) return n
    		}
    	}
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

    /* src/Editor.svelte generated by Svelte v3.31.0 */
    const file = "src/Editor.svelte";

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
    			attr_dev(div, "class", "svelte-1k4ll2g");
    			if (/*thisText*/ ctx[2] === void 0 || /*thisHtml*/ ctx[1] === void 0) add_render_callback(() => /*div_input_handler*/ ctx[9].call(div));
    			add_location(div, file, 96, 1, 2994);
    			add_location(main, file, 95, 0, 2986);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			/*div_binding*/ ctx[8](div);

    			if (/*thisText*/ ctx[2] !== void 0) {
    				div.textContent = /*thisText*/ ctx[2];
    			}

    			if (/*thisHtml*/ ctx[1] !== void 0) {
    				div.innerHTML = /*thisHtml*/ ctx[1];
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "input", /*div_input_handler*/ ctx[9]),
    					listen_dev(div, "keydown", /*onKeyDown*/ ctx[3], false, false, false),
    					listen_dev(div, "paste", stop_propagation(prevent_default(/*onPaste*/ ctx[4])), false, true, true)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*thisText*/ 4 && /*thisText*/ ctx[2] !== div.textContent) {
    				div.textContent = /*thisText*/ ctx[2];
    			}

    			if (dirty & /*thisHtml*/ 2 && /*thisHtml*/ ctx[1] !== div.innerHTML) {
    				div.innerHTML = /*thisHtml*/ ctx[1];
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*div_binding*/ ctx[8](null);
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
    	let { text = "" } = $$props;

    	let { entities = [
    		{ e: "**", t: ["<strong>", "</strong>"] },
    		{ e: "__", t: ["<strong>", "</strong>"] },
    		{ e: "*", t: ["<em>", "</em>"] },
    		{ e: "_", t: ["<em>", "</em>"] },
    		{ e: "`", t: ["<code>", "</code>"] },
    		{ e: "#", t: ["<cite>", "</cite>"] }
    	] } = $$props;

    	let { textToAdd = null } = $$props;
    	const dispatch = createEventDispatcher();
    	let setCursorPosition = null;
    	let editorElement = null;
    	let thisHtml = "";
    	let thisText = text;

    	// // check the initial text to see if there's anything to parse
    	const r = checkAllMarkdown(entities, text);

    	r !== undefined ? thisHtml = r : thisHtml = thisText;

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
    		$$invalidate(1, thisHtml = editorElement.innerHTML);
    	};

    	const dispatchContentChange = () => {
    		if (editorElement !== null) {
    			// dispatch that the content has changed with both text and html
    			dispatch("contentChange", { text: thisText, html: thisHtml });
    		}
    	};

    	afterUpdate(() => {
    		if (setCursorPosition !== null) {
    			// once the formatting has been updated, reset the curor position 
    			setCursorPosition();

    			setCursorPosition = null;
    		}

    		dispatchContentChange();
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

    	const writable_props = ["text", "entities", "textToAdd"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			editorElement = $$value;
    			$$invalidate(0, editorElement);
    		});
    	}

    	function div_input_handler() {
    		thisText = this.textContent;
    		thisHtml = this.innerHTML;
    		$$invalidate(2, thisText);
    		((($$invalidate(1, thisHtml), $$invalidate(7, textToAdd)), $$invalidate(6, entities)), $$invalidate(0, editorElement));
    	}

    	$$self.$$set = $$props => {
    		if ("text" in $$props) $$invalidate(5, text = $$props.text);
    		if ("entities" in $$props) $$invalidate(6, entities = $$props.entities);
    		if ("textToAdd" in $$props) $$invalidate(7, textToAdd = $$props.textToAdd);
    	};

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		createEventDispatcher,
    		saveCaretPosition,
    		getCaretPosition,
    		checkAllMarkdown,
    		text,
    		entities,
    		textToAdd,
    		dispatch,
    		setCursorPosition,
    		editorElement,
    		thisHtml,
    		thisText,
    		r,
    		insertTextAtCursor,
    		dispatchContentChange,
    		onKeyDown,
    		onPaste
    	});

    	$$self.$inject_state = $$props => {
    		if ("text" in $$props) $$invalidate(5, text = $$props.text);
    		if ("entities" in $$props) $$invalidate(6, entities = $$props.entities);
    		if ("textToAdd" in $$props) $$invalidate(7, textToAdd = $$props.textToAdd);
    		if ("setCursorPosition" in $$props) setCursorPosition = $$props.setCursorPosition;
    		if ("editorElement" in $$props) $$invalidate(0, editorElement = $$props.editorElement);
    		if ("thisHtml" in $$props) $$invalidate(1, thisHtml = $$props.thisHtml);
    		if ("thisText" in $$props) $$invalidate(2, thisText = $$props.thisText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*textToAdd, entities, thisHtml, editorElement*/ 195) {
    			 {
    				// insert any text 
    				if (textToAdd !== undefined && textToAdd !== null) {
    					insertTextAtCursor(textToAdd);
    				}

    				const res = checkAllMarkdown(entities, thisHtml);

    				// we updated formatting
    				if (res !== undefined && editorElement !== null) {
    					// record the caret pos so we can reset it after updating content
    					setCursorPosition = saveCaretPosition(editorElement);

    					// set the updated HTML with the new fomatting
    					$$invalidate(1, thisHtml = res);
    				}
    			}
    		}
    	};

    	return [
    		editorElement,
    		thisHtml,
    		thisText,
    		onKeyDown,
    		onPaste,
    		text,
    		entities,
    		textToAdd,
    		div_binding,
    		div_input_handler
    	];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { text: 5, entities: 6, textToAdd: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get text() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get entities() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set entities(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get textToAdd() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set textToAdd(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* demo/ExampleLayout.svelte generated by Svelte v3.31.0 */

    const file$1 = "demo/ExampleLayout.svelte";
    const get_demo_slot_changes = dirty => ({});
    const get_demo_slot_context = ctx => ({});
    const get_description_slot_changes = dirty => ({});
    const get_description_slot_context = ctx => ({});

    function create_fragment$1(ctx) {
    	let section;
    	let div0;
    	let t;
    	let div1;
    	let current;
    	const description_slot_template = /*#slots*/ ctx[1].description;
    	const description_slot = create_slot(description_slot_template, ctx, /*$$scope*/ ctx[0], get_description_slot_context);
    	const demo_slot_template = /*#slots*/ ctx[1].demo;
    	const demo_slot = create_slot(demo_slot_template, ctx, /*$$scope*/ ctx[0], get_demo_slot_context);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div0 = element("div");
    			if (description_slot) description_slot.c();
    			t = space();
    			div1 = element("div");
    			if (demo_slot) demo_slot.c();
    			attr_dev(div0, "class", "desc svelte-1ici02u");
    			add_location(div0, file$1, 5, 1, 32);
    			attr_dev(div1, "class", "demo svelte-1ici02u");
    			add_location(div1, file$1, 8, 1, 95);
    			attr_dev(section, "class", "svelte-1ici02u");
    			add_location(section, file$1, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);

    			if (description_slot) {
    				description_slot.m(div0, null);
    			}

    			append_dev(section, t);
    			append_dev(section, div1);

    			if (demo_slot) {
    				demo_slot.m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (description_slot) {
    				if (description_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(description_slot, description_slot_template, ctx, /*$$scope*/ ctx[0], dirty, get_description_slot_changes, get_description_slot_context);
    				}
    			}

    			if (demo_slot) {
    				if (demo_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(demo_slot, demo_slot_template, ctx, /*$$scope*/ ctx[0], dirty, get_demo_slot_changes, get_demo_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(description_slot, local);
    			transition_in(demo_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(description_slot, local);
    			transition_out(demo_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (description_slot) description_slot.d(detaching);
    			if (demo_slot) demo_slot.d(detaching);
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
    	validate_slots("ExampleLayout", slots, ['description','demo']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ExampleLayout> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class ExampleLayout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ExampleLayout",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* demo/Example1.svelte generated by Svelte v3.31.0 */
    const file$2 = "demo/Example1.svelte";

    // (25:1) <div slot="description">
    function create_description_slot(ctx) {
    	let div;
    	let h3;
    	let t1;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "Preview inline markdown styling as you type.";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Try adding something—bold, italics, and code are all valid.";
    			add_location(h3, file$2, 26, 2, 668);
    			add_location(p, file$2, 27, 2, 724);
    			attr_dev(div, "slot", "description");
    			add_location(div, file$2, 24, 1, 576);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(div, t1);
    			append_dev(div, p);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_description_slot.name,
    		type: "slot",
    		source: "(25:1) <div slot=\\\"description\\\">",
    		ctx
    	});

    	return block;
    }

    // (30:1) <div slot="demo">
    function create_demo_slot(ctx) {
    	let div;
    	let editor;
    	let current;

    	editor = new Editor({
    			props: {
    				text: /*text*/ ctx[1],
    				textToAdd: /*textToAdd*/ ctx[0]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(editor.$$.fragment);
    			attr_dev(div, "slot", "demo");
    			add_location(div, file$2, 29, 1, 800);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(editor, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
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
    			if (detaching) detach_dev(div);
    			destroy_component(editor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_demo_slot.name,
    		type: "slot",
    		source: "(30:1) <div slot=\\\"demo\\\">",
    		ctx
    	});

    	return block;
    }

    // (24:0) <ExampleLayout>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(24:0) <ExampleLayout>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let examplelayout;
    	let current;

    	examplelayout = new ExampleLayout({
    			props: {
    				$$slots: {
    					default: [create_default_slot],
    					demo: [create_demo_slot],
    					description: [create_description_slot]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(examplelayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(examplelayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const examplelayout_changes = {};

    			if (dirty & /*$$scope, textToAdd*/ 9) {
    				examplelayout_changes.$$scope = { dirty, ctx };
    			}

    			examplelayout.$set(examplelayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(examplelayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(examplelayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(examplelayout, detaching);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Example1", slots, []);
    	let text = "hello, welcome!";
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Example1> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		Editor,
    		ExampleLayout,
    		text,
    		textToAdd,
    		updateHtml
    	});

    	$$self.$inject_state = $$props => {
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("textToAdd" in $$props) $$invalidate(0, textToAdd = $$props.textToAdd);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [textToAdd, text];
    }

    class Example1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Example1",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* demo/Example2.svelte generated by Svelte v3.31.0 */
    const file$3 = "demo/Example2.svelte";

    // (15:1) <div slot="description">
    function create_description_slot$1(ctx) {
    	let div;
    	let h3;
    	let t1;
    	let p;
    	let t2;
    	let code;
    	let t4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "Listen to content change events.";
    			t1 = space();
    			p = element("p");
    			t2 = text("Changes are dispatched though the ");
    			code = element("code");
    			code.textContent = "contentChange";
    			t4 = text(" event.");
    			add_location(h3, file$3, 15, 2, 332);
    			add_location(code, file$3, 16, 39, 413);
    			add_location(p, file$3, 16, 2, 376);
    			attr_dev(div, "slot", "description");
    			add_location(div, file$3, 14, 1, 304);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(p, code);
    			append_dev(p, t4);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_description_slot$1.name,
    		type: "slot",
    		source: "(15:1) <div slot=\\\"description\\\">",
    		ctx
    	});

    	return block;
    }

    // (19:1) <div slot="demo">
    function create_demo_slot$1(ctx) {
    	let div;
    	let editor;
    	let t0;
    	let p0;
    	let t2;
    	let code0;
    	let t3_value = /*latestContent*/ ctx[0]?.html + "";
    	let t3;
    	let t4;
    	let p1;
    	let t6;
    	let code1;
    	let t7_value = /*latestContent*/ ctx[0]?.text + "";
    	let t7;
    	let current;

    	editor = new Editor({
    			props: { text: /*text*/ ctx[1] },
    			$$inline: true
    		});

    	editor.$on("contentChange", /*handleContentChange*/ ctx[2]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(editor.$$.fragment);
    			t0 = space();
    			p0 = element("p");
    			p0.textContent = "Current editor HTML:";
    			t2 = space();
    			code0 = element("code");
    			t3 = text(t3_value);
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Current editor content:";
    			t6 = space();
    			code1 = element("code");
    			t7 = text(t7_value);
    			add_location(p0, file$3, 20, 2, 539);
    			add_location(code0, file$3, 21, 2, 569);
    			add_location(p1, file$3, 24, 2, 613);
    			add_location(code1, file$3, 25, 2, 646);
    			attr_dev(div, "slot", "demo");
    			add_location(div, file$3, 18, 1, 460);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(editor, div, null);
    			append_dev(div, t0);
    			append_dev(div, p0);
    			append_dev(div, t2);
    			append_dev(div, code0);
    			append_dev(code0, t3);
    			append_dev(div, t4);
    			append_dev(div, p1);
    			append_dev(div, t6);
    			append_dev(div, code1);
    			append_dev(code1, t7);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*latestContent*/ 1) && t3_value !== (t3_value = /*latestContent*/ ctx[0]?.html + "")) set_data_dev(t3, t3_value);
    			if ((!current || dirty & /*latestContent*/ 1) && t7_value !== (t7_value = /*latestContent*/ ctx[0]?.text + "")) set_data_dev(t7, t7_value);
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
    			if (detaching) detach_dev(div);
    			destroy_component(editor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_demo_slot$1.name,
    		type: "slot",
    		source: "(19:1) <div slot=\\\"demo\\\">",
    		ctx
    	});

    	return block;
    }

    // (14:0) <ExampleLayout>
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(14:0) <ExampleLayout>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let examplelayout;
    	let current;

    	examplelayout = new ExampleLayout({
    			props: {
    				$$slots: {
    					default: [create_default_slot$1],
    					demo: [create_demo_slot$1],
    					description: [create_description_slot$1]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(examplelayout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(examplelayout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const examplelayout_changes = {};

    			if (dirty & /*$$scope, latestContent*/ 9) {
    				examplelayout_changes.$$scope = { dirty, ctx };
    			}

    			examplelayout.$set(examplelayout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(examplelayout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(examplelayout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(examplelayout, detaching);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Example2", slots, []);
    	let text = "I **can** be changed.";
    	let latestContent = null;

    	const handleContentChange = e => {
    		$$invalidate(0, latestContent = { text: e.detail.text, html: e.detail.html });
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Example2> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Editor,
    		ExampleLayout,
    		text,
    		latestContent,
    		handleContentChange
    	});

    	$$self.$inject_state = $$props => {
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("latestContent" in $$props) $$invalidate(0, latestContent = $$props.latestContent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [latestContent, text, handleContentChange];
    }

    class Example2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Example2",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* demo/App.svelte generated by Svelte v3.31.0 */
    const file$4 = "demo/App.svelte";

    function create_fragment$4(ctx) {
    	let t0;
    	let main;
    	let example1;
    	let t1;
    	let example2;
    	let current;
    	example1 = new Example1({ $$inline: true });
    	example2 = new Example2({ $$inline: true });

    	const block = {
    		c: function create() {
    			t0 = space();
    			main = element("main");
    			create_component(example1.$$.fragment);
    			t1 = space();
    			create_component(example2.$$.fragment);
    			document.title = "Svelte Inline Markdown Editor";
    			attr_dev(main, "class", "svelte-1zdmfn");
    			add_location(main, file$4, 9, 0, 179);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(example1, main, null);
    			append_dev(main, t1);
    			mount_component(example2, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(example1.$$.fragment, local);
    			transition_in(example2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(example1.$$.fragment, local);
    			transition_out(example2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(example1);
    			destroy_component(example2);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Example1, Example2 });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
