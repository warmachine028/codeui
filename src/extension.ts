'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { getConfig } from './configuration';
import { ElementProvider, ViewMode } from './elements';
import { InfoProvider } from './info';
import { TargetingModeStatusBarItem } from './statusbar';

let elementProvider: ElementProvider;
let infoProvider: InfoProvider;

const config = getConfig();

/**
 * Called when the extension is first activated.
 */
export function activate(context: vscode.ExtensionContext) {
	const registerCommand = vscode.commands.registerCommand;

	const targetingModeStatusBarItem = new TargetingModeStatusBarItem();
	registerCommand('toggleTargetingMode', () => config.toggleTargetingMode());

	infoProvider = new InfoProvider();
	vscode.window.registerTreeDataProvider('codeui.views.info', infoProvider);
	registerCommand('showElementInfo', (element) => infoProvider.updateSelectedElement(element));

	elementProvider = new ElementProvider(ViewMode.standard);
	vscode.window.registerTreeDataProvider('codeui.views.elements', elementProvider);
	registerCommand('customize', (element) => elementProvider.customize(element));
	registerCommand('adjustBrightness', (element) => elementProvider.adjustBrightness(element));
	registerCommand('clear', (element) => elementProvider.clear(element));
	registerCommand('copy', (element) => elementProvider.copy(element));
	registerCommand('toggleViewMode', () => elementProvider.toggleViewMode());

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('codeui.targetingMode')) {
				targetingModeStatusBarItem.update();
			}
			if (
				e.affectsConfiguration('workbench.colorTheme') ||
				e.affectsConfiguration('workbench.colorCustomizations')
			) {
				elementProvider.refresh();
				infoProvider.updateTheme();
				infoProvider.refresh();
			}
		})
	);
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate() {
	clearCache();
}

/**
 * Deletes files generated by the extension.
 */
function clearCache() {
	const cache = path.join(__filename, '..', '..', 'resources', 'swatches', 'generated');
	fs.readdir(cache, (err, files) => {
		if (err) throw err;
		for (const file of files) {
			if (file !== '.index') {
				fs.unlink(path.join(cache, file), (err) => {
					if (err) throw err;
				});
			}
		}
	});
}

/**
 * Shows a dialog allowing the user to choose a scope.
 */
export async function chooseScope(workspaceFolder: vscode.WorkspaceFolder) {
	const result = await vscode.window.showQuickPick(
		[
			{ label: 'Global', target: vscode.ConfigurationTarget.Global },
			{
				label: `Workspace (${workspaceFolder.name})`,
				target: vscode.ConfigurationTarget.Workspace,
			},
		],
		{ placeHolder: 'Select a target...' }
	);
	if (result) {
		return result.target;
	}
}

/**
 * Shows a notification from CodeUI.
 */
export async function showNotification(message: string) {
	const isEnabled = await vscode.workspace.getConfiguration().get('codeui.showNotifications');
	if (isEnabled === true) {
		vscode.window.showInformationMessage('CodeUI: ' + message);
	} else {
		return;
	}
}

/**
 * Gets the current Info view provider instance.
 */
export function getInfoProvider() {
	return infoProvider;
}
