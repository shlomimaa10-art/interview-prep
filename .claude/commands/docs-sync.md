You are syncing project documentation against recent commit history.

## 1. Get recent commit changes
Invoke the **`git-manager`** agent with:
> "Show me the last 10 commits on the current branch with their diffs. For each commit, give me: short SHA, subject line, and a concise summary of what files changed and what behavior changed. Keep the total report under ~400 lines — summarize big diffs rather than dumping them verbatim."

Wait for its report.

## 2. Hand off to docs manager
Invoke the **`docs-update`** agent with:
> "trigger: docs-sync — review every .md file in the project against the actual current code state AND against the following recent commit history. Use your full agent logic (audit, prune, create new docs only if a genuinely new system warrants one, delete dead docs, keep everything tight). Recent commits:\n\n<paste the git-manager report verbatim>"

Wait for its report.

## 3. Confirm to user
Tell the user:
- How many commits were reviewed
- Which `.md` files were changed / created / deleted (from docs-update's report)
- Or "Docs are already up to date — no changes needed" if nothing was touched

Keep the final message tight (≤6 lines).
