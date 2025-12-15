/**
 * Shared TypeScript interfaces for node-cache-builder
 */

/**
 * Configuration file schema
 */
export interface Config {
  repositories: string[];
  defaultOutput?: string;
  reportMode?: ReportMode;
}

/**
 * Report output mode
 */
export type ReportMode = 'console' | 'file';

/**
 * Package.json dependencies structure
 */
export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Scanned repository data
 */
export interface RepoData {
  path: string;
  packageJson: PackageJson;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

/**
 * Outdated dependency entry
 */
export interface OutdatedDep {
  name: string;
  currentVersion: string;
  selectedVersion: string;
}

/**
 * Outdated report for a single repository
 */
export interface OutdatedReport {
  repoPath: string;
  outdatedDeps: OutdatedDep[];
}

/**
 * Result of dependency merging
 */
export interface MergeResult {
  mergedDependencies: Record<string, string>;
  mergedDevDependencies: Record<string, string>;
  outdatedReports: OutdatedReport[];
}

/**
 * Build options passed to the archiver
 */
export interface BuildOptions {
  output: string;
  reportMode: ReportMode;
}
