const vscode = require( 'vscode' );
const simpleGit = require( 'simple-git' );
const parse = require( 'parse-diff' );

const sleep = async ms => new Promise( resolve => setTimeout( resolve, ms ) );

/**
 * @param {vscode.ExtensionContext} context
 */
function activate( context ) {

	context.subscriptions.push( vscode.commands.registerCommand( 'animated-git.diff', async () => {

		const rootPath = vscode.workspace.rootPath;
		if ( ! rootPath ) {
			vscode.window.showErrorMessage( 'First open a folder.' );
			return;
		}

		const git = simpleGit( { baseDir: rootPath } );

		const files = parse( await git.diff() );
		if ( ! files.length ) {
			vscode.window.showErrorMessage( 'First make some changes.' );
			return;
		}

		await git.stash();

		for ( let fileIndex = 0; fileIndex < files.length; fileIndex++ ) {
			await sleep( 300 );
			const file = files[ fileIndex ];
			const document = await vscode.workspace.openTextDocument( vscode.Uri.file( `${rootPath}/${file.from}` ) );
			const editor = await vscode.window.showTextDocument( document );
			
			for ( let chunkIndex = 0; chunkIndex < file.chunks.length; chunkIndex++ ) {
				await sleep( 300 );

				const chunk = file.chunks[ chunkIndex ];

				let currentLine = chunk.oldStart - 1;
				for ( let i = 0; i < chunk.changes.length; i++ ) {
					const change = chunk.changes[ i ];

					if ( change.del ) {
						const from = new vscode.Position( currentLine, 0 );
						// TODO test at end of file
						const to = new vscode.Position( currentLine + 1, 0 );
						editor.selection = new vscode.Selection( from, to );
						editor.revealRange( editor.selection );
						await sleep( 1500 );
						await editor.edit( editBuilder => {
							editBuilder.delete( editor.selection );
							return editBuilder;
						} );

					} else if ( change.add ) {
						if ( change.content[ 0 ] === '\\' ) {
							console.log('remove newline?');
						} else {
							const at = new vscode.Position( currentLine, 0 );
							editor.revealRange( new vscode.Range( at, at ) );
							// TODO not working at end of file?
							await editor.edit( editBuilder => {
								editBuilder.insert( at, change.content.slice( 1 ) + '\n' )
								return editBuilder;
							} );
							await sleep( 1500 );
							currentLine += 1;
						}

					} else {
						currentLine += 1;
					}
				}
			}

			await editor.document.save();	
		}

		if ( ! await git.diff( [ 'stash@{0}' ] ) ) {
			git.stash( [ 'drop' ] );
		} else {
			vscode.window.showErrorMessage( 'Something went wrong -- original changes stashed.' );
		}

	} ) );
}

module.exports = {
	activate,
}
