/**
 * Dependency merger - aggregates dependencies using highest semver resolution
 */

import semver from 'semver';
import type { RepoData, MergeResult, OutdatedReport, OutdatedDep } from './types.js';

/**
 * Clean version string by removing semver range prefixes
 */
function cleanVersion(version: string): string | null {
  // Handle various version formats: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0, etc.
  const cleaned = semver.coerce(version);
  return cleaned ? cleaned.version : null;
}

/**
 * Compare two version strings and return the higher one
 */
function selectHigherVersion(v1: string, v2: string): { selected: string; isV1Higher: boolean } {
  const clean1 = cleanVersion(v1);
  const clean2 = cleanVersion(v2);
  
  // If we can't parse one, prefer the other
  if (!clean1 && !clean2) {
    return { selected: v1, isV1Higher: true };
  }
  if (!clean1) {
    return { selected: v2, isV1Higher: false };
  }
  if (!clean2) {
    return { selected: v1, isV1Higher: true };
  }
  
  // Compare and return highest
  if (semver.gt(clean1, clean2)) {
    return { selected: v1, isV1Higher: true };
  } else if (semver.gt(clean2, clean1)) {
    return { selected: v2, isV1Higher: false };
  }
  
  // Equal versions, prefer first
  return { selected: v1, isV1Higher: true };
}

/**
 * Merge dependencies from multiple repositories, selecting highest versions
 */
export function mergeDependencies(repoDataList: RepoData[]): MergeResult {
  // Track selected versions and their sources
  const depVersions: Map<string, { version: string; sources: Map<string, string> }> = new Map();
  const devDepVersions: Map<string, { version: string; sources: Map<string, string> }> = new Map();
  
  // Process each repository
  for (const repo of repoDataList) {
    // Process dependencies
    for (const [name, version] of Object.entries(repo.dependencies)) {
      processPackage(depVersions, name, version, repo.path);
    }
    
    // Process devDependencies
    for (const [name, version] of Object.entries(repo.devDependencies)) {
      processPackage(devDepVersions, name, version, repo.path);
    }
  }
  
  // Build merged dependencies
  const mergedDependencies: Record<string, string> = {};
  const mergedDevDependencies: Record<string, string> = {};
  
  for (const [name, data] of depVersions) {
    mergedDependencies[name] = data.version;
  }
  
  for (const [name, data] of devDepVersions) {
    // Skip if already in dependencies
    if (!mergedDependencies[name]) {
      mergedDevDependencies[name] = data.version;
    }
  }
  
  // Build outdated reports
  const outdatedReports = buildOutdatedReports(repoDataList, depVersions, devDepVersions);
  
  return {
    mergedDependencies,
    mergedDevDependencies,
    outdatedReports,
  };
}

/**
 * Process a single package, updating the version map if this is higher
 */
function processPackage(
  versionMap: Map<string, { version: string; sources: Map<string, string> }>,
  name: string,
  version: string,
  repoPath: string
): void {
  const existing = versionMap.get(name);
  
  if (!existing) {
    const sources = new Map<string, string>();
    sources.set(repoPath, version);
    versionMap.set(name, { version, sources });
    return;
  }
  
  // Add this source
  existing.sources.set(repoPath, version);
  
  // Check if this version is higher
  const { selected, isV1Higher } = selectHigherVersion(existing.version, version);
  if (!isV1Higher) {
    existing.version = selected;
  }
}

/**
 * Build outdated reports for each repository
 */
function buildOutdatedReports(
  repoDataList: RepoData[],
  depVersions: Map<string, { version: string; sources: Map<string, string> }>,
  devDepVersions: Map<string, { version: string; sources: Map<string, string> }>
): OutdatedReport[] {
  const reports: OutdatedReport[] = [];
  
  for (const repo of repoDataList) {
    const outdatedDeps: OutdatedDep[] = [];
    
    // Check dependencies
    for (const [name, version] of Object.entries(repo.dependencies)) {
      const selected = depVersions.get(name);
      if (selected && selected.version !== version) {
        const cleanCurrent = cleanVersion(version);
        const cleanSelected = cleanVersion(selected.version);
        
        if (cleanCurrent && cleanSelected && semver.lt(cleanCurrent, cleanSelected)) {
          outdatedDeps.push({
            name,
            currentVersion: version,
            selectedVersion: selected.version,
          });
        }
      }
    }
    
    // Check devDependencies
    for (const [name, version] of Object.entries(repo.devDependencies)) {
      const selected = devDepVersions.get(name) || depVersions.get(name);
      if (selected && selected.version !== version) {
        const cleanCurrent = cleanVersion(version);
        const cleanSelected = cleanVersion(selected.version);
        
        if (cleanCurrent && cleanSelected && semver.lt(cleanCurrent, cleanSelected)) {
          outdatedDeps.push({
            name,
            currentVersion: version,
            selectedVersion: selected.version,
          });
        }
      }
    }
    
    if (outdatedDeps.length > 0) {
      reports.push({
        repoPath: repo.path,
        outdatedDeps,
      });
    }
  }
  
  return reports;
}

/**
 * Get merge statistics
 */
export function getMergeStats(result: MergeResult): string {
  const depCount = Object.keys(result.mergedDependencies).length;
  const devDepCount = Object.keys(result.mergedDevDependencies).length;
  const outdatedRepoCount = result.outdatedReports.length;
  const totalOutdated = result.outdatedReports.reduce(
    (sum, r) => sum + r.outdatedDeps.length,
    0
  );
  
  return [
    `Merged dependencies: ${depCount}`,
    `Merged devDependencies: ${devDepCount}`,
    `Repositories with outdated deps: ${outdatedRepoCount}`,
    `Total outdated dependencies: ${totalOutdated}`,
  ].join('\n');
}
