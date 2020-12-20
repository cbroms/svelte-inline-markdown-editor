<script>
	import { afterUpdate, createEventDispatcher } from "svelte";
	import { saveCaretPosition, getCaretPosition, getRange, getTextNodeAtPosition } from "./utils/rangeModifiers"
	import { checkAllMarkdown } from "./utils/stringModifiers"

	export let text = "";
	export let entities = [{e: "**", t: ["<strong>", "</strong>"]}, {e: "__", t: ["<strong>", "</strong>"]}, {e: "*", t: ["<em>", "</em>"]}, {e: "_", t: ["<em>", "</em>"]}, {e: "`", t: ["<code>", "</code>"]}, {e: "#", t: ["<cite>", "</cite>"]}]
	export let textToAdd = null;

	const dispatch = createEventDispatcher();

	let setCursorPosition = null;
	let setRangeOnUpdate = false;
	let rangeToSet = null;
	let editorElement = null;
	let thisHtml = ""
	let thisText = text;

	// // check the initial text to see if there's anything to parse
	const r = checkAllMarkdown(entities, text)
	r !== undefined ? thisHtml = r[0] : thisHtml = thisText


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

	const onKeyDown = (e) => {
		// TODO: keep track of which key was pressed and if it was one of the ones
		// in a markdown entity, reformat the text. Otherwise don't recheck formatting.

		if (["*", "_", "`"].includes(e.key)) {
			const [range, selection] = getRange()

			if (range.startOffset !== range.endOffset) {

				e.preventDefault()
				e.stopPropagation()

				// get the range
				const el1 = range.startContainer 
				const el2 = range.endContainer

				if (!el1.isSameNode(el2)) {
					// the range end and start are in different nodes, so add the character to the correct
					// positions in both elements 
					const n1 = el1.textContent.substring(0, range.startOffset) + e.key + el1.textContent.substring(range.startOffset)
					const n2 = el2.textContent.substring(0, range.endOffset) + e.key + el2.textContent.substring(range.endOffset)
					el1.textContent = n1;
					el2.textContent = n2;
				} else {
					// the end and start are in the same node
					const c = el1.textContent;
					const n = c.substring(0, range.startOffset) + e.key + c.substring(range.startOffset, range.endOffset) + e.key + c.substring(range.endOffset)
					el1.textContent = n;
				}

				setRangeOnUpdate = true;
				// reassign html with its own content so we force a reformatting of the new content
				thisHtml = editorElement.innerHTML
			}
		}
	};

	const onPaste = (e) => {
	    const clipboardData = e.clipboardData || window.clipboardData;
	    // get the text version of pasted data, not including any html
	    const pastedData = clipboardData.getData('Text');
   		// insert the content into the current cursor position 
   		insertTextAtCursor(pastedData)
	}

	afterUpdate(() => {
		if (setCursorPosition !== null) {
			// once the formatting has been updated, reset the curor position 
			setCursorPosition();
			setCursorPosition = null;
		}

		if (setRangeOnUpdate !== null && setRangeOnUpdate !== false) {
			// set the range 
			setRangeOnUpdate()
			setRangeOnUpdate = null;

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
			thisHtml = res[0];

			// select the newly created elements 
			if (setRangeOnUpdate === true) {
				setRangeOnUpdate = () => {
					const n1 = getTextNodeAtPosition(editorElement, res[1])
					const n2 = getTextNodeAtPosition(editorElement, res[2])

					console.log(n1)
					console.log(n2)

					const [range, selection] = getRange()
					range.setStart(n1.node, n1.position);
					range.setEnd(n2.node, n2.position)
				    selection.removeAllRanges();
				    selection.addRange(range);
				}
				
			}
		}
	}

</script>

<div
	id="editable"
	contenteditable="true"
	bind:this={editorElement}
	bind:textContent={thisText}
	bind:innerHTML={thisHtml}
	on:keydown={onKeyDown}
	on:paste|preventDefault|stopPropagation={onPaste}
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
		border: 2px solid black;
	}
</style>