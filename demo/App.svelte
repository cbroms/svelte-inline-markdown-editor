<script>
	import Example1 from "./Example1.svelte";
	import Example2 from "./Example2.svelte";
	import Example3 from "./Example3.svelte";
	import Example4 from "./Example4.svelte";
</script>

<svelte:head>
	<title>Svelte Inline Markdown Editor</title>
</svelte:head>

<main>
	<!-- <h1>A simple inline markdown editor for Svelte.</h1> -->
	<Example1 />
	<Example2 />
	<Example3 />
	<Example4 />
</main>

<style>
	main {
		max-width: 1000px;
		margin: 0 auto;
	}
</style>
