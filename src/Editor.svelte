<script>
	import { afterUpdate } from "svelte";
	import {saveCaretPosition, getCaretPosition} from "./utils/rangeModifiers"
	export let html;
	export let htmlToAdd;

	const entities = [{e: "**", t: ["<b>", "</b>"]}, {e: "__", t: ["<strong>", "</strong>"]}, {e: "*", t: ["<em>", "</em>"]}, {e: "_", t: ["<em>", "</em>"]}, {e: "`", t: ["<code>", "</code>"]}, {e: "#", t: ["<cite>", "</cite>"]}]

	let restore = null;


	const locations = (substring, string) => {
		let a = [];
		let i = -1;
		while ((i = string.indexOf(substring, i + 1)) >= 0) a.push(i);
		return a;
	};

	function checkForMissingMarkdownAndRemoveTags(entity, tags, html) {

		const locs = locations(entity, html);

		const pairs = locs.reduce((res, v, i, arr) => {
			if (i % 2 === 0) res.push(arr.slice(i, i + 2));
			return res;
		}, []);

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

	function checkForMarkdownAndInsertTags(entity, tags, html) {

		const locs = locations(entity, html);

		const pairs = locs.reduce((res, v, i, arr) => {
			if (i % 2 === 0) res.push(arr.slice(i, i + 2));
			return res;
		}, []);

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

	afterUpdate(() => {
		if (restore !== null) {
			restore();
			restore = null;
		}
		
	});

	$: {
		// insert any html 
		if (htmlToAdd !== null) {



			restore = saveCaretPosition("editable");

			const pos = getCaretPosition("editable")
			html = html.substring(0, pos) + htmlToAdd + html.substring(pos + 1)

			console.log(pos)

			
			// insertTextAtCursor(htmlToAdd)
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

		if (res !== undefined) {
			// record the caret pos
			restore = saveCaretPosition("editable");
			html = res
		}
		

		
	}

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

	const onKeyDown = (e) => {
		// console.log(e)
		// if (e.key === "*") {
		// 	e.preventDefault();
		// 	// get the previous <em> tag
		// 	const o = html.lastIndexOf("<em>");
		// 	const c = html.lastIndexOf("</em>");
		// 	if (o > c || o === c) {
		// 		insertTextAtCursor("*<em>");
		// 	} else if (c > o || ) {
		// 		insertTextAtCursor("</em>*");
		// 	}
		// }
	};
</script>

<main>
	<div
		id="editable"
		contenteditable="true"
		bind:innerHTML="{html}"
		on:keydown="{onKeyDown}"
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