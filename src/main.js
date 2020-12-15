import App from "./App.svelte";

const app = new App({
	target: document.body,
	props: {
		html: "<h1>hey there peeps</h1>",
	},
});

export default app;
