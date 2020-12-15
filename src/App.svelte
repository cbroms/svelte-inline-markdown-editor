<script>
	import { afterUpdate } from "svelte";
	import Editor from "./Editor.svelte";
	// export let html;

	let html = "hello, welcome!";
	let htmlToAdd = null;

	const updateHtml = () => {
		htmlToAdd = "testing";
	};

	afterUpdate(() => {
		if (htmlToAdd !== null) {
			// reset the html to nothing
			htmlToAdd = null;
		}
	});
</script>

<main>
	<!-- <button on:click="{updateHtml}">add content</button> -->
	<Editor {html} {htmlToAdd} />
</main>
