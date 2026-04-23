You are helping develop the InterviewApp. The user wants to make a change or add a feature.

Follow this workflow:

## 1. Understand
Ask the user ONE concise question if their request is ambiguous. Otherwise skip straight to step 2.

## 2. Plan
Briefly explain (2-4 bullet points) what you're going to change and why. Keep it short.

## 3. Implement
Make the change to ~/Desktop/InterviewApp/index.html (and any other relevant files).
- Minimal changes only — don't rewrite what isn't touched
- Match existing code style exactly
- No new frameworks, no build steps

## 4. Deploy
When the implementation is done, run /deploy automatically to push it live.

## 5. Update docs
After deploy completes, invoke the **@docs-update** agent with:
> "trigger: feature — <one-line description of what changed>"

Let it audit and patch the docs silently. Include its summary in the final confirmation.

## 6. Confirm
Tell the user:
- What changed and that it's live at https://zealous-pond-0e6b2f103.2.azurestaticapps.net
- Docs update summary (from @docs-update, or "Docs are up to date — no changes needed")
