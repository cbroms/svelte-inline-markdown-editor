<script>
	import { afterUpdate } from "svelte";
	import Editor from "../src/Editor.svelte";
	// export let html;

	let html = "hello, welcome!";
	let textToAdd = null;

	const updateHtml = () => {
		const choices = ["**this is pretty easy to do tbh**", "_I'm making an important point_", "*italics are fun*"]
  		textToAdd =  choices[Math.floor(Math.random() * choices.length)];
	};

	afterUpdate(() => {
		if (textToAdd !== null) {
			// reset the html to nothing
			textToAdd = null;
		}
	});
</script>

<main>
	<button on:click="{updateHtml}">add content</button>
	<Editor {html} {textToAdd} />
</main>
