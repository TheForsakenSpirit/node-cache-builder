# node-cache-builder

A CLI tool that aggregates dependencies from multiple Node.js repositories and builds a unified pnpm cache archive for CI/CD pipelines.

## Features

- **Multi-repo scanning** — Collect `package.json` dependencies from multiple repositories
- **Smart version resolution** — Automatically selects the highest semver version when conflicts occur
- **Outdated dependency reports** — Identifies which repositories have lower versions than selected
- **CI/CD ready** — Produces a `.tar.gz` archive containing `node_modules`, `pnpm-lock.yaml`, and merged `package.json`
- **Auto-saving config** — Repository list persists to `.node-cache-builderrc.json`

## Installation

### From Pre-built Executable

Download the latest executable for your platform from the [Releases](../../releases) page:

| Platform | File |
|----------|------|
| Linux (x64) | `node-cache-builder-linux` |
| macOS (x64) | `node-cache-builder-macos-x64` |
| macOS (ARM) | `node-cache-builder-macos-arm64` |
| Windows | `node-cache-builder.exe` |

```bash
# Linux/macOS - make executable and move to PATH
chmod +x node-cache-builder-linux
sudo mv node-cache-builder-linux /usr/local/bin/node-cache-builder

# Or run directly
./node-cache-builder-linux --help
```

### From Source

```bash
# Clone the repository
git clone <repo-url>
cd node-cache-builder

# Install dependencies
pnpm install

# Build the project
pnpm build

# Link globally (optional)
pnpm link --global
```

### Build Executable Locally

Requires [Bun](https://bun.sh) to be installed.

```bash
# Build for current platform
pnpm build:exe

# Build for specific platform
pnpm build:exe:linux      # Linux x64
pnpm build:exe:macos      # macOS x64
pnpm build:exe:macos-arm  # macOS ARM64
pnpm build:exe:windows    # Windows x64

# Build for all platforms
pnpm build:exe:all
```

Executables are output to the `./bin/` directory.

## Quick Start

```bash
# 1. Add repositories to scan
node-cache-builder add /path/to/project-a
node-cache-builder add /path/to/project-b
node-cache-builder add /path/to/project-c

# 2. View configured repositories
node-cache-builder list

# 3. Build the cache archive
node-cache-builder build -o ./output/cache.tar.gz
```

## Commands

### `add <repo-path>`

Add a repository to the configuration. The path must contain a valid `package.json`.

```bash
node-cache-builder add ../my-project
# ✓ Added repository: /home/user/my-project
# Total repositories: 1
```

### `remove <repo-path>`

Remove a repository from the configuration.

```bash
node-cache-builder remove ../my-project
# ✓ Removed repository: ../my-project
# Remaining repositories: 0
```

### `list`

Display all configured repositories.

```bash
node-cache-builder list
# Configured repositories:
#   • /home/user/project-a
#   • /home/user/project-b
# Total: 2 repositories
```

### `build`

Build the pnpm cache archive from all configured repositories.

```bash
node-cache-builder build -o cache.tar.gz
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output path for the archive (required) | — |
| `--report-mode <mode>` | Report format: `console` or `file` | `console` |

**Report Modes:**

- **`console`** (default) — Writes `outdated-report.json` and prints a colored summary to the terminal
- **`file`** — Writes both `outdated-report.json` and `outdated-report.md` (Markdown table format)

```bash
# Console mode (default)
node-cache-builder build -o cache.tar.gz

# File mode - generates Markdown report
node-cache-builder build -o cache.tar.gz --report-mode file
```

### `config`

View or modify configuration settings.

```bash
# Show current configuration
node-cache-builder config --show

# Set default output path
node-cache-builder config --set-output ./dist/cache.tar.gz

# Set default report mode
node-cache-builder config --set-report-mode file
```

## Configuration File

The tool stores configuration in `.node-cache-builderrc.json` in the current directory:

```json
{
  "repositories": [
    "/home/user/project-a",
    "/home/user/project-b"
  ],
  "defaultOutput": "./cache.tar.gz",
  "reportMode": "console"
}
```

## Archive Contents

The generated `.tar.gz` archive contains:

| File | Description |
|------|-------------|
| `node_modules/` | Installed dependencies from pnpm |
| `pnpm-lock.yaml` | Lockfile for reproducible installs |
| `package.json` | Merged dependencies manifest |

## Using in CI/CD

### GitHub Actions

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Download pre-built cache
      - name: Download dependency cache
        run: |
          curl -L -o cache.tar.gz https://your-storage/cache.tar.gz
          tar -xzf cache.tar.gz
      
      # Skip install - dependencies already present
      - name: Run build
        run: pnpm build
```

### GitLab CI

```yaml
build:
  script:
    # Extract pre-built cache
    - curl -L -o cache.tar.gz https://your-storage/cache.tar.gz
    - tar -xzf cache.tar.gz
    # Dependencies ready, run build
    - pnpm build
```

## Version Resolution Strategy

When the same package appears in multiple repositories with different versions:

1. **Highest version wins** — The tool uses `semver.maxSatisfying()` to select the highest compatible version
2. **Outdated tracking** — Repositories using lower versions are logged in the outdated report
3. **Range handling** — Version ranges (`^`, `~`, `>=`) are coerced to concrete versions for comparison

**Example:**

```
project-a: lodash@^4.17.0
project-b: lodash@^4.17.21
project-c: lodash@^4.16.0

Selected: lodash@^4.17.21
Outdated: project-a (^4.17.0), project-c (^4.16.0)
```

## Error Handling

The tool **fails fast** on configuration errors:

- Missing repository paths
- Repositories without `package.json`
- Invalid report mode

```bash
node-cache-builder build -o cache.tar.gz
# ✗ Configuration error - the following repositories are invalid:
#   - /home/user/missing-project
#   - /home/user/no-package-json (missing package.json)
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Run CLI directly
node dist/cli.js --help
```

## License

ISC
