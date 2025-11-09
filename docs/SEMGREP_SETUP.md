# Semgrep Setup Guide

## Overview
Semgrep is a fast, open-source static analysis tool for finding bugs, detecting vulnerabilities, and enforcing code standards.

## What's Configured

### Custom Rules (`.semgrep.yml`)
✅ **Security Rules**:
- Hardcoded secrets detection
- SQL/NoSQL injection risks
- JWT verification
- CSV injection prevention
- File upload security

✅ **API Security**:
- Missing authentication middleware
- Unvalidated redirects
- Input validation

✅ **Code Quality**:
- Console.log in production
- Missing error handling
- Unused async functions
- Type coercion (== vs ===)
- React best practices (keys, useEffect deps)

✅ **MongoDB/Mongoose**:
- Connection error handling
- Index recommendations
- Query sanitization

✅ **Express Best Practices**:
- Helmet security headers
- Rate limiting recommendations

## GitHub Actions Workflow

### Setup Instructions

After merging this PR, create `.github/workflows/semgrep.yml`:

```yaml
name: Semgrep Code Review

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop, feature/*]
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write
  security-events: write

jobs:
  semgrep:
    name: Semgrep Security & Code Quality Scan
    runs-on: ubuntu-latest
    
    container:
      image: semgrep/semgrep
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Run Semgrep with custom rules
        run: |
          semgrep scan \
            --config .semgrep.yml \
            --json \
            --output semgrep-custom.json \
            --verbose \
            || true
      
      - name: Run Semgrep security audit
        run: |
          semgrep scan \
            --config "p/security-audit" \
            --config "p/owasp-top-ten" \
            --json \
            --output semgrep-security.json \
            --verbose \
            || true
      
      - name: Parse and display results
        run: |
          echo "## 🔍 Semgrep Code Review Results" >> $GITHUB_STEP_SUMMARY
          
          ERRORS=$(jq '[.results[] | select(.extra.severity == "ERROR")] | length' semgrep-custom.json)
          WARNINGS=$(jq '[.results[] | select(.extra.severity == "WARNING")] | length' semgrep-custom.json)
          INFO=$(jq '[.results[] | select(.extra.severity == "INFO")] | length' semgrep-custom.json)
          
          echo "- 🔴 Errors: $ERRORS" >> $GITHUB_STEP_SUMMARY
          echo "- 🟡 Warnings: $WARNINGS" >> $GITHUB_STEP_SUMMARY
          echo "- 🔵 Info: $INFO" >> $GITHUB_STEP_SUMMARY
      
      - name: Upload Semgrep results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: semgrep-results
          path: |
            semgrep-custom.json
            semgrep-security.json
          retention-days: 30
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            let results = JSON.parse(fs.readFileSync('semgrep-custom.json', 'utf8'));
            
            const errors = results.results.filter(r => r.extra.severity === 'ERROR').length;
            const warnings = results.results.filter(r => r.extra.severity === 'WARNING').length;
            
            let comment = `## 🔍 Semgrep Code Review\n\n`;
            comment += `- 🔴 Errors: ${errors}\n`;
            comment += `- 🟡 Warnings: ${warnings}\n\n`;
            
            if (errors > 0) {
              comment += `### Critical Issues\n`;
              results.results
                .filter(r => r.extra.severity === 'ERROR')
                .slice(0, 5)
                .forEach(r => {
                  comment += `- **${r.check_id}** in \`${r.path}:${r.start.line}\`\n`;
                  comment += `  ${r.extra.message}\n\n`;
                });
            }
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
      
      - name: Fail on critical issues
        run: |
          ERRORS=$(jq '[.results[] | select(.extra.severity == "ERROR")] | length' semgrep-custom.json)
          if [ "$ERRORS" -gt 0 ]; then
            echo "❌ Found $ERRORS critical error(s)"
            exit 1
          fi
```

## Local Usage

### Install Semgrep

```bash
# Using pip
pip install semgrep

