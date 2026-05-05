You are syncing project documentation against recent commit history.

## 1. Get recent commit changes
Invoke the **`git-manager`** agent with:
> "Show me the last 10 commits on the current branch with their diffs. For each commit, give me: short SHA, subject line, and a concise summary of what files changed and what behavior changed. Keep the total report under ~400 lines — summarize big diffs rather than dumping them verbatim."

Wait for its report.

## 2. Hand off to docs manager
Invoke the **`docs-update`** agent with:
> "trigger: docs-sync — review every .md file in the project against the actual current code state AND against the following recent commit history. Use your full agent logic (audit, prune, create new docs only if a genuinely new system warrants one, delete dead docs, keep everything tight). Recent commits:\n\n<paste the git-manager report verbatim>"

Wait for its report.

## 3. Commit + push doc changes
If `docs-update` made any edits, invoke the **`git-manager`** agent to stage, commit, and push the doc changes. Pass it a one-line summary like "docs-sync: refresh .md files against last 10 commits". Skip this step only if docs-update reported "no changes made".

## 4. Confirm to user
Tell the user:
- How many commits were reviewed
- Which `.md` files were changed / created / deleted (from docs-update's report)
- Commit SHA + push status (from `git-manager`), or "no doc changes needed — nothing committed"

Keep the final message tight (≤6 lines).
