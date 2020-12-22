// NOTE: jest-dom adds handy assertions to Jest and it is recommended, but not required.
import "@testing-library/jest-dom/extend-expect";

import { render, fireEvent } from "@testing-library/svelte";

import Editor from "../Editor.svelte";

test("renders nothing without props", () => {
	const results = render(Editor);
	expect(results.container.firstChild.firstChild.innerHTML).toBe("");
});

test("renders text prop without style", () => {
	const { getByText } = render(Editor, { text: "hello, world!" });

	expect(getByText("hello, world!")).toBeInTheDocument();
});

test("renders text prop with single style", () => {
	const results = render(Editor, { text: "hello, *world!*" });
	expect(results.container.firstChild.firstChild.innerHTML).toBe(
		"hello, *<em>world!</em>*"
	);
});

test("renders text prop with multiple styles", () => {
	const results = render(Editor, { text: "__hello__, *world!*" });
	expect(results.container.firstChild.firstChild.innerHTML).toBe(
		"__<strong>hello</strong>__, *<em>world!</em>*"
	);
});

test("renders text prop with nested styles", () => {
	const results = render(Editor, { text: "*__hello__, world!*" });
	expect(results.container.firstChild.firstChild.innerHTML).toBe(
		"*<em>__<strong>hello</strong>__, world!</em>*"
	);
});

test("renders invalid markdown (unclosed single entity) correctly", () => {
	const results = render(Editor, { text: "*_hello, world!*" });
	expect(results.container.firstChild.firstChild.innerHTML).toBe(
		"*<em>_hello, world!</em>*"
	);
});

test("renders invalid markdown (unopened single entity) correctly", () => {
	const results = render(Editor, { text: "**hello, world!_" });
	expect(results.container.firstChild.firstChild.innerHTML).toBe(
		"**hello, world!_"
	);
});

test("renders invalid markdown (unopened double entity) correctly", () => {
	const results = render(Editor, { text: "*_hello__, world!*" });
	expect(results.container.firstChild.firstChild.innerHTML).toBe(
		"*<em>_hello__, world!</em>*"
	);
});

test("renders invalid markdown (unclosed double entity) correctly", () => {
	const results = render(Editor, { text: "*__hello_, world!*" });
	expect(results.container.firstChild.firstChild.innerHTML).toBe(
		"*<em>__hello_, world!</em>*"
	);
});

// test("focuses on click", async () => {
// 	const results = render(Editor, { text: "hello, world!" });
// 	const editor = results.getByText("hello, world!");
// 	console.log(editor);
// 	await fireEvent.click(editor);
// 	console.log(document.activeElement.innerHTML);
// 	expect(editor).toBe(document.activeElement);
// });
