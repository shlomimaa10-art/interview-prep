Review all uncommitted changes in the InterviewApp repo, write a proper commit message with description, commit, and push to origin.

## 1. Review the changes

Run these in parallel to understand what changed:

```bash
git -C ~/Desktop/InterviewApp status
```
```bash
git -C ~/Desktop/InterviewApp diff
```
```bash
git -C ~/Desktop/InterviewApp diff --cached
```

Read the output carefully. Understand:
- Which files changed
- What was added, removed, or modified
- The purpose of the changes (feature, fix, style, refactor, docs, chore)

## 2. Stage all changes

```bash
git -C ~/Desktop/InterviewApp add -A
```

## 3. Write the commit message

Follow this format:

```
<type>: <short imperative summary> (≤72 chars)

<body: 1–4 bullet points explaining WHAT changed and WHY>
```

**Type prefixes:**
| Type | When to use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `style` | UI / CSS / visual change, no logic change |
| `refactor` | Code restructure, no behavior change |
| `chore` | Tooling, config, commands, agents |
| `docs` | Documentation only |

**Rules:**
- Summary line: imperative mood ("add", "fix", "update" — not "added" or "adding")
- Body: explain the WHY, not just the what
- If multiple unrelated things changed, list each in the body
- Keep it honest — don't over-sell minor tweaks

**Example:**
```
feat: add owner contact section and header attribution

- Add "Built by Shlomi Maalumi" to the app header with mailto link
- Add About & Contact card to the How It Works tab
- Contact card shows name, role, and clickable email address
```

## 4. Commit

```bash
git -C ~/Desktop/InterviewApp commit -m "<summary line>" -m "<body>"
```

Use `-m` twice: first for the summary, second for the body (each bullet on its own line).

## 5. Push

```bash
git -C ~/Desktop/InterviewApp push origin main
```

If the push fails because the branch name is different, check with `git -C ~/Desktop/InterviewApp branch` and push to the correct branch.

## 6. Confirm

Tell the user:
- The commit message used
- The SHA of the new commit (`git -C ~/Desktop/InterviewApp log --oneline -1`)
- Pushed to: https://github.com/shlomimaa10-art/interview-prep
