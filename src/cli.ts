#!/usr/bin/env node

/**
 * node-cache-builder CLI
 * Aggregate dependencies from multiple repositories and build pnpm cache archives
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';

import {
  loadConfig,
  addRepository,
  removeRepository,
  listRepositories,
  saveConfig,
} from './config.js';
import { scanRepositories, getScanSummary } from './scanner.js';
import { mergeDependencies, getMergeStats } from './merger.js';
import { generateReport } from './reporter.js';
import { buildArchive } from './archiver.js';
import type { ReportMode } from './types.js';

program
  .name('node-cache-builder')
  .description('Aggregate dependencies from multiple repositories and build pnpm cache archives for CI/CD')
  .version('1.0.0');

/**
 * Add repository command
 */
program
  .command('add <repo-path>')
  .description('Add a repository to the configuration')
  .action(async (repoPath: string) => {
    try {
      const config = await addRepository(repoPath);
      const absolutePath = resolve(repoPath);
      console.log(chalk.green(`✓ Added repository: ${absolutePath}`));
      console.log(chalk.dim(`Total repositories: ${config.repositories.length}`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

/**
 * Remove repository command
 */
program
  .command('remove <repo-path>')
  .description('Remove a repository from the configuration')
  .action(async (repoPath: string) => {
    try {
      const config = await removeRepository(repoPath);
      console.log(chalk.green(`✓ Removed repository: ${repoPath}`));
      console.log(chalk.dim(`Remaining repositories: ${config.repositories.length}`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

/**
 * List repositories command
 */
program
  .command('list')
  .description('List all configured repositories')
  .action(async () => {
    try {
      const repositories = await listRepositories();
      
      if (repositories.length === 0) {
        console.log(chalk.yellow('No repositories configured.'));
        console.log(chalk.dim('Use "node-cache-builder add <path>" to add repositories.'));
        return;
      }
      
      console.log(chalk.bold('Configured repositories:'));
      for (const repo of repositories) {
        console.log(`  ${chalk.cyan('•')} ${repo}`);
      }
      console.log('');
      console.log(chalk.dim(`Total: ${repositories.length} repositories`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

/**
 * Build command
 */
program
  .command('build')
  .description('Build the pnpm cache archive from configured repositories')
  .requiredOption('-o, --output <path>', 'Output path for the archive (e.g., cache.tar.gz)')
  .option('--report-mode <mode>', 'Report mode: console or file', 'console')
  .action(async (options: { output: string; reportMode: string }) => {
    const spinner = ora();
    
    try {
      const reportMode = options.reportMode as ReportMode;
      if (reportMode !== 'console' && reportMode !== 'file') {
        throw new Error('Invalid report mode. Use "console" or "file".');
      }
      
      // Load config
      spinner.start('Loading configuration...');
      const config = await loadConfig();
      
      if (config.repositories.length === 0) {
        spinner.fail('No repositories configured');
        console.log(chalk.dim('Use "node-cache-builder add <path>" to add repositories first.'));
        process.exit(1);
      }
      
      spinner.succeed(`Loaded ${config.repositories.length} repositories`);
      
      // Scan repositories
      spinner.start('Scanning repositories...');
      const repoDataList = scanRepositories(config.repositories);
      spinner.succeed('Repositories scanned successfully');
      console.log(chalk.dim(getScanSummary(repoDataList)));
      
      // Merge dependencies
      spinner.start('Merging dependencies...');
      const mergeResult = mergeDependencies(repoDataList);
      spinner.succeed('Dependencies merged');
      console.log(chalk.dim(getMergeStats(mergeResult)));
      
      // Generate report
      generateReport(mergeResult.outdatedReports, reportMode);
      
      // Build archive
      spinner.start('Building archive...');
      await buildArchive(mergeResult, options.output, (msg) => {
        spinner.text = msg;
      });
      spinner.succeed(`Archive created: ${resolve(options.output)}`);
      
      console.log('');
      console.log(chalk.green.bold('✓ Build completed successfully!'));
      
    } catch (error) {
      spinner.fail('Build failed');
      console.error(chalk.red(`\n${(error as Error).message}`));
      process.exit(1);
    }
  });

/**
 * Config command - view/edit configuration
 */
program
  .command('config')
  .description('View or modify configuration')
  .option('--set-output <path>', 'Set default output path')
  .option('--set-report-mode <mode>', 'Set default report mode (console|file)')
  .option('--show', 'Show current configuration')
  .action(async (options: { setOutput?: string; setReportMode?: string; show?: boolean }) => {
    try {
      const config = await loadConfig();
      
      let modified = false;
      
      if (options.setOutput) {
        config.defaultOutput = options.setOutput;
        modified = true;
        console.log(chalk.green(`✓ Set default output: ${options.setOutput}`));
      }
      
      if (options.setReportMode) {
        if (options.setReportMode !== 'console' && options.setReportMode !== 'file') {
          throw new Error('Invalid report mode. Use "console" or "file".');
        }
        config.reportMode = options.setReportMode as ReportMode;
        modified = true;
        console.log(chalk.green(`✓ Set report mode: ${options.setReportMode}`));
      }
      
      if (modified) {
        saveConfig(config);
      }
      
      if (options.show || !modified) {
        console.log(chalk.bold('\nCurrent configuration:'));
        console.log(JSON.stringify(config, null, 2));
      }
      
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
