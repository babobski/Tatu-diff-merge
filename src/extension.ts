// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { TatuDiffPanel } from './tatuDiff/TatuDiffPanel';
import { TatuStartUpPanel } from './tatuDiff/startUpPanel';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand('tatudiff.mergeWithClipboard', async () => {
			const editor = vscode.window.activeTextEditor;

			if (editor) {
				const document = editor.document,
					eol = document.eol,
					currentSettings = vscode.workspace.getConfiguration('tatu-diff');
				
				let test01 = await vscode.env.clipboard.readText(),
					test02 = document.getText(),
					firstLine = document.lineAt(0),
					lastLine = document.lineAt(document.lineCount -1),
					fullRange = new vscode.Range(firstLine.range.start, lastLine.rangeIncludingLineBreak.end),
					fileUri = document.uri,
					fileName = getLastPath(fileUri.path),
					language = document.languageId;

				if (currentSettings.has('getting_started') && currentSettings.get('getting_started') === false) {
					TatuDiffPanel.createPanel(context.extensionPath, test01, test02, 'Clipboard', fileName, eol, language);
					TatuDiffPanel.storeData(editor, fullRange, fileUri);
				} else {
					currentSettings.update('getting_started', false, true);
					TatuStartUpPanel.createPanel(context.extensionPath);
				}

			} else {
				console.log('Failed to load editor');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tatudiff.mergeWithFile', async () => {
			const editor = vscode.window.activeTextEditor;

			if (editor) {
				const document = editor.document,
					currentSettings = vscode.workspace.getConfiguration('tatu-diff'),
					eol = document.eol,
					file = await vscode.window.showOpenDialog({});

				if (file) {
					let filePath = file[0];
					const content = fs.readFileSync(filePath.fsPath),
						fileContent = content.toString('utf8');
					
					
					let selFile = getLastPath(filePath.path),
						test01 = await fileContent,
						test02 = document.getText(),
						firstLine = document.lineAt(0),
						lastLine = document.lineAt(document.lineCount -1),
						fullRange = new vscode.Range(firstLine.range.start, lastLine.rangeIncludingLineBreak.end),
						fileUri = document.uri,
						fileName = getLastPath(fileUri.path),
						language = document.languageId;

					if (currentSettings.has('getting_started') && currentSettings.get('getting_started') === false) {
						TatuDiffPanel.createPanel(context.extensionPath, test01, test02, selFile, fileName, eol, language);
						TatuDiffPanel.storeData(editor, fullRange, fileUri);
					} else {
						currentSettings.update('getting_started', false, true);
						TatuStartUpPanel.createPanel(context.extensionPath);
					}
					
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
				const document = editor.document,
					eol = document.eol,
					currentSettings = vscode.workspace.getConfiguration('tatu-diff');

				let fileUri = document.uri,
					fileName = getLastPath(fileUri.path);

				const content = fs.readFileSync(document.uri.fsPath),
					fileContent = content.toString('utf8');
				
				let test01 = document.getText(),
					test02 = await fileContent,
					firstLine = document.lineAt(0),
					lastLine = document.lineAt(document.lineCount -1),
					fullRange = new vscode.Range(firstLine.range.start, lastLine.rangeIncludingLineBreak.end),
					language = document.languageId;

				if (currentSettings.has('getting_started') && currentSettings.get('getting_started') === false) {
					TatuDiffPanel.createPanel(context.extensionPath, test01, test02, 'File on disk', fileName, eol, language);
					TatuDiffPanel.storeData(editor, fullRange,  fileUri);
				} else {
					currentSettings.update('getting_started', false, true);
					TatuStartUpPanel.createPanel(context.extensionPath);
				}

			} else {
				console.log('Failed to load editor');
			}
		})
	);
}

function getLastPath(path: string) {
	let pathLength = path.length,
		startPath = pathLength > 55 ? pathLength - 55 : 0;
		if (startPath === 0) {
			path = path.replace(/^\/([a-z]):\//gi, '$1:/');
		}
	return (startPath > 0 ? '...' : '') + path.substr(startPath, pathLength);
}

// this method is called when your extension is deactivated
export function deactivate() {}

