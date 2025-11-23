// Build script for extension TypeScript files
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

async function buildExtensionFiles() {
  const projectRoot = path.resolve(__dirname, '../../../');
  const extensionFilesDir = path.join(projectRoot, 'extention-files');
  const extensionDistDir = path.join(extensionFilesDir, 'dist');

  console.log('Building extension TypeScript files...');
  console.log(`Source: ${extensionFilesDir}`);
  console.log(`Output: ${extensionDistDir}`);

  // Clean dist directory to ensure fresh compilation
  if (await fs.pathExists(extensionDistDir)) {
    await fs.remove(extensionDistDir);
    console.log('Cleaned dist directory');
  }

  // Create dist directory
  await fs.ensureDir(extensionDistDir);

  // Compile TypeScript files
  try {
    const tsconfigPath = path.join(extensionFilesDir, 'tsconfig.json');
    console.log(`Compiling with tsconfig: ${tsconfigPath}`);
    
    // Use shell on Windows for proper path handling
    const isWindows = process.platform === 'win32';
    execSync(
      `tsc --project "${tsconfigPath}" --outDir "${extensionDistDir}"`,
      { 
        stdio: 'inherit', 
        cwd: extensionFilesDir,
        ...(isWindows ? { shell: 'cmd.exe' } : {})
      }
    );
    console.log('Extension TypeScript files compiled successfully!');
    
    // Verify compiled files exist
    const compiledFiles = await fs.readdir(extensionDistDir);
    console.log('Compiled files:', compiledFiles.filter(f => f.endsWith('.js')));
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

