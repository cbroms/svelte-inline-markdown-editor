(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.InlineMarkupEditor = factory());
}(this, (function () { 'use strict';

    function noop() { }
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
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

    // fanstatic solution from
    // https://stackoverflow.com/a/38479462
    function saveCaretPosition(id) {
    	const context = document.getElementById(id);

    	const selection = window.getSelection();
    	const range = selection.getRangeAt(0);
    	range.setStart(context, 0);
    	const len = range.toString().length;

    	return function restore() {
    		const pos = getTextNodeAtPosition(context, len);
    		selection.removeAllRanges();
    		const range = new Range();
    		range.setStart(pos.node, pos.position);
    		selection.addRange(range);
    	};
    }

    function getCaretPosition(id) {
    	const context = document.getElementById(id);

    	const selection = window.getSelection();
    	const range = selection.getRangeAt(0);
    	range.setStart(context, 0);
    	const len = range.toString().length;

    	return getTextNodeAtPosition(context, len);
    }

    function getTextNodeAtPosition(root, index) {
    	const NODE_TYPE = NodeFilter.SHOW_TEXT;
    	var treeWalker = document.createTreeWalker(
    		root,
    		NODE_TYPE,
    		function next(elem) {
    			if (index > elem.textContent.length) {
    				index -= elem.textContent.length;
    				return NodeFilter.FILTER_REJECT;
    			}
    			return NodeFilter.FILTER_ACCEPT;
    		}
    	);
    	var c = treeWalker.nextNode();
    	return {
    		node: c ? c : root,
    		position: index,
    	};
    }

    /* src/Editor.svelte generated by Svelte v3.31.0 */

    function create_fragment(ctx) {
    	let main;
    	let div;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			main = element("main");
    			div = element("div");
    			attr(div, "id", "editable");
    			attr(div, "contenteditable", "true");
    			attr(div, "class", "svelte-1ucb901");
    			if (/*html*/ ctx[0] === void 0) add_render_callback(() => /*div_input_handler*/ ctx[3].call(div));
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, div);

    			if (/*html*/ ctx[0] !== void 0) {
    				div.innerHTML = /*html*/ ctx[0];
    			}

    			if (!mounted) {
    				dispose = [
    					listen(div, "input", /*div_input_handler*/ ctx[3]),
    					listen(div, "keydown", /*onKeyDown*/ ctx[1])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*html*/ 1 && /*html*/ ctx[0] !== div.innerHTML) {
    				div.innerHTML = /*html*/ ctx[0];
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { html } = $$props;
    	let { htmlToAdd } = $$props;

    	const entities = [
    		{ e: "**", t: ["<b>", "</b>"] },
    		{ e: "__", t: ["<strong>", "</strong>"] },
    		{ e: "*", t: ["<em>", "</em>"] },
    		{ e: "_", t: ["<em>", "</em>"] },
    		{ e: "`", t: ["<code>", "</code>"] },
    		{ e: "#", t: ["<cite>", "</cite>"] }
    	];

    	let restore = null;

    	const locations = (substring, string) => {
    		let a = [];
    		let i = -1;
    		while ((i = string.indexOf(substring, i + 1)) >= 0) a.push(i);
    		return a;
    	};

    	function checkForMissingMarkdownAndRemoveTags(entity, tags, html) {
    		const locs = locations(entity, html);

    		const pairs = locs.reduce(
    			(res, v, i, arr) => {
    				if (i % 2 === 0) res.push(arr.slice(i, i + 2));
    				return res;
    			},
    			[]
    		);

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
    	}

    	function checkForMarkdownAndInsertTags(entity, tags, html) {
    		const locs = locations(entity, html);

    		const pairs = locs.reduce(
    			(res, v, i, arr) => {
    				if (i % 2 === 0) res.push(arr.slice(i, i + 2));
    				return res;
    			},
    			[]
    		);

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
    	}

    	afterUpdate(() => {
    		if (restore !== null) {
    			restore();
    			restore = null;
    		}
    	});

    	// function insertTextAtCursor(text) {
    	//     var sel, range, textNode;
    	//     if (window.getSelection) {
    	//         sel = window.getSelection();
    	//         if (sel.getRangeAt && sel.rangeCount) {
    	//             range = sel.getRangeAt(0).cloneRange();
    	//             range.deleteContents();
    	//             textNode = document.createTextNode(text);
    	//             range.insertNode(textNode);
    	//             // Move caret to the end of the newly inserted text node
    	//             range.setStart(textNode, textNode.length);
    	//             range.setEnd(textNode, textNode.length);
    	//             sel.removeAllRanges();
    	//             sel.addRange(range);
    	//         }
    	//     } else if (document.selection && document.selection.createRange) {
    	//         range = document.selection.createRange();
    	//         range.pasteHTML(text);
    	//     }
    	// }
    	const onKeyDown = e => {
    		
    	}; // console.log(e)
    	// if (e.key === "*") {
    	// 	e.preventDefault();
    	// 	// get the previous <em> tag

    	function div_input_handler() {
    		html = this.innerHTML;
    		($$invalidate(0, html), $$invalidate(2, htmlToAdd));
    	}

    	$$self.$$set = $$props => {
    		if ("html" in $$props) $$invalidate(0, html = $$props.html);
    		if ("htmlToAdd" in $$props) $$invalidate(2, htmlToAdd = $$props.htmlToAdd);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*htmlToAdd, html*/ 5) {
    			 {
    				console.log("hi");

    				// insert any html 
    				if (htmlToAdd !== null) {
    					restore = saveCaretPosition("editable");
    					const pos = getCaretPosition("editable");
    					$$invalidate(0, html = html.substring(0, pos) + htmlToAdd + html.substring(pos + 1));
    					console.log(pos);
    				} // insertTextAtCursor(htmlToAdd)

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

    				if (res !== undefined) {
    					// record the caret pos
    					restore = saveCaretPosition("editable");

    					$$invalidate(0, html = res);
    				}
    			}
    		}
    	};

    	return [html, onKeyDown, htmlToAdd, div_input_handler];
    }

    class Editor extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { html: 0, htmlToAdd: 2 });
    	}
    }

    return Editor;

})));
