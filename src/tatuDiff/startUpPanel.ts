import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class TatuStartUpPanel {

	public static currentPanel: TatuStartUpPanel | undefined;
	public static currEditor: vscode.TextEditor | undefined;
	public static currRange: vscode.Range;
	public static currUri: vscode.Uri;

	public static readonly viewType = 'tatuDiffStartUp';

	private _panel: vscode.WebviewPanel;
	private readonly _extensionUri: string;
	private _disposables: vscode.Disposable[] = [];

	public static createPanel(extensionUri: string, currentAction: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		
			
		const panel = vscode.window.createWebviewPanel(
			TatuStartUpPanel.viewType,
			'Tatu Diff Getting Started',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'open_settings':
						vscode.commands.executeCommand('workbench.action.openSettings', 'tatu-diff');
						break;
						case 'close_window':
							if (this.currentPanel) {
								this.currentPanel.dispose();
								setTimeout(() => {
									vscode.commands.executeCommand(message.action, 'tatu-diff');
								}, 700);
						}
						break;
				}
			}
		);

		TatuStartUpPanel.currentPanel = new TatuStartUpPanel(panel, extensionUri, currentAction);
	}

	constructor(panel: vscode.WebviewPanel, extensionUri: string, currentAction: string) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._panel.iconPath = {light: vscode.Uri.file(path.join(this._extensionUri, 'media', 'icons/tatu-icon.svg')), dark: vscode.Uri.file(path.join(this._extensionUri, 'media', 'icons/tatu-icon.svg'))};

		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, currentAction);

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	public dispose() {
		TatuStartUpPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview, currentAction: string) {
		const styleMainPath = vscode.Uri.file(
				path.join(this._extensionUri, 'media', 'css/StartUp.css')
			),
			styleMainUri = webview.asWebviewUri(styleMainPath),
			styleBootstrapPath = vscode.Uri.file(
				path.join(this._extensionUri, 'media', 'css/bootstrap.css')
			),
			styleBootstrapUri = webview.asWebviewUri(styleBootstrapPath),
			 nonce = getNonce();

		let replacements = {
				styleBootstrapUri: styleBootstrapUri.toString(),
				styleMainUri: styleMainUri.toString(),
				currentAction: currentAction,
				nonce: nonce
			},
			htmlDoc = fs.readFileSync(path.join(this._extensionUri, 'media', 'startUp.html')),
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

