<script>
	import { afterUpdate, createEventDispatcher } from "svelte";
	import {
		saveCaretPosition,
		getCaretPosition,
		getRange,
		getTextNodeAtPosition,
	} from "./utils/rangeModifiers";
	import {
		checkAllMarkdown,
		insertMarkdownAroundSelection,
	} from "./utils/stringModifiers";

	export let id = ""
	export let text = "";
	export let entities = [
		{ e: "**", t: ["<strong>", "</strong>"] },
		{ e: "__", t: ["<strong>", "</strong>"] },
		{ e: "*", t: ["<em>", "</em>"] },
		{ e: "_", t: ["<em>", "</em>"] },
		{ e: "`", t: ["<code>", "</code>"] },
		{ e: "#", t: ["<cite>", "</cite>"] },
	];
	export let textToAdd = null;
	export let onEnter = (currentText, currentHtml) => {
		return currentText;
	};

	const dispatch = createEventDispatcher();

	let setCursorPosition = null;
	let setRangeOnUpdate = false;
	let rangeToSet = null;
	let editorElement = null;
	let thisHtml = "";
	let thisText = text;

	// check the initial text to see if there's anything to parse
	let r = [text];
	let res = r[0];
	while (res !== undefined) {
		// each time we look through and check we get one single reformat
		// keep doing this until there's nothing left to format
		res = checkAllMarkdown(entities, r[0]);
		if (res !== undefined) r = res;
	}
	r !== undefined ? (thisHtml = r[0]) : (thisHtml = thisText);

	const insertTextAtCursor = (text) => {
		// reset the cursor position after the inserted text
		setCursorPosition = saveCaretPosition(editorElement, text.length);

		const pos = getCaretPosition(editorElement);
		// insert the new text in the element
		const c = pos.node.textContent;
		const n =
			c.substring(0, pos.position) + text + c.substring(pos.position);
		pos.node.textContent = n;

		// set the cursor at the updated position
		setCursorPosition();

		// save the cursor pos again because we're about to reformat
		setCursorPosition = saveCaretPosition(editorElement);

		// reassign html with its own content so we force a reformatting of the
		// new content in the case it included markdown
		thisHtml = editorElement.innerHTML;
		thisText = editorElement.textContent;
	};

	const dispatchContentChange = () => {
		if (editorElement !== null) {
			// dispatch that the content has changed with both text and html
			dispatch("contentChange", {
				text: thisText,
				html: thisHtml,
			});
		}
	};

	const onKeyDown = (e) => {
		// TODO: keep track of which key was pressed and if it was one of the ones
		// in a markdown entity, reformat the text. Otherwise don't recheck formatting.

		// TODO: construct this list of entities to check for from the original entities prop
		if (["*", "_", "`"].includes(e.key)) {
			const [range, selection] = getRange();

			if (
				range.startOffset !== range.endOffset ||
				!range.startContainer.isSameNode(range.endContainer)
			) {
				e.preventDefault();
				e.stopPropagation();

				// add the markdown entity around the selected range
				insertMarkdownAroundSelection(e.key, range, editorElement);

				setRangeOnUpdate = true;
				// reassign html with its own content so we force a reformatting of the new content
				thisHtml = editorElement.innerHTML;
				thisText = editorElement.textContent;
			}
		} else if (e.key === "Enter") {
			e.preventDefault();
			// call the onEnter function to signal the user has pressed the enter key
			const res = onEnter(thisText, thisHtml);
			// the onEnter function can return the new text content
			if (typeof res === "string") thisText = res;
		}
	};

	const onPaste = (e) => {
		const clipboardData = e.clipboardData || window.clipboardData;
		// get the text version of pasted data, not including any html
		const pastedData = clipboardData.getData("Text");
		// insert the content into the current cursor position
		insertTextAtCursor(pastedData);
	};

	afterUpdate(() => {
		if (setCursorPosition !== null) {
			// once the formatting has been updated, reset the curor position
			setCursorPosition();
			setCursorPosition = null;
		}
		if (setRangeOnUpdate !== null && setRangeOnUpdate !== false) {
			// set the range
			setRangeOnUpdate();
			setRangeOnUpdate = null;
		}
		dispatchContentChange();
	});

	$: {
		// insert any text
		if (textToAdd !== undefined && textToAdd !== null) {
			insertTextAtCursor(textToAdd);
		}

		// check for any added or removed markdown
		const res = checkAllMarkdown(entities, thisHtml);

		// we updated formatting
		if (res !== undefined && editorElement !== null) {
			// record the caret pos so we can reset it after updating content
			setCursorPosition = saveCaretPosition(editorElement);
			// set the updated HTML with the new fomatting
			thisHtml = res[0];

			// select the newly created elements if there was a selected range before
			if (setRangeOnUpdate === true) {
				setRangeOnUpdate = () => {
					const n1 = getTextNodeAtPosition(editorElement, res[1]);
					// move the cursor to the next position so we don't end up inserting any
					// subsequent changes to the inside of the styling tags
					const n2 = getTextNodeAtPosition(editorElement, res[2] + 1);

					const [range, selection] = getRange();
					range.setStart(n1.node, n1.position);
					range.setEnd(n2.node, n2.position);
					selection.removeAllRanges();
					selection.addRange(range);
				};
			}
		}
	}
</script>

<div
	{id}
	contenteditable="true"
	bind:this="{editorElement}"
	bind:textContent="{thisText}"
	bind:innerHTML="{thisHtml}"
	on:keydown="{onKeyDown}"
	on:paste|preventDefault|stopPropagation="{onPaste}"
></div>

<style>
	div {
		box-sizing: border-box;
		padding: 10px;
		border: 1px solid black;
		width: 100%;
	}
	
	div:focus {
		outline: none;
	}
</style>
