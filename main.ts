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

			ResizeData: ResizeData | null;

			constructor(view: EditorView) {
				this.view = view;
				this.ResizeData = null;

				view.dom.addEventListener('mousedown', this.handleMouseDown.bind(this));
				view.dom.addEventListener('mousemove', this.handleMouseMove.bind(this));
				view.dom.addEventListener('mouseup', this.handleMouseUp.bind(this));
			}

			handleMouseDown = (event: MouseEvent) => {
				event.preventDefault()
				event.stopPropagation();

				const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
				if (!pos) {
					return
				}

				const imageElements = this.view.contentDOM.querySelectorAll('.image-embed img');

				const clickedImage = Array.from(imageElements).find(image => {
					const imageimageRect = image.getBoundingClientRect();
					return event.clientX > imageimageRect.right - imageEdgeMargin && event.clientY > imageimageRect.top && event.clientY < imageimageRect.bottom;
				}) as HTMLImageElement | undefined

				if (clickedImage) {
					const imageimageRect = clickedImage.getBoundingClientRect();
					createHandleBar(clickedImage);
					this.ResizeData = {
						position: pos,
						newWidth: Math.floor(imageimageRect.width),
						element: clickedImage,
					};
				}
			};

			handleMouseMove(event: MouseEvent) {
				if (this.ResizeData) {
					const imageimageRect = this.ResizeData.element.getBoundingClientRect();
					const newWidth = Math.max(0, Math.floor(event.clientX - imageimageRect.left));

					this.ResizeData.newWidth = newWidth;
					this.ResizeData.element.style.width = `${newWidth}px`;
					updateHandleBar(this.ResizeData.element);
				} else {
					// TODO hover state?
				}
			}

			handleMouseUp() {
				if (!this.ResizeData) {
					return
				}

				let markdownLine;
				try {
					markdownLine = this.view.state.doc.lineAt(this.ResizeData.position) // NOTE when image resized to small size, throws range error?	
				} catch (error) {
					console.error('Error resizing image', error);
					this.ResizeData = null;
					return
				}

				const markdown = markdownLine.text;
				if (isImageMarkdown(markdown)) {
					const newMarkdown = replaceWidthInImageMarkdown(markdown, this.ResizeData.newWidth);
					const start = this.view.state.doc.lineAt(this.ResizeData.position).from;
					const end = this.view.state.doc.lineAt(this.ResizeData.position).to;

					this.view.dispatch({
						changes: { from: start, to: end, insert: newMarkdown }
					});
				} else {
					console.error(`Selected markdown ${markdown} is not an image`);
				}

				this.ResizeData = null;
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
