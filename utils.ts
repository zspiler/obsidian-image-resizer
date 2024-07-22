
function replaceWidthInImageMarkdown(markdown: string, width: number): string {
	// Regular expression to match the image syntax
	const pattern = /!\[\[(.*?)(?: \| \d+)?\]\]/g;

	// Replacement function to add or replace the width attribute
	const replaceWidth = (match: string, p1: string): string => {
		return `![[${p1} | ${width}]]`;
	};

	// Replace all occurrences in the markdown string
	const modifiedMarkdown = markdown.replace(pattern, replaceWidth);

	return modifiedMarkdown;
}


function isImageMarkdown(markdown: string): boolean {
	// TODO improve 

	// Regular expression to match the image syntax
	const pattern = /^!\[\[.*?\]\]$/;

	// Test if the markdown matches the pattern
	return pattern.test(markdown);
}

export { replaceWidthInImageMarkdown, isImageMarkdown };
