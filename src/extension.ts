// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { readFileSync } from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand('tatudiff.mergeWithClipboard', async () => {
			const editor = vscode.window.activeTextEditor;

			if (editor) {
				const document = editor.document;
				const eol = document.eol;
				
				let test01 = await vscode.env.clipboard.readText();
				let test02 = document.getText();
				let firstLine = document.lineAt(0);
				let lastLine = document.lineAt(document.lineCount -1);
				let fullRange = new vscode.Range(firstLine.range.start, lastLine.rangeIncludingLineBreak.end);
				let fileUri = document.uri;
				
				TatuDiffPanel.createPanel(context.extensionPath, test01, test02, eol);
				TatuDiffPanel.storeData(editor, fullRange, fileUri);
			} else {
				console.log('Failed to load editor');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tatudiff.mergeWithFile', async () => {
			const editor = vscode.window.activeTextEditor;

			if (editor) {
				const document = editor.document;
				
				const eol = document.eol;

				const file = await vscode.window.showOpenDialog({});
				if (file) {
					let filePath = file[0];
					const content = readFileSync(filePath.fsPath);
					const fileContent = content.toString('utf8');
					
					
					let test01 = await fileContent;
					let test02 = document.getText();
					let firstLine = document.lineAt(0);
					let lastLine = document.lineAt(document.lineCount -1);
					let fullRange = new vscode.Range(firstLine.range.start, lastLine.rangeIncludingLineBreak.end);
					let fileUri = document.uri;
					
					TatuDiffPanel.createPanel(context.extensionPath, test01, test02, eol);
					TatuDiffPanel.storeData(editor, fullRange, fileUri);
				}
			} else {
				console.log('Failed to load editor');
			}
		})
	);
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getWebviewOptions(extensionUri: string): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [
			vscode.Uri.file(
				path.join(extensionUri, 'media')
			),
		]
	};
}

class TatuDiffPanel {

	public static currentPanel: TatuDiffPanel | undefined;
	public static currEditor: vscode.TextEditor | undefined;
	public static currRange: vscode.Range;
	public static currUri: vscode.Uri;

	public static readonly viewType = 'tatuDiff';

	private _panel: vscode.WebviewPanel;
	private readonly _extensionUri: string;
	private _disposables: vscode.Disposable[] = [];

	public static createPanel(extensionUri: string, newTxt: string, baseTxt: string, eol: number) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		
			
