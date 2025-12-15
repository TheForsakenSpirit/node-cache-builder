/**
 * Archive builder - creates pnpm cache archive with node_modules, lockfile, and package.json
 */

import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import * as tar from 'tar';
import type { MergeResult } from './types.js';

/**
 * Build the pnpm cache archive
 */
export async function buildArchive(
  mergeResult: MergeResult,
  outputPath: string,
  onProgress?: (message: string) => void
): Promise<void> {
  const log = onProgress || console.log;
  
  // Create temp directory
  const tempDir = mkdtempSync(join(tmpdir(), 'node-cache-builder-'));
  
  try {
    // Generate merged package.json
    log('Generating merged package.json...');
    const packageJson = {
      name: 'node-cache-builder-aggregate',
      version: '1.0.0',
      description: 'Aggregated dependencies from multiple repositories',
      private: true,
      dependencies: mergeResult.mergedDependencies,
      devDependencies: mergeResult.mergedDevDependencies,
    };
    
    const packageJsonPath = join(tempDir, 'package.json');
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
    
    // Run pnpm install
    log('Running pnpm install...');
    execSync('pnpm install', {
      cwd: tempDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        // Ensure we get a clean install
        npm_config_prefer_offline: 'false',
      },
    });
    
    // Verify installation created expected files
    const nodeModulesPath = join(tempDir, 'node_modules');
    const lockfilePath = join(tempDir, 'pnpm-lock.yaml');
    
    if (!existsSync(nodeModulesPath)) {
      throw new Error('pnpm install did not create node_modules directory');
    }
    
    if (!existsSync(lockfilePath)) {
      throw new Error('pnpm install did not create pnpm-lock.yaml');
    }
    
    // Create output directory if needed
    const outputDir = dirname(resolve(outputPath));
    if (!existsSync(outputDir)) {
      execSync(`mkdir -p "${outputDir}"`);
    }
    
    // Create tar.gz archive
    log('Creating archive...');
    const absoluteOutputPath = resolve(outputPath);
    
    await tar.create(
      {
        gzip: true,
        file: absoluteOutputPath,
        cwd: tempDir,
        portable: true,
      },
      ['node_modules', 'pnpm-lock.yaml', 'package.json']
    );
    
    log(`Archive created: ${absoluteOutputPath}`);
    
  } finally {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Extract archive to a target directory
 */
export async function extractArchive(
  archivePath: string,
  targetDir: string
): Promise<void> {
  const absoluteArchivePath = resolve(archivePath);
  const absoluteTargetDir = resolve(targetDir);
  
  if (!existsSync(absoluteArchivePath)) {
    throw new Error(`Archive not found: ${absoluteArchivePath}`);
  }
  
  await tar.extract({
    file: absoluteArchivePath,
    cwd: absoluteTargetDir,
  });
}
