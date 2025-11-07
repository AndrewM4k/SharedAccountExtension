// Build script for extension TypeScript files
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

async function buildExtensionFiles() {
  const projectRoot = path.resolve(__dirname, '../../../');
  const extensionFilesDir = path.join(projectRoot, 'extention-files');
  const extensionDistDir = path.join(extensionFilesDir, 'dist');

  console.log('Building extension TypeScript files...');

  // Create dist directory
  await fs.ensureDir(extensionDistDir);

  // Compile TypeScript files
  try {
    execSync(
      `tsc --project ${path.join(extensionFilesDir, 'tsconfig.json')} --outDir ${extensionDistDir}`,
      { stdio: 'inherit', cwd: extensionFilesDir }
    );
    console.log('Extension TypeScript files compiled successfully!');
  } catch (error) {
    console.error('Error compiling extension TypeScript:', error);
    process.exit(1);
  }

  // Copy manifest.json and other non-TS files
  const filesToCopy = ['manifest.json'];
  for (const file of filesToCopy) {
    const source = path.join(extensionFilesDir, file);
    const dest = path.join(extensionDistDir, file);
    if (await fs.pathExists(source)) {
      await fs.copyFile(source, dest);
      console.log(`Copied: ${file}`);
    }
  }

  console.log('Extension build complete!');
}

buildExtensionFiles().catch(console.error);

