<script>
	import Editor from "../src/Editor.svelte";
	import ExampleLayout from "./ExampleLayout.svelte";

	let text = "go ahead and submit";
	let lastSubmitted = "";

	const onEnter = (text, html) => {
		lastSubmitted = text;
		return "";
	};
</script>

<ExampleLayout>
	<div slot="description">
		<h3>Capture editor content on enter.</h3>
		<p>
			When the enter key is hit, save a copy of the editor's content, then
			clear it.
		</p>
	</div>
	<div slot="demo">
		<Editor {text} {onEnter} />
		<p>Last content submitted:</p>
		<code> {lastSubmitted} </code>
	</div>
</ExampleLayout>
