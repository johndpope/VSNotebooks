'use strict';

import { CodeLensProvider, TextDocument, CancellationToken, CodeLens, Command } from 'vscode';
import { CellHelper } from './cellHelper';
import * as vscode from 'vscode';

export class JupyterCodeLensProvider implements CodeLensProvider {
    private cache: { fileName: string, documentVersion: number, lenses: CodeLens[] }[] = [];
    public provideCodeLenses(document: TextDocument, token: CancellationToken): Thenable<CodeLens[]> {
        // Implement our own cache for others to use
        // Yes VS Code also caches, but we want to cache for our own usage
        const index = this.cache.findIndex(item => item.fileName === document.fileName);
        if (index >= 0) {
            const item = this.cache[index];
            if (item.documentVersion === document.version) {
                return Promise.resolve(item.lenses);
            }
            this.cache.splice(index, 1);
        }

        const cells = CellHelper.getCells(document);
        if (cells.length === 0) {
            return Promise.resolve([]);
        }

        const lenses: CodeLens[] = [];
        cells.forEach((cell, index) => {
            const cmd: Command = {
                arguments: [document, cell.range],
                title: 'Run cell',
                command: null
            };
            lenses.push(new CodeLens(cell.range, cmd));
        });

        this.cache.push({ fileName: document.fileName, documentVersion: document.version, lenses: lenses });
        return Promise.resolve(lenses);
    }
    public hasCodeCells(document: vscode.TextDocument, token: vscode.CancellationToken): Promise < boolean > {
        return new Promise<boolean>(resolve => {
            this.provideCodeLenses(document, token).then(codeLenses => {
                resolve(Array.isArray(codeLenses) && codeLenses.length > 0);
            }, reason => {
                console.error('Failed to detect code cells in document');
                console.error(reason);
                resolve(false);
            });
        });
    }
}