/**
 * Configuration management using cosmiconfig
 */

import { cosmiconfig } from 'cosmiconfig';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from './types.js';

const MODULE_NAME = 'node-cache-builder';
const CONFIG_FILE = `.${MODULE_NAME}rc.json`;

const explorer = cosmiconfig(MODULE_NAME, {
  searchPlaces: [
    CONFIG_FILE,
    `${MODULE_NAME}.config.json`,
    `${MODULE_NAME}.config.js`,
  ],
});

/**
 * Default configuration
 */
export const defaultConfig: Config = {
  repositories: [],
  reportMode: 'console',
};

/**
 * Load configuration from file or return defaults
 */
export async function loadConfig(searchFrom?: string): Promise<Config> {
  try {
    const result = await explorer.search(searchFrom);
    if (result && result.config) {
      return {
        ...defaultConfig,
        ...result.config,
      };
    }
  } catch (error) {
    // Config file not found or invalid, use defaults
  }
  return { ...defaultConfig };
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Config, directory: string = process.cwd()): void {
  const configPath = resolve(directory, CONFIG_FILE);
  const content = JSON.stringify(config, null, 2);
  writeFileSync(configPath, content, 'utf-8');
}

/**
 * Add a repository to the configuration
 */
export async function addRepository(repoPath: string): Promise<Config> {
  const absolutePath = resolve(repoPath);
  
  // Validate path exists
  if (!existsSync(absolutePath)) {
    throw new Error(`Repository path does not exist: ${absolutePath}`);
  }
  
  // Check for package.json
  const packageJsonPath = resolve(absolutePath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(`No package.json found in: ${absolutePath}`);
  }
  
  const config = await loadConfig();
  
  // Avoid duplicates
  if (!config.repositories.includes(absolutePath)) {
    config.repositories.push(absolutePath);
    saveConfig(config);
  }
  
  return config;
}

/**
 * Remove a repository from the configuration
 */
export async function removeRepository(repoPath: string): Promise<Config> {
  const absolutePath = resolve(repoPath);
  const config = await loadConfig();
  
  const index = config.repositories.indexOf(absolutePath);
  if (index === -1) {
    // Try matching by the original path as well
    const originalIndex = config.repositories.indexOf(repoPath);
    if (originalIndex === -1) {
      throw new Error(`Repository not found in config: ${repoPath}`);
    }
    config.repositories.splice(originalIndex, 1);
  } else {
    config.repositories.splice(index, 1);
  }
  
  saveConfig(config);
  return config;
}

/**
 * Get list of configured repositories
 */
export async function listRepositories(): Promise<string[]> {
  const config = await loadConfig();
  return config.repositories;
}
