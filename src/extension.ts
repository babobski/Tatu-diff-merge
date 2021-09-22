// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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
				let fileName = getLastPath(fileUri.path);
				let language = document.languageId;

				TatuDiffPanel.createPanel(context.extensionPath, test01, test02, 'Clipboard', fileName, eol, language);
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
					const content = fs.readFileSync(filePath.fsPath);
					const fileContent = content.toString('utf8');
					let selFile = getLastPath(filePath.path);
					
					
					let test01 = await fileContent;
					let test02 = document.getText();
					let firstLine = document.lineAt(0);
					let lastLine = document.lineAt(document.lineCount -1);
					let fullRange = new vscode.Range(firstLine.range.start, lastLine.rangeIncludingLineBreak.end);
					let fileUri = document.uri;
					let fileName = getLastPath(fileUri.path);
					let language = document.languageId;
					
					TatuDiffPanel.createPanel(context.extensionPath, test01, test02, selFile, fileName, eol, language);
					TatuDiffPanel.storeData(editor, fullRange, fileUri);
				}
			} else {
				console.log('Failed to load editor');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tatudiff.mergeWithFileOnDisk', async () => {
			const editor = vscode.window.activeTextEditor;

			if (editor) {
				const document = editor.document;
				const eol = document.eol;

				let fileUri = document.uri;
				let fileName = getLastPath(fileUri.path);

				const content = fs.readFileSync(document.uri.fsPath);
				const fileContent = content.toString('utf8');
				
				let test01 = document.getText();
				let test02 = await fileContent;
				let firstLine = document.lineAt(0);
				let lastLine = document.lineAt(document.lineCount -1);
				let fullRange = new vscode.Range(firstLine.range.start, lastLine.rangeIncludingLineBreak.end);
				let language = document.languageId;
				

				TatuDiffPanel.createPanel(context.extensionPath, test01, test02, 'File on disk', fileName, eol, language);
				TatuDiffPanel.storeData(editor, fullRange,  fileUri);
			} else {
				console.log('Failed to load editor');
			}
		})
	);
}

function getLastPath(path: string) {
	let pathLength = path.length,
		startPath = pathLength > 55 ? pathLength - 55 : 0;
	return (startPath > 0 ? '...' : '') + path.substr(startPath, pathLength);
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

	public static createPanel(extensionUri: string, newTxt: string, baseTxt: string, newTitle: string, baseTitle: string, eol: number, language: string) {
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
					case 'view_opened':
						panel.webview.postMessage({
							command: 'getting_data',
							baseTxt: JSON.stringify(baseTxt),
							newTxt: JSON.stringify(newTxt),
							eol: eol,
							language: language
						});
						break;
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
									}).then(() => {
										document.save();
									});
								}
							} 
						});
						break;
					case 'close_window':
						if (this.currentPanel) {
							this.currentPanel.dispose();
						}
						break;
				}
			}
		);

		TatuDiffPanel.currentPanel = new TatuDiffPanel(panel, extensionUri, newTxt, baseTxt, newTitle, baseTitle, eol, language);
	}
	
	public static storeData(editor: vscode.TextEditor, textRange: vscode.Range, uri: vscode.Uri) {
		this.currEditor = editor;
		this.currRange = textRange;
		this.currUri = uri;
	}

	constructor(panel: vscode.WebviewPanel, extensionUri: string, newTxt: string, baseTxt: string, newTitle: string, baseTitle: string, eol: number, language: string) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, newTxt, baseTxt, newTitle, baseTitle, eol, language);

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

	private _getHtmlForWebview(webview: vscode.Webview, newTxt: string, baseTxt: string, newTitle: string, baseTitle: string, eol: number, language: string) {
		const scriptBundlePathOnDisk = vscode.Uri.file(
			path.join(this._extensionUri, 'media', 'js/bundle.js')
		);

		const scriptBundleUri = webview.asWebviewUri(scriptBundlePathOnDisk);

		const styleMainPath = vscode.Uri.file(
			path.join(this._extensionUri, 'media', 'css/TatuDiff.css')
		);
		const styleMainUri = webview.asWebviewUri(styleMainPath);

		const currentSettings = vscode.workspace.getConfiguration('tatu-diff');

		let styleHighlightPath = vscode.Uri.file(
			path.join(this._extensionUri, 'media', 'css/styles/none.min.css')
		);	

		let goToSettings = 'go to the settings';

		if (currentSettings.has('theme')) {
			const currentTheme = currentSettings.get('theme', '');
			if (currentTheme.length > 0) {
				const currentThemeFileName = 'css/styles/' + currentTheme.replace(/\s\/\s/, '/').replace(/\s/g, '-').toLocaleLowerCase() + '.min.css';
				styleHighlightPath = vscode.Uri.file(
					path.join(this._extensionUri, 'media', currentThemeFileName)
				);
			} else {
				vscode.window.showInformationMessage('Tatu Diff: No color scheme selected, ', goToSettings).then(selection => {
					if (selection === goToSettings) {
						vscode.commands.executeCommand('workbench.action.openSettings', 'tatu-diff');
					}
				});
			}
		} else {
			vscode.window.showInformationMessage('Tatu Diff: No color scheme selected, ', goToSettings).then(selection => {
				if (selection === goToSettings) {
					vscode.commands.executeCommand('workbench.action.openSettings', 'tatu-diff');
				}
			});
		}

		const styleHighlightUri = webview.asWebviewUri(styleHighlightPath);
		
		const nonce = getNonce();

		let replacements = {
			scriptBundleUri: scriptBundleUri.toString(),
			styleMainUri: styleMainUri.toString(),
			styleHighlightUri: styleHighlightUri.toString(),
			baseTitle: baseTitle,
			newTitle: newTitle,
			nonce: nonce
		};

		let htmlDoc = fs.readFileSync(path.join(this._extensionUri, 'media', 'tatuDiff.html'));
		let docAsString = htmlDoc.toString('utf8');

		for (const [key, value] of Object.entries(replacements)) {
			let regEx = new RegExp('\\${' + key + '}', 'g');
			docAsString = docAsString.replace(regEx, value);
		}
		return docAsString;
	}
}
