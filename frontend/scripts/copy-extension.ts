const fs = require('fs-extra');
const path = require('path');

async function copyExtensionFiles() {
  const projectRoot = path.resolve(__dirname, '../');
  const frontendDist = path.join(projectRoot, 'frontend/dist');
  const extensionDir = path.join(projectRoot, 'chrome-extension');

  // 1. Копируем результат сборки фронтенда
  await fs.copy(frontendDist, extensionDir, { overwrite: true });

  // 2. Копируем специфичные файлы расширения
  const extensionFiles = [
    'manifest.json',
    'background.js',
    'contentScript.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
  ];

  for (const file of extensionFiles) {
    const source = path.join(projectRoot, 'extension-files', file);
    const dest = path.join(extensionDir, file);

    if (await fs.pathExists(source)) {
      await fs.ensureDir(path.dirname(dest));
      await fs.copyFile(source, dest);
      console.log(`Copied: ${file}`);
    }
  }

  console.log('Extension files copied successfully!');
}

copyExtensionFiles().catch(console.error);
