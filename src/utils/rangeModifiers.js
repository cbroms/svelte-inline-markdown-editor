// fanstatic solution from
// https://stackoverflow.com/a/38479462
export function saveCaretPosition(id) {
	const context = document.getElementById(id);

	const selection = window.getSelection();
	const range = selection.getRangeAt(0);
	range.setStart(context, 0);
	const len = range.toString().length;

	return function restore() {
		const pos = getTextNodeAtPosition(context, len);
		selection.removeAllRanges();
		const range = new Range();
		range.setStart(pos.node, pos.position);
		selection.addRange(range);
	};
}

export function getCaretPosition(id) {
	const context = document.getElementById(id);

	const selection = window.getSelection();
	const range = selection.getRangeAt(0);
	range.setStart(context, 0);
	const len = range.toString().length;

	return getTextNodeAtPosition(context, len);
}

export function getTextNodeAtPosition(root, index) {
	const NODE_TYPE = NodeFilter.SHOW_TEXT;
	var treeWalker = document.createTreeWalker(
		root,
		NODE_TYPE,
		function next(elem) {
			if (index > elem.textContent.length) {
				index -= elem.textContent.length;
				return NodeFilter.FILTER_REJECT;
			}
			return NodeFilter.FILTER_ACCEPT;
		}
	);
	var c = treeWalker.nextNode();
	return {
		node: c ? c : root,
		position: index,
	};
}
