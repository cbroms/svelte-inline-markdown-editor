<script>
	import { afterUpdate } from "svelte";
	import {saveCaretPosition, getCaretPosition} from "./utils/rangeModifiers"
	import {makePairsOfMatchingIndecies} from "./utils/stringModifiers"

	export let html;
	export let textToAdd;

	const entities = [{e: "**", t: ["<b>", "</b>"]}, {e: "__", t: ["<strong>", "</strong>"]}, {e: "*", t: ["<em>", "</em>"]}, {e: "_", t: ["<em>", "</em>"]}, {e: "`", t: ["<code>", "</code>"]}, {e: "#", t: ["<cite>", "</cite>"]}]

	let setCursorPosition = null;
	let editorElement = null;

	const checkForMissingMarkdownAndRemoveTags = (entity, tags, html) => {

		const pairs = makePairsOfMatchingIndecies(entity, html)
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
					const start = html.substring(0, pair[0]).lastIndexOf(tags[0])
					return html.substring(0, start) + 
							html.substring(start + tags[0].length, pair[0] - tags[1].length) + 
							html.substring(pair[0])

				}
			}
		}

	}

	const checkForMarkdownAndInsertTags = (entity, tags, html) => {

		const pairs = makePairsOfMatchingIndecies(entity, html)
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


	}

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
		html = editorElement.innerHTML

	}

	afterUpdate(() => {
		if (setCursorPosition !== null) {
			// once the formatting has been updated, reset the curor position 
			setCursorPosition();
			setCursorPosition = null;
		}
	});

	$: {
		// insert any text 
		if (textToAdd !== undefined && textToAdd !== null) {
			insertTextAtCursor(textToAdd)
		}

		const checkAllMarkdown = () => {
			for (const entity of entities) {
				const h = checkForMarkdownAndInsertTags(entity.e, entity.t, html)
				if (h !== undefined) {
					return h
				} else {
					const n = checkForMissingMarkdownAndRemoveTags(entity.e, entity.t, html)
					if (n !== undefined) return n
				}
			}
		}

		const res = checkAllMarkdown()

		// we updated formatting
		if (res !== undefined) {
			// record the caret pos so we can reset it after updating content
			setCursorPosition = saveCaretPosition(editorElement);
			// set the updated HTML with the new fomatting
			html = res
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
		bind:innerHTML="{html}"
		on:keydown="{onKeyDown}"
		on:paste|preventDefault|stopPropagation="{onPaste}"
	></div>
</main>

<style>
	div {
		box-sizing: border-box;
		padding: 10px;
		margin: 40px auto;
		border: 1px solid black;
		max-width: 400px;
	}

	div:focus {
		outline: none;
		border: 2px solid black;
	}

</style>