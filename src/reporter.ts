/**
 * Report generator - outputs outdated dependency reports
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import type { OutdatedReport, ReportMode } from './types.js';

/**
 * Generate outdated dependency report
 */
export function generateReport(
  outdatedReports: OutdatedReport[],
  mode: ReportMode,
  outputDir: string = process.cwd()
): void {
  // Always write JSON report
  writeJsonReport(outdatedReports, outputDir);
  
  if (mode === 'console') {
    printConsoleReport(outdatedReports);
  } else {
    writeMarkdownReport(outdatedReports, outputDir);
    console.log(chalk.green(`✓ Reports written to ${outputDir}`));
    console.log(`  - outdated-report.json`);
    console.log(`  - outdated-report.md`);
  }
}

/**
 * Write JSON report file
 */
function writeJsonReport(reports: OutdatedReport[], outputDir: string): void {
  const reportPath = resolve(outputDir, 'outdated-report.json');
  const content = JSON.stringify(
    {
      generated: new Date().toISOString(),
      summary: {
        totalRepositories: reports.length,
        totalOutdatedDeps: reports.reduce((sum, r) => sum + r.outdatedDeps.length, 0),
      },
      reports,
    },
    null,
    2
  );
  writeFileSync(reportPath, content, 'utf-8');
}

/**
 * Write Markdown report file
 */
function writeMarkdownReport(reports: OutdatedReport[], outputDir: string): void {
  const reportPath = resolve(outputDir, 'outdated-report.md');
  const lines: string[] = [];
  
  lines.push('# Outdated Dependencies Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  if (reports.length === 0) {
    lines.push('✅ All repositories are using the latest dependency versions.');
  } else {
    lines.push(`## Summary`);
    lines.push('');
    lines.push(`- **Repositories with outdated dependencies:** ${reports.length}`);
    lines.push(`- **Total outdated dependencies:** ${reports.reduce((sum, r) => sum + r.outdatedDeps.length, 0)}`);
    lines.push('');
    
    for (const report of reports) {
      lines.push(`## ${report.repoPath}`);
      lines.push('');
      lines.push('| Package | Current | Selected |');
      lines.push('|---------|---------|----------|');
      
      for (const dep of report.outdatedDeps) {
        lines.push(`| ${dep.name} | ${dep.currentVersion} | ${dep.selectedVersion} |`);
      }
      
      lines.push('');
    }
  }
  
  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
}

/**
 * Print colored console report
 */
function printConsoleReport(reports: OutdatedReport[]): void {
  console.log('');
  console.log(chalk.bold.underline('Outdated Dependencies Report'));
  console.log('');
  
  if (reports.length === 0) {
    console.log(chalk.green('✅ All repositories are using the latest dependency versions.'));
    return;
  }
  
  const totalOutdated = reports.reduce((sum, r) => sum + r.outdatedDeps.length, 0);
  console.log(chalk.yellow(`⚠ Found ${totalOutdated} outdated dependencies across ${reports.length} repositories`));
  console.log('');
  
  for (const report of reports) {
    console.log(chalk.bold(`📁 ${report.repoPath}`));
    
    for (const dep of report.outdatedDeps) {
      console.log(
        `   ${chalk.cyan(dep.name)}: ${chalk.red(dep.currentVersion)} → ${chalk.green(dep.selectedVersion)}`
      );
    }
    
    console.log('');
  }
  
  console.log(chalk.dim('JSON report saved to: outdated-report.json'));
}
