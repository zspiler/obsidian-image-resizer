
function replaceWidthInImageWikilink(str: string, newWidth: number): string {
	// Define the regex pattern to match the Obsidian image markdown with width
	const pattern = /(!\[\[[^\|\]]+?)\s*\|\s*\d+.*?\]\]/;

	// Replace the width part with the new width
	const replaced = str.replace(pattern, `$1 | ${newWidth}]]`);

	// Handle the case where there is no width part initially
	const noWidthPattern = /(!\[\[[^\|\]]+?)\]\]/;
	if (!pattern.test(str) && noWidthPattern.test(str)) {
		return str.replace(noWidthPattern, `$1 | ${newWidth}]]`);
	}

	return replaced;
}

function isImageWikilink(s: string) {
	const pattern = /^!\[\[([^\]]+)(\s*\|\s*(\d+)(x(\d+))?( \d+ \d+ \d+)?)?\]\]$/;
	return pattern.test(s);
}

export { replaceWidthInImageWikilink, isImageWikilink };
