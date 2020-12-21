import { getTextNodeAtPosition } from "./rangeModifiers.js";

export const locations = (sub, string) => {
	let a = [],
		i = -1;
	while ((i = string.indexOf(sub, i + 1)) >= 0) {
		if (a[a.length - 1] == i - 1) a.splice(-1, 1);
		else a.push(i);
	}
	return a;
};

export const makePairsOfMatchingIndecies = (substring, string) => {
	const locs = locations(substring, string);

	const pairs = locs.reduce((res, v, i, arr) => {
		if (i % 2 === 0) res.push(arr.slice(i, i + 2));
		return res;
	}, []);

	return pairs;
};

// get the number of characters to adjust a position in order to take a position in
// an HTML string and convert it to the equivalent position in a normal text string
export const getHtmlToStringDiff = (html, pos) => {
	const el = document.createElement("span");
	el.innerHTML = html.substring(0, pos);
	const diff = el.innerHTML.length - el.textContent.length;
	el.remove();
	return diff;
};

export const checkForMissingMarkdownAndRemoveTags = (entity, tags, html) => {
	const pairs = makePairsOfMatchingIndecies(entity, html);
	for (const pair of pairs) {
		if (pair.length === 1) {
			// determine if this is the start or end of a tag
			const pre = html.substring(
				pair[0] + entity.length,
				pair[0] + tags[0].length + entity.length
			);
			const post = html.substring(pair[0] - tags[1].length, pair[0]);

			if (pre === tags[0]) {
				// this is the first tag, so there's an unmatched closing tag after it somewhere
				const end =
					html.substring(pair[0]).indexOf(tags[1]) +
					html.substring(0, pair[0]).length;

				// now remove both the opening and closing tags
				const newHtml =
					html.substring(0, pair[0] + entity.length) +
					html.substring(
						pair[0] + tags[0].length + entity.length,
						end
					) +
					html.substring(end + tags[1].length);
				return [newHtml, null, null];
			} else if (post === tags[1]) {
				// this is the second tag, so there's an unmatched opening tag
				const start = html.substring(0, pair[0]).lastIndexOf(tags[0]);
				const newHtml =
					html.substring(0, start) +
					html.substring(
						start + tags[0].length,
						pair[0] - tags[1].length
					) +
					html.substring(pair[0]);
				return [newHtml, null, null];
			}
		}
	}
};

export const checkForMarkdownAndInsertTags = (entity, tags, html, entities) => {
	const pairs = makePairsOfMatchingIndecies(entity, html);

	for (const pair of pairs) {
		if (pair.length === 2 && pair[0] + 1 !== pair[1]) {
			// get the positions that the tags should exist if they did
			const pre = html.substring(
				pair[0] + entity.length,
				pair[0] + tags[0].length + entity.length
			);
			const pre2 = html.substring(
				pair[1] + entity.length,
				pair[1] + tags[0].length + entity.length
			);
			const post = html.substring(pair[1] - tags[1].length, pair[1]);

			if (pre2 === tags[0]) {
				// we're before the first instance of the tag, do nothing
				return;
			} else if (pre !== tags[0] && post !== tags[1]) {
				let opHtml = html;
				let start = pair[0];
				let end = pair[1];

				// check if one of the other tags is already there
				for (const entity of entities) {
					// if pre contains the first tag
					if (pre.indexOf(entity.t[0]) > -1) {
						// strip out those tags
						const cleanedSection = html
							.substring(start, end)
							.replace(entity.t[0], "")
							.replace(entity.t[1], "");
						opHtml =
							html.substring(0, start) +
							cleanedSection +
							html.substring(end);
						// remove the length of the old tags from the end position
						end -= entity.t[1].length + entity.t[0].length;
						break;
					}
				}
				// add the tags and stop searching for more things to fix
				const newHtml =
					opHtml.substring(0, start + entity.length) +
					tags[0] +
					opHtml.substring(start + entity.length, end) +
					tags[1] +
					opHtml.substring(end);

				const diff = getHtmlToStringDiff(opHtml, end);

				return [newHtml, start + entity.length, end - diff];
			}
		}
	}
};

export const checkAllMarkdown = (entities, html) => {
	for (const entity of entities) {
		const h = checkForMarkdownAndInsertTags(
			entity.e,
			entity.t,
			html,
			entities
		);
		if (h !== undefined) {
			return h;
		} else {
			const n = checkForMissingMarkdownAndRemoveTags(
				entity.e,
				entity.t,
				html
			);
			if (n !== undefined) return n;
		}
	}
};

export const insertMarkdownAroundSelection = (entity, range, root) => {
	// get the range
	let el1 = range.startContainer;
	let el2 = range.endContainer;

	let start = range.startOffset;
	let end = range.endOffset;

	if (root.isSameNode(el1)) {
		// the entire editor is selected, so manually get the last and first nodes
		const r1 = getTextNodeAtPosition(root, 0);
		const r2 = getTextNodeAtPosition(root, root.textContent.length);
		el1 = r1.node;
		el2 = r2.node;
		start = r1.position;
		end = r2.position;
	}

	if (!el1.isSameNode(el2)) {
		// the range end and start are in different nodes, so add the character to the correct
		// positions in both elements
		const n1 =
			el1.textContent.substring(0, start) +
			entity +
			el1.textContent.substring(start);
		const n2 =
			el2.textContent.substring(0, end) +
			entity +
			el2.textContent.substring(end);
		el1.textContent = n1;
		el2.textContent = n2;
	} else {
		// the end and start are in the same node
		const c = el1.textContent;
		const n =
			c.substring(0, start) +
			entity +
			c.substring(range.startOffset, end) +
			entity +
			c.substring(end);
		el1.textContent = n;
	}
};
