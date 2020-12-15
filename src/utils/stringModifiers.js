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
