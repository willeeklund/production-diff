# Production diff scripts

Understand what code changes have been merged but not yet deployed to production. Track deployments across multiple repositories or individual parts within a monorepo.

## Quick Start

### Prerequisites
- Node.js 25.x and Yarn

### Setup

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Configure your deployable parts:**
   Create a `config.ts` file in the root directory:
   ```bash
   cp config.ts.example config.ts  # or create it manually
   ```
   
   Edit `config.ts` and add your repositories and version tracking URLs:
   ```typescript
   export const configParts: ConfigParts = {
     'myapp': {
       folder: 'myapp',
       stableCodeReference: 'origin/main',
       versionUrl: 'https://myapp.example.com/version.json',
     }
   };
   ```

   **Note:** `config.ts` is gitignored — safe to customize locally without affecting the repo.

## Usage

### View all deployable parts
Compare production with your stable and development branches across all configured parts:

```bash
yarn git:compare:prod
```

**Output:** Shows git logs between:
- Production version → Stable branch (`stableCodeReference`)
- Stable branch → Development branch (`latestCodeReference`, optional)

**Layout:** All repos should be in the same parent folder:
```
parent-folder/
├── production-diff/
└── myapp/
```

**Optional:** Send to Slack with:
```bash
SLACK_DEPLOYMENT_WEBHOOK_URL="https://hooks.slack.com/..." yarn git:compare:prod --slack
```

### Generate release notes for one part
Get the diff for a specific deployable part:

```bash
yarn release:notes myapp
```

**Optional:** Send to Slack (useful during production releases):
```bash
SLACK_DEPLOYMENT_WEBHOOK_URL="https://hooks.slack.com/..." yarn release:notes myapp --slack
```

You can paste the output into GitHub release notes.

## Configuration Guide

### Version tracking options

**Option 1: Public version.json file (recommended)**
If your app serves a `version.json` file publicly:
```typescript
versionUrl: 'https://myapp.example.com/version.json'
```

The file should contain:
```json
{
  "commit": "abc123def456"
}
```

To expose this from Docker, pass the commit as a build argument:
```yaml
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    build-args: CODE_VERSION_COMMIT=${{ github.sha }}
```

Then reference in your Dockerfile (see `Dockerfile.example`).

**Option 2: Git tags (for non-web deployments)**
For native apps or services without a public URL, use git tags:
```typescript
tagFormat: 'myapp.v*'  // picks latest semver tag like "myapp.v1.2.3"
```

## Automation

This tool works well with CI/CD pipelines:
- Run `yarn git:compare:prod --slack` daily to track what's undeployed
- Run `yarn release:notes <part> --slack` during deployments for transparency
