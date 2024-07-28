import { Plugin } from 'obsidian';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { isImageWikilink, replaceWidthInImageWikilink, isImageMarkdown, convertMarkdownToWikilink } from './utils';

const imageEdgeMargin = 50;

type ResizeData = {
	element: HTMLImageElement;
	position: number;
	newWidth: number;
	markdown: string;
};

export default class MyPlugin extends Plugin {
	async onload() {
		const imageClickPlugin = ViewPlugin.fromClass(class {
			view: EditorView;

			resizeData: ResizeData | null;

			mouseDownHandler: (event: MouseEvent) => void;
			mouseMoveHandler: (event: MouseEvent) => void;
			mouseUpHandler: (event: MouseEvent) => void;

			constructor(view: EditorView) {
				this.view = view;
				this.resizeData = null;

				this.mouseDownHandler = this.handleMouseDown.bind(this)
				this.mouseMoveHandler = this.handleMouseMove.bind(this);
				this.mouseUpHandler = this.handleMouseUp.bind(this);

				view.dom.addEventListener('mousedown', this.mouseDownHandler);
				view.dom.addEventListener('mousemove', this.mouseMoveHandler);
				view.dom.addEventListener('mouseup', this.mouseUpHandler);
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

			findMarkdownAtPosition(pos: number): string | null {
				let line;
				try {
					line = this.view.state.doc.lineAt(pos) // NOTE when image resized to small size, throws range error?	
					return line.text;
				} catch (error) {
					console.error(`Error getting markdown at position ${pos}: `, error);
					return null
				}
			}

			handleMouseDown = (event: MouseEvent) => {
				event.preventDefault()
				event.stopPropagation();

				const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
				if (!pos) {
					return
				}


				const findImageForResizing = this.findImageForResizing(event);
				if (!findImageForResizing) {
					return
				}

				const markdown = this.findMarkdownAtPosition(pos);
				if (!markdown || !isImageWikilink(markdown) && !isImageMarkdown(markdown)) {
					return
				}

				const wikilinkMarkdown = isImageMarkdown(markdown)
					? convertMarkdownToWikilink(markdown)
					: markdown

				const imageRect = findImageForResizing.getBoundingClientRect();
				createHandleBar(findImageForResizing);
				this.resizeData = {
					position: pos,
					newWidth: Math.floor(imageRect.width),
					element: findImageForResizing,
					markdown: wikilinkMarkdown,
				};
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

				const newMarkdown = replaceWidthInImageWikilink(this.resizeData.markdown, this.resizeData.newWidth);
				const start = this.view.state.doc.lineAt(this.resizeData.position).from;
				const end = this.view.state.doc.lineAt(this.resizeData.position).to;

				this.view.dispatch({
					changes: { from: start, to: end, insert: newMarkdown }
				});

				document.body.style.cursor = "auto";
				this.resizeData = null;
				removeHandleBar();
			}

			destroy() {
				this.view.dom.removeEventListener('mousedown', this.mouseDownHandler);
				this.view.dom.removeEventListener('mousemove', this.mouseMoveHandler);
				this.view.dom.removeEventListener('mouseup', this.mouseUpHandler);
			}
		});

		this.registerEditorExtension(imageClickPlugin);
	}
}


// TODO class

const handleBarId = 'image-resize-handlebar';

function createHandleBar(image: HTMLImageElement) {
	const handleBar = document.createElement('div');
	handleBar.id = handleBarId;

	handleBar.style.position = 'absolute';
	handleBar.style.width = '5px';
	handleBar.style.backgroundColor = `rgba(255, 255, 255, 0.6)`;
	handleBar.style.borderRadius = '4px';
	handleBar.style.pointerEvents = 'none';
	handleBar.style.border = '1px solid rgba(0, 0, 0, 0.5)';

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

