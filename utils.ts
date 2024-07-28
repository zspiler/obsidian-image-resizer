function replaceWidthInImageWikilink(str: string, newWidth: number): string {
	const patternWithWidth = /(!\[\[[^|\]]+?)\s*\|\s*\d+.*?\]\]/;
	const patternWithoutWidth = /(!\[\[[^|\]]+?)\]\]/;

	if (patternWithWidth.test(str)) {
		// If the string has a width part, replace it
		return str.replace(patternWithWidth, `$1 | ${newWidth}]]`);
	} else if (patternWithoutWidth.test(str)) {
		// If the string does not have a width part, add it
		return str.replace(patternWithoutWidth, `$1 | ${newWidth}]]`);
	}

	return str;
}


function isImageWikilink(s: string) {
	const pattern = /^!\[\[([^\]]+)(\s*\|\s*(\d+)(x(\d+))?( \d+ \d+ \d+)?)?\]\]$/;
	return pattern.test(s);
}

function isImageMarkdown(str: string): boolean {
	const pattern = /^!\[.*?\]\((.*?)\)$/;
	return pattern.test(str);
}

function convertMarkdownToWikilink(markdown: string): string {
	const markdownPattern = /^!\[(.*?)\]\((.*?)\)$/;
	const match = markdown.match(markdownPattern);
	if (!match) {
		throw new Error("Invalid image markdown format");
	}
	const imageUrl = match[2];
	// TODO exclamation represents external link 
	return `![[${imageUrl}]]`;
}

export { replaceWidthInImageWikilink, isImageWikilink, isImageMarkdown, convertMarkdownToWikilink };
