/**
 * Repository scanner - validates paths and extracts package.json data
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RepoData, PackageJson } from './types.js';

/**
 * Scan repositories and extract their dependency information
 * Fails fast if any repository path is invalid
 */
export function scanRepositories(repoPaths: string[]): RepoData[] {
  // First, validate all paths exist
  const missingPaths: string[] = [];
  
  for (const repoPath of repoPaths) {
    const absolutePath = resolve(repoPath);
    if (!existsSync(absolutePath)) {
      missingPaths.push(absolutePath);
      continue;
    }
    
    const packageJsonPath = resolve(absolutePath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      missingPaths.push(`${absolutePath} (missing package.json)`);
    }
  }
  
  // Fail fast with all missing paths
  if (missingPaths.length > 0) {
    throw new Error(
      `Configuration error - the following repositories are invalid:\n` +
      missingPaths.map(p => `  - ${p}`).join('\n')
    );
  }
  
  // All paths validated, now scan each repository
  const repoDataList: RepoData[] = [];
  
  for (const repoPath of repoPaths) {
    const absolutePath = resolve(repoPath);
    const packageJsonPath = resolve(absolutePath, 'package.json');
    
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson: PackageJson = JSON.parse(packageJsonContent);
    
    repoDataList.push({
      path: absolutePath,
      packageJson,
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
    });
  }
  
  return repoDataList;
}

/**
 * Get a summary of scanned repositories
 */
export function getScanSummary(repoDataList: RepoData[]): string {
  const lines: string[] = [];
  
  for (const repo of repoDataList) {
    const depCount = Object.keys(repo.dependencies).length;
    const devDepCount = Object.keys(repo.devDependencies).length;
    const name = repo.packageJson.name || 'unnamed';
    
    lines.push(`  ${name} (${repo.path})`);
    lines.push(`    dependencies: ${depCount}, devDependencies: ${devDepCount}`);
  }
  
  return lines.join('\n');
}
