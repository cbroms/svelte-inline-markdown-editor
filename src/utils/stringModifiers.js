export const locations = (substring, string) => {
	let a = [],
		i = -1;
	while ((i = string.indexOf(substring, i + 1)) >= 0) a.push(i);
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


export const checkForMissingMarkdownAndRemoveTags = (entity, tags, html) => {

	const pairs = makePairsOfMatchingIndecies(entity, html)
	for (const pair of pairs) {
		if (pair.length === 1) {
			// determine if this is the start or end of a tag 
			const pre = html.substring(pair[0] + entity.length, pair[0] + tags[0].length + entity.length);
			const post = html.substring(pair[0] - tags[1].length, pair[0]);

			if (pre === tags[0]) {
				// this is the first tag, so there's an unmatched closing tag after it somewhere 
				const end = html.substring(pair[0]).indexOf(tags[1]) + html.substring(0, pair[0]).length;
			
				// now remove both the opening and closing tags 
				return html.substring(0, pair[0] + entity.length) + 
						html.substring(pair[0] + tags[0].length + 
						entity.length, end) + html.substring(end + tags[1].length)
			
			} else if (post === tags[1]) {
				// this is the second tag, so there's an unmatched opening tag 
				const start = html.substring(0, pair[0]).lastIndexOf(tags[0])
				return html.substring(0, start) + 
						html.substring(start + tags[0].length, pair[0] - tags[1].length) + 
						html.substring(pair[0])

			}
		}
	}
}

export const checkForMarkdownAndInsertTags = (entity, tags, html) => {

	const pairs = makePairsOfMatchingIndecies(entity, html)
	for (const pair of pairs) {
		if (pair.length === 2 && pair[0] + 1 !== pair[1] ) {

			// get the positions that the tags should exist if they did 
			const pre = html.substring(pair[0] + entity.length, pair[0] + tags[0].length + entity.length);
			const pre2 = html.substring(pair[1] + entity.length, pair[1] + tags[0].length + entity.length);
			const post = html.substring(pair[1] - tags[1].length, pair[1]);

			if (pre2 === tags[0]) {
				// we're before the first instance of the tag, do nothing
				return;
			} else if (pre !== tags[0] && post !== tags[1]) {
			
				// add the tags and stop searching for more things to fix
				return (
					html.substring(0, pair[0] + entity.length) +
					tags[0] +
					html.substring(pair[0] + entity.length, pair[1]) +
					tags[1] +
					html.substring(pair[1], html.length)
					)
			}
		}
	}
}


export const checkAllMarkdown = (entities, html) => {
	for (const entity of entities) {
		const h = checkForMarkdownAndInsertTags(entity.e, entity.t, html)
		if (h !== undefined) {
			return h
		} else {
			const n = checkForMissingMarkdownAndRemoveTags(entity.e, entity.t, html)
			if (n !== undefined) return n
		}
	}
}