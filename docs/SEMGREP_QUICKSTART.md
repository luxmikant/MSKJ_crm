# Quick Start: Semgrep for MSKJ_CRM

## 🚀 What is Semgrep?

Semgrep is a fast, open-source static analysis tool that finds bugs, detects security issues, and enforces code standards **automatically** on every PR.

## ⚡ Quick Setup

### 1. Install Locally (Optional but Recommended)

```bash
# macOS
brew install semgrep

# Linux/Windows (using pip)
pip install semgrep

# Or use Docker
docker pull semgrep/semgrep
```

### 2. Test Your Code Now

```bash
cd /path/to/MSKJ_crm

# Run basic scan
semgrep --config .semgrep.yml .

# Run with auto-fix
semgrep --config .semgrep.yml --autofix .

# Security scan
semgrep --config "p/security-audit" .
```

### 3. Enable GitHub Actions (After PR Merge)

Create `.github/workflows/semgrep.yml`:

```yaml
name: Semgrep

on:
  pull_request:
  push:
    branches: [main]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4
      - run: semgrep scan --config .semgrep.yml --error || true
```

## 📊 What Gets Checked

### 🔐 Security (ERROR - Blocks PR)
- ❌ Hardcoded passwords/API keys
- ❌ SQL/NoSQL injection risks
- ❌ Missing JWT verification
- ❌ Dangerous eval() usage
- ❌ CSV injection vulnerabilities

### 🛡️ API Security (WARNING)
- ⚠️ Routes without authentication
- ⚠️ Unvalidated user input
- ⚠️ Missing email validation
- ⚠️ Open redirect risks

### 📝 Code Quality (INFO)
- ℹ️ console.log in production
- ℹ️ Missing error handling
- ℹ️ Unused async/await
- ℹ️ == instead of ===
- ℹ️ var instead of const/let

### ⚛️ React/Frontend (WARNING)
- ⚠️ Missing key prop in lists
- ⚠️ dangerouslySetInnerHTML usage
- ⚠️ Missing useEffect dependencies

### 🍃 MongoDB (WARNING)
- ⚠️ Unhandled connection errors
- ⚠️ Missing indexes on frequent queries
- ⚠️ Unsafe query construction

## 🎯 Example Workflow

### Before Committing

```bash
# 1. Write code
# 2. Test manually

# 3. Run Semgrep
semgrep --config .semgrep.yml .

# 4. Fix any ERRORS (required)
# 5. Review WARNINGS (recommended)
# 6. Consider INFO items (optional)

# 7. Commit and push
git add .
git commit -m "feat: add new feature"
git push
```

### On Pull Request

1. **GitHub Actions runs automatically**
2. **Semgrep posts comment with results**:
   ```
   🔍 Semgrep Code Review
   
   - 🔴 Errors: 0
   - 🟡 Warnings: 2
   - 🔵 Info: 5
   
   ⚠️ Warnings:
   - console-log-in-production in server/src/utils.js:23
     Use logger instead of console.log
   ```
3. **Fix any errors** (PR will be blocked)
4. **Review warnings** (good practice)
5. **Merge when clean** ✅

## 📝 Common Issues & Fixes

### Issue: "Hardcoded secret detected"

❌ **Bad**:
```javascript
const apiKey = "sk_live_abc123xyz";
```

✅ **Good**:
```javascript
const apiKey = process.env.API_KEY;
```

### Issue: "Missing authentication middleware"

❌ **Bad**:
```javascript
router.post('/customers', createCustomer);
```

✅ **Good**:
```javascript
router.post('/customers', requireAuth, createCustomer);
```

### Issue: "Use === instead of =="

❌ **Bad**:
```javascript
if (value == undefined) { ... }
```

✅ **Good**:
```javascript
if (value === undefined) { ... }
```

### Issue: "Missing error handling"

❌ **Bad**:
```javascript
async function fetchData() {
  await api.get('/data');
}
```

✅ **Good**:
```javascript
async function fetchData() {
  try {
    await api.get('/data');
  } catch (error) {
    logger.error('Failed to fetch', error);
    throw error;
  }
}
```

### Issue: "Console.log in production"

❌ **Bad**:
```javascript
console.log('User logged in:', userId);
```

✅ **Good**:
```javascript
logger.info('User logged in', { userId });
```

## 🔧 Disable Rules (When Necessary)

### Inline Comment

```javascript
// nosemgrep: rule-id-here
const password = "test123"; // OK in test files
```

### Block Disable

```javascript
// semgrep-disable
console.log("Debug during investigation");
// semgrep-enable
```

### Global Exclusion (edit `.semgrep.yml`)

```yaml
rules:
  - id: console-log-in-production
    paths:
      exclude:
        - "**/__tests__/**"
        - "**/scripts/**"
```

## 📚 Full Documentation

- **Complete Setup Guide**: [`docs/SEMGREP_SETUP.md`](./SEMGREP_SETUP.md)
- **Custom Rules**: [`.semgrep.yml`](../.semgrep.yml)
- **Official Docs**: https://semgrep.dev/docs/

## 🎓 Learn More

### Interactive Playground
Test patterns: https://semgrep.dev/playground

### Browse Rules
Explore rules: https://semgrep.dev/r

### Rule Examples
```yaml
# Find hardcoded IPs
- pattern: const $VAR = "$IP"
  metavariable-regex:
    metavariable: $IP
    regex: '\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}'

# Find missing await
- pattern: |
    async function $F() {
      $PROMISE
    }
  pattern-not: |
    async function $F() {
      await $X
    }

# Find deprecated methods
- pattern: mongoose.connect(..., { useNewUrlParser: true })
  message: useNewUrlParser is deprecated
```

## 💡 Pro Tips

1. **Run before committing**: `semgrep --config .semgrep.yml .`
2. **Fix errors first**: They block merging
3. **Review warnings**: They catch common bugs
4. **Use autofix**: `--autofix` for simple fixes
5. **Check security**: `semgrep --config "p/security-audit" .`
6. **VS Code extension**: Install for real-time feedback
7. **Pre-commit hook**: Add to git hooks for automation

## 🆘 Need Help?

- **Issue with rule?** Check `.semgrep.yml` and adjust
- **False positive?** Add exception or disable rule
- **New rule idea?** Edit `.semgrep.yml` and test
- **Performance slow?** Exclude large directories

## ✅ Checklist

- [ ] Semgrep installed locally
- [ ] Tested on current codebase: `semgrep --config .semgrep.yml .`
- [ ] Fixed any critical ERRORS
- [ ] Reviewed WARNINGS
- [ ] GitHub Actions workflow created (after merge)
- [ ] Team aware of new checks

---

**Ready to go!** Semgrep will now automatically review all your PRs! 🎉
