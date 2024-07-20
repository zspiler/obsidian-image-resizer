import { Plugin } from 'obsidian';

import { EditorView, ViewPlugin } from '@codemirror/view';

const imageEdgeMargin = 50;

type ResizeData = {
	element: HTMLImageElement;
	position: number;
	newWidth: number;
};

export default class MyPlugin extends Plugin {
	async onload() {
		const imageClickPlugin = ViewPlugin.fromClass(class {
			view: EditorView;

			resizeData: ResizeData | null;

			constructor(view: EditorView) {
				this.view = view;
				this.resizeData = null;

				view.dom.addEventListener('mousedown', this.handleMouseDown.bind(this));
				view.dom.addEventListener('mousemove', this.handleMouseMove.bind(this));
				view.dom.addEventListener('mouseup', this.handleMouseUp.bind(this));
			}

			findImageForResizing(event: MouseEvent): HTMLImageElement | undefined {
				const imageElements = this.view.contentDOM.querySelectorAll('.image-embed img');
				return Array.from(imageElements).find(image => {
					const imageRect = image.getBoundingClientRect();
					return imageRect.right > event.clientX
						&& event.clientX > imageRect.right - imageEdgeMargin
						&& event.clientY > imageRect.top
						&& event.clientY < imageRect.bottom;
				}) as HTMLImageElement | undefined
			}

			handleMouseDown = (event: MouseEvent) => {
				event.preventDefault()
				event.stopPropagation();

				const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
				if (!pos) {
					return
				}

				const findImageForResizing = this.findImageForResizing(event);

				if (findImageForResizing) {
					const imageRect = findImageForResizing.getBoundingClientRect();
					createHandleBar(findImageForResizing);
					this.resizeData = {
						position: pos,
						newWidth: Math.floor(imageRect.width),
						element: findImageForResizing,
					};
				}
			};

			handleMouseMove(event: MouseEvent) {
				if (this.resizeData) {
					const imageRect = this.resizeData.element.getBoundingClientRect();
					const newWidth = Math.max(0, Math.floor(event.clientX - imageRect.left));

					this.resizeData.newWidth = newWidth;
					this.resizeData.element.style.width = `${newWidth}px`;

					setCursorToResize()

					updateHandleBar(this.resizeData.element);
				} else {
					const hoveredImageForResizing = this.findImageForResizing(event);
					if (hoveredImageForResizing) {
						setCursorToResize()
						createHandleBar(hoveredImageForResizing);
					} else {
						resetCursor()
						removeHandleBar();
					}
				}
			}

			handleMouseUp() {
				if (!this.resizeData) {
					return
				}

				let markdownLine;
				try {
					markdownLine = this.view.state.doc.lineAt(this.resizeData.position) // NOTE when image resized to small size, throws range error?	
				} catch (error) {
					console.error('Error resizing image', error);
					this.resizeData = null;
					return
				}

				const markdown = markdownLine.text;
				if (isImageMarkdown(markdown)) {
					const newMarkdown = replaceWidthInImageMarkdown(markdown, this.resizeData.newWidth);
					const start = this.view.state.doc.lineAt(this.resizeData.position).from;
					const end = this.view.state.doc.lineAt(this.resizeData.position).to;

					this.view.dispatch({
						changes: { from: start, to: end, insert: newMarkdown }
					});
				} else {
					console.error(`Selected markdown ${markdown} is not an image`);
				}

				document.body.style.cursor = "auto";
				this.resizeData = null;
				removeHandleBar();
			}

			destroy() {
				// TODO cleanup
				// this.view.dom.removeEventListener('click', this.handleClick);
			}
		});

		this.registerEditorExtension(imageClickPlugin);
	}
}


// TODO class
// TODO show on hover

const handleBarId = 'image-resize-handlebar';

function createHandleBar(image: HTMLImageElement) {
	const handleBar = document.createElement('div');
	handleBar.id = handleBarId;

	handleBar.style.position = 'absolute';
	handleBar.style.width = '3px';
	handleBar.style.backgroundColor = `rgba(255, 255, 255, 0.6)`;
	handleBar.style.borderRadius = '4px';
	handleBar.style.pointerEvents = 'none';

	document.body.appendChild(handleBar);

	updateHandleBar(image);
}

function updateHandleBar(image: HTMLImageElement) {
	const handleBar = document.getElementById(handleBarId);
	if (!handleBar) {
		return
	}

	const imageRect = image.getBoundingClientRect();
	handleBar.style.height = `${imageRect.height / 3}px`;
	handleBar.style.top = `${imageRect.top + imageRect.height / 3 + window.scrollY}px`;
	handleBar.style.left = `${imageRect.right + window.scrollX - 10}px`;
}

function removeHandleBar() {
	const handleBar = document.getElementById(handleBarId);
	if (handleBar) {
		handleBar.remove();
	}
}

function setCursorToResize() {
	document.body.style.cursor = "ew-resize";
}

function resetCursor() {
	document.body.style.cursor = "auto";
}

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
