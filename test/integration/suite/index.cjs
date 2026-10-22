const assert = require('node:assert');
const vscode = require('vscode');

async function run() {
  const extension = vscode.extensions.getExtension('filispeen.local-actions-just-like-github');
  assert.ok(extension, 'Extension filispeen.local-actions-just-like-github should be found');

  if (!extension.isActive) {
    await extension.activate();
  }
  assert.strictEqual(extension.isActive, true, 'Extension should be active');

  const commands = await vscode.commands.getCommands(true);
  const expectedCommands = [
    'localActions.openActionsPage',
    'localActions.refreshComponents',
    'localActions.refreshWorkflows',
    'localActions.refreshSettings',
    'localActions.runWorkflow',
    'localActions.runJob',
    'localActions.runWorkflowWithInputs'
  ];

  for (const cmd of expectedCommands) {
    assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
  }
}

module.exports = {
  run
};
