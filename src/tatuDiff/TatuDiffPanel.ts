import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class TatuDiffPanel {

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

		this._panel.iconPath = {light: vscode.Uri.file(path.join(this._extensionUri, 'media', 'icons/tatu-icon.svg')), dark: vscode.Uri.file(path.join(this._extensionUri, 'media', 'icons/tatu-icon.svg'))};

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
			),
			scriptBundleUri = webview.asWebviewUri(scriptBundlePathOnDisk),
			styleMainPath = vscode.Uri.file(
				path.join(this._extensionUri, 'media', 'css/TatuDiff.css')
			),
			styleMainUri = webview.asWebviewUri(styleMainPath),
			currentSettings = vscode.workspace.getConfiguration('tatu-diff');

		let styleHighlightPath = vscode.Uri.file(
				path.join(this._extensionUri, 'media', 'css/styles/none.min.css')
			),
			goToSettings = 'go to the settings';

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

		const styleHighlightUri = webview.asWebviewUri(styleHighlightPath),
			nonce = getNonce();

		let replacements = {
				scriptBundleUri: scriptBundleUri.toString(),
				styleMainUri: styleMainUri.toString(),
				styleHighlightUri: styleHighlightUri.toString(),
				baseTitle: baseTitle,
				newTitle: newTitle,
				nonce: nonce
			},
			htmlDoc = fs.readFileSync(path.join(this._extensionUri, 'media', 'tatuDiff.html')),
			docAsString = htmlDoc.toString('utf8');

		for (const [key, value] of Object.entries(replacements)) {
			let regEx = new RegExp('\\${' + key + '}', 'g');
			docAsString = docAsString.replace(regEx, value);
		}
		return docAsString;
	}
}

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

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