		const panel = vscode.window.createWebviewPanel(
			TatuDiffPanel.viewType,
			'Tatu Diff',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'no_result':
						vscode.window.showInformationMessage('Tatu Diff: No changes found');
						break;
					case 'copy_result':
						vscode.env.clipboard.writeText(message.text);
						vscode.window.setStatusBarMessage('Copied the result to the clipboard', 4000);
						break;
					case 'save_result':
						if (this.currentPanel) {
							this.currentPanel.dispose();
						}	

						vscode.window.showTextDocument(this.currUri).then(() => {
							let editor = vscode.window.activeTextEditor;							
							if (editor) {
								let document = editor.document;
								// Make sure where editing the same file
								if (document.uri === this.currUri) {
									editor.edit(editBuilder => {
										editBuilder.replace(this.currRange, message.text);
									});
								}
							} 
						});
						break;
				}
			}
		);

		TatuDiffPanel.currentPanel = new TatuDiffPanel(panel, extensionUri, newTxt, baseTxt, eol);
	}
	
	public static storeData(editor: vscode.TextEditor, textRange: vscode.Range, uri: vscode.Uri) {
		this.currEditor = editor;
		this.currRange = textRange;
		this.currUri = uri;
	}

	constructor(panel: vscode.WebviewPanel, extensionUri: string, newTxt: string, baseTxt: string, eol: number) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, newTxt, baseTxt, eol);

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	public dispose() {
		TatuDiffPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: string, newTxt: string, baseTxt: string, eol: number) {
		TatuDiffPanel.currentPanel = new TatuDiffPanel(panel, extensionUri, newTxt, baseTxt, eol);
	}

	private _getHtmlForWebview(webview: vscode.Webview, newTxt: string, baseTxt: string, eol: number) {
		const scriptDiffMatchPathOnDisk = vscode.Uri.file(
			path.join(this._extensionUri, 'media', 'js/diff_match_patch.js')
		);
		const scriptDiffLibPathOnDisk = vscode.Uri.file(
			path.join(this._extensionUri, 'media', 'js/difflib.js')
		);
		const scriptDiffViewPathOnDisk = vscode.Uri.file(
			path.join(this._extensionUri, 'media', 'js/diffview.js')
		);
		const scriptSmoothScrollPathOnDisk = vscode.Uri.file(
			path.join(this._extensionUri, 'media', 'js/smoothscroll.js')
		);
		const scriptTatuDiffPathOnDisk = vscode.Uri.file(
			path.join(this._extensionUri, 'media', 'js/TatuDiff.js')
		);
		const scriptDiffMatchUri = webview.asWebviewUri(scriptDiffMatchPathOnDisk);
		const scriptDiffLibUri = webview.asWebviewUri(scriptDiffLibPathOnDisk);
		const scriptDiffViewUri = webview.asWebviewUri(scriptDiffViewPathOnDisk);
		const scriptSmoothScrollUri = webview.asWebviewUri(scriptSmoothScrollPathOnDisk);
		const scriptTatuDiffUri = webview.asWebviewUri(scriptTatuDiffPathOnDisk);

		const styleMainPath = vscode.Uri.file(
			path.join(this._extensionUri, 'media', 'css/TatuDiff.css')
		);
		const styleMainUri = webview.asWebviewUri(styleMainPath);
		
		const nonce = getNonce();

		baseTxt = baseTxt.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
		newTxt = newTxt.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource};">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<link href="${styleMainUri}" rel="stylesheet">
			<title>Tatu Diff</title>
		</head>
		<body>
		<div class="control-box">
			<div class="changes-box">
				<div id="inserted">
					<label>
						Inserted
					</label>
					<span id="insertCount">
						0
					</span>
				</div>
				<div id="deleted">
					<label>
						Deleted
					</label>
					<span id="deletedCount">
						0
					</span>
				</div>
				<div id="changed">
					<label>
						Changed
					</label>
					<span id="changedCount">
						0
					</span>
				</div>
			</div>
			<div class="controls">
				<table width="100%">
					<tr>
						<td>
							<button id="scroll_to_prev" title="Previous diff">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-up-circle" viewBox="0 0 16 16">
									<path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-7.5 3.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z"/>
								</svg>
							</button>
						</td>
						<td>
							<button id="scroll_to_next" title="Next diff">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-down-circle" viewBox="0 0 16 16">
									<path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z"/>
								</svg>
							</button>
						</td>
					</tr>
					<tr>
						<td>
							<button id="merge_lines" title="Merge" disabled>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-right-circle" viewBox="0 0 16 16">
									<path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
								</svg>
							</button>
						</td>
						<td>
							<button id="delete_lines" title="Delete" disabled>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">
									<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
									<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
								</svg>
							</button>
						</td>
					</tr>
					<tr>
						<td>
							<button id="copy_result" title="Copy result to clipboard">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard-check" viewBox="0 0 16 16">
									<path fill-rule="evenodd" d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
									<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
									<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
								</svg>
							</button>
						</td>
						<td>
							<button id="save_result" title="Save rsult">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle" viewBox="0 0 16 16">
									<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
									<path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
								</svg>
							</button>
						</td>
					</tr>
				</table>
			</div>
		</div>
		<div id="diffWindow">
				
		</div>
		<script nonce="${nonce}" src="${scriptDiffMatchUri}"></script>
		<script nonce="${nonce}" src="${scriptDiffLibUri}"></script>
		<script nonce="${nonce}">
			var mergeResult		= '',
				leftLines 		= [],
				rightLines 		= [],
				currChange		= -1,
				History			= [],
				EOL				= ${eol},
				lastSelected;
			const vscode = acquireVsCodeApi();
		</script>
		<script nonce="${nonce}" src="${scriptDiffViewUri}"></script>
		<script nonce="${nonce}">
			async function diffUsingJS() {
				let diffoutputdiv = document.getElementById("diffWindow");
				let TatuDiff = new Promise(function(Resolve, Reject) {
					var base = difflib.stringAsLines(\`${baseTxt}\`);
					var newtxt = difflib.stringAsLines(\`${newTxt}\`);
					var sm 				= new difflib.SequenceMatcher(base, newtxt),
						opcodes 		= sm.get_opcodes();
					
					Resolve(diffview.buildView({
						baseTextLines: base,
						newTextLines: newtxt,
						opcodes: opcodes,
						newTextName: '',
						baseTextName: '',
						contextSize: null,
						viewType: 0
					}));
				});

				while (diffoutputdiv.firstChild) diffoutputdiv.removeChild(diffoutputdiv.firstChild);

				TatuDiff.then(function(diffview){
					diffoutputdiv.appendChild(diffview);

					if (window.NO_CHANGES) {
						vscode.postMessage({
							command: 'no_result'
						});
					}
				});
			}
			window.addEventListener('load', diffUsingJS);
		</script>
		<script nonce="${nonce}" src="${scriptSmoothScrollUri}"></script>
		<script nonce="${nonce}" src="${scriptTatuDiffUri}"></script>
		</body>
		</html>`;
	}
}
