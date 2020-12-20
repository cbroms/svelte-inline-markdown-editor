<script>
	import Editor from "../src/Editor.svelte";
	import ExampleLayout from "./ExampleLayout.svelte"

	let text = "I **can** be changed.";
	let latestContent = null;
	
	const handleContentChange = (e) => {
		latestContent = {text: e.detail.text, html: e.detail.html}
	}
	
</script>

<ExampleLayout>
	<div slot="description"> 
		<h3>Listen to content change events.</h3>
		<p>Changes are dispatched though the <code>contentChange</code> event.</p>
	</div>
	<div slot="demo">
		<Editor {text} on:contentChange={handleContentChange} />
		<p>Current editor HTML:</p>
		<code>
			{latestContent?.html}
		</code>
		<p>Current editor content:</p>
		<code>{latestContent?.text}</code>
	</div>
</ExampleLayout>


