import { locations } from "./stringModifiers";

const getSelectionAndPosition = (element) => {
	const selection = window.getSelection();
	const range = selection.getRangeAt(0);
	range.setStart(element, 0);
	const position = range.toString().length;

	return [selection, position];
};

// fanstatic solution from
// https://stackoverflow.com/a/38479462
export const saveCaretPosition = (element, offset = 0) => {
	const [selection, position] = getSelectionAndPosition(element);

	return () => {
		// restore the position of the cursor
		const pos = getTextNodeAtPosition(element, position + offset);
		selection.removeAllRanges();
		const range = new Range();
		range.setStart(pos.node, pos.position);
		selection.addRange(range);
	};
};

export const getCaretPosition = (element) => {
	const [selection, position] = getSelectionAndPosition(element);
	return getTextNodeAtPosition(element, position);
};

export const getTextNodeAtPosition = (root, index) => {
	const treeWalker = document.createTreeWalker(
		root,
		NodeFilter.SHOW_TEXT,
		(elem) => {
			if (index > elem.textContent.length) {
				index -= elem.textContent.length;
				return NodeFilter.FILTER_REJECT;
			}
			return NodeFilter.FILTER_ACCEPT;
		}
	);
	const c = treeWalker.nextNode();
	return {
		node: c ? c : root,
		position: index,
	};
};
