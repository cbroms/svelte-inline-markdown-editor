<script>
	import { afterUpdate } from "svelte";
	import Editor from "../src/Editor.svelte";
	import ExampleLayout from "./ExampleLayout.svelte"
	// export let html;

	let text = "hello, welcome!";
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


<ExampleLayout>
	<div slot="description"> 
		<!-- <button on:click="{updateHtml}">add content</button> -->
		<h3>Preview inline markdown styling as you type.</h3>
		<p>Try adding something—bold, italics, and code are all valid.</p>
	</div>
	<div slot="demo"><Editor {text} {textToAdd} /></div>
</ExampleLayout>


