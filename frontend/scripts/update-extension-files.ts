const fs = require('fs-extra');
const path = require('path');

async function updateExtensionFiles() {
  const projectRoot = path.resolve(__dirname, '../');
  const sourceDir = path.join(projectRoot, 'frontend/src/extension');
  const destDir = path.join(projectRoot, 'extension-files');

  await fs.copy(sourceDir, destDir, { overwrite: true });
  console.log('Extension files updated!');
}

updateExtensionFiles().catch(console.error);