# Using Homebrew (macOS)
brew install semgrep

# Using Docker
docker pull semgrep/semgrep
```

### Run Semgrep Locally

```bash
# Scan with custom rules
semgrep --config .semgrep.yml .

# Scan specific directory
semgrep --config .semgrep.yml ma-sharvari-ki-jai/server/

# Auto-fix issues (where possible)
semgrep --config .semgrep.yml --autofix .

# Security-focused scan
semgrep --config "p/security-audit" \
        --config "p/owasp-top-ten" \
        --config "p/javascript" .

# Generate JSON report
semgrep --config .semgrep.yml --json --output report.json .

# Show only errors
semgrep --config .semgrep.yml --severity ERROR .
```

### Integrate with VS Code

1. Install the **Semgrep** extension from VS Code marketplace
2. Open settings and configure:
   ```json
   {
     "semgrep.scan.configuration": [".semgrep.yml"],
     "semgrep.scan.onSave": true
   }
   ```

## Semgrep Cloud (Optional)

For team collaboration and policy management:

1. Sign up at https://semgrep.dev/login
2. Get your API token
3. Add to GitHub Secrets as `SEMGREP_APP_TOKEN`
4. Update workflow to include:

```yaml
- name: Run Semgrep with Semgrep Cloud
  env:
    SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
  run: semgrep ci
```

## Rule Customization

### Disable Specific Rules

Add to files that need exceptions:

```javascript
// nosemgrep: rule-id
const password = "temp"; // OK for test fixtures

// semgrep-disable
console.log("Debug info"); // Allowed in specific contexts
// semgrep-enable
```

### Modify Rules

Edit `.semgrep.yml` to:
- Change severity levels
- Add path exclusions
- Customize patterns
- Add new custom rules

Example:
```yaml
rules:
  - id: my-custom-rule
    patterns:
      - pattern: dangerousFunction($X)
    message: Avoid using dangerousFunction
    languages: [javascript]
    severity: ERROR
    paths:
      exclude:
        - "**/__tests__/**"
```

## CI/CD Integration

The workflow will:
1. ✅ Run on every PR and push to main/develop
2. ✅ Post results as PR comments
3. ✅ Fail the build if critical errors found
4. ✅ Upload detailed reports as artifacts
5. ✅ Show summary in GitHub Actions

## Best Practices

1. **Run locally before pushing**: `semgrep --config .semgrep.yml .`
2. **Review warnings**: Even if not blocking, they indicate potential issues
3. **Update rules regularly**: Keep `.semgrep.yml` current with new patterns
4. **Use severity levels wisely**:
   - ERROR: Blocks PR merge
   - WARNING: Review recommended
   - INFO: Educational/optional

## Troubleshooting

### False Positives

Add exceptions:
```yaml
- id: my-rule
  patterns:
    - pattern: $BAD_THING
    - pattern-not: $SAFE_THING  # Exclude safe cases
```

### Performance Issues

Exclude large directories:
```yaml
paths:
  exclude:
    - "**/node_modules/**"
    - "**/dist/**"
    - "**/build/**"
```

### Rule Not Triggering

1. Check language matches file extension
2. Verify pattern syntax: https://semgrep.dev/playground
3. Test with simpler pattern first
4. Check path includes/excludes

## Resources

- 📚 [Semgrep Documentation](https://semgrep.dev/docs/)
- 🎮 [Semgrep Playground](https://semgrep.dev/playground)
- 📝 [Rule Writing Guide](https://semgrep.dev/docs/writing-rules/overview/)
- 🔐 [Security Rules](https://semgrep.dev/r)
- 💬 [Community Slack](https://go.semgrep.dev/slack)

## Current Scan Status

Run Semgrep now to see current issues:

```bash
cd /path/to/MSKJ_crm
semgrep --config .semgrep.yml --verbose .
```

Expected categories:
- Security vulnerabilities
- Code quality issues
- Best practice violations
- Potential bugs
