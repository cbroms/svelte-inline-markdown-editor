<script>
	import Editor from "../src/Editor.svelte";
	import ExampleLayout from "./ExampleLayout.svelte";

	let text = "I am fancy and _styled_. Aren't I just sooooo __stylish__?";
</script>

<ExampleLayout>
	<div slot="description">
		<h3>Add custom styling.</h3>
		<p></p>
	</div>
	<div slot="demo">
		<Editor {text} id="test" />
	</div>
</ExampleLayout>

<style>
	:global(#test) {
		background-color: #2b2b2b;
		color: #d6d6d6;
		font-family: serif;
		border-radius: 5px;
		border: none;
	}

	:global(#test > em, #test > strong, #test > code) {
		padding: 2px 5px;
		border-radius: 5px;
		background-color: black;
	}
</style>
