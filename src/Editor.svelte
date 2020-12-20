<script>
	import { afterUpdate, createEventDispatcher } from "svelte";
	import { saveCaretPosition, getCaretPosition } from "./utils/rangeModifiers"
	import { checkAllMarkdown } from "./utils/stringModifiers"

	export let text = "";
	export let entities = [{e: "**", t: ["<strong>", "</strong>"]}, {e: "__", t: ["<strong>", "</strong>"]}, {e: "*", t: ["<em>", "</em>"]}, {e: "_", t: ["<em>", "</em>"]}, {e: "`", t: ["<code>", "</code>"]}, {e: "#", t: ["<cite>", "</cite>"]}]
	export let textToAdd = null;

	const dispatch = createEventDispatcher();

	let setCursorPosition = null;
	let editorElement = null;
	let thisHtml = ""
	let thisText = text;

	// // check the initial text to see if there's anything to parse
	const r = checkAllMarkdown(entities, text)
	r !== undefined ? thisHtml = r : thisHtml = thisText


	const insertTextAtCursor = (text) => {
		// reset the cursor position after the inserted text 
		setCursorPosition = saveCaretPosition(editorElement, text.length);

		const pos = getCaretPosition(editorElement)
		// insert the new text in the element
		const c = pos.node.textContent;
		const n = c.substring(0, pos.position) + text + c.substring(pos.position)
		pos.node.textContent = n;

		// set the cursor at the updated position
		setCursorPosition();

		// save the cursor pos again because we're about to reformat 
		setCursorPosition = saveCaretPosition(editorElement);
		// reassign html with its own content so we force a reformatting of the 
		// new content in the case it included markdown
		thisHtml = editorElement.innerHTML
	}

	const dispatchContentChange = () => {
		if (editorElement !== null) {
			// dispatch that the content has changed with both text and html
			dispatch("contentChange", {
				text: thisText,
				html: thisHtml
			})
		}
	}

	afterUpdate(() => {
		if (setCursorPosition !== null) {
			// once the formatting has been updated, reset the curor position 
			setCursorPosition();
			setCursorPosition = null;
		}
		
		dispatchContentChange()
	});

	$: {
		// insert any text 
		if (textToAdd !== undefined && textToAdd !== null) {
			insertTextAtCursor(textToAdd)
		}

		const res = checkAllMarkdown(entities, thisHtml)

		// we updated formatting
		if (res !== undefined && editorElement !== null) {
			// record the caret pos so we can reset it after updating content
			setCursorPosition = saveCaretPosition(editorElement);
			// set the updated HTML with the new fomatting
			thisHtml = res
		}
	}


	const onKeyDown = (e) => {
		// TODO: keep track of which key was pressed and if it was one of the ones
		// in a markdown entity, reformat the text. Otherwise don't recheck formatting.
	};

	const onPaste = (e) => {

	    const clipboardData = e.clipboardData || window.clipboardData;
	    // get the text version of pasted data, not including any html
	    const pastedData = clipboardData.getData('Text');
   		
   		// insert the content into the current cursor position 
   		insertTextAtCursor(pastedData)
	}
</script>

<main>
	<div
		id="editable"
		contenteditable="true"
		bind:this={editorElement}
		bind:textContent={thisText}
		bind:innerHTML={thisHtml}
		on:keydown={onKeyDown}
		on:paste|preventDefault|stopPropagation="{onPaste}"
	></div>
</main>

<style>
	div {
		box-sizing: border-box;
		padding: 10px;
		border: 1px solid black;
		width: 100%;
	}

	div:focus {
		outline: none;
		border: 2px solid black;
	}

</style>