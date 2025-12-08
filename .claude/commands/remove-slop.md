# Remove AI code slop

Check the changed uncommitted files in this repository, and remove all AI generated slop introduced in this branch.

This includes:

- Extra comments that a human wouldn't add or is inconsistent with the rest of the file
- Extra defensive checks or try/catch blocks that are abnormal for that area of the codebase (especially if called by trusted / validated codepaths)
- Casts to any to get around type issues
- Any other style that is inconsistent with the file
- Remove comments that just restate what the code obviously does (e.g., // increment counter before counter++)
- Remove comments that explain standard library functions
- Remove "TODO: implement error handling" or similar placeholder comments if the handling exists
- Keep comments that explain why something non-obvious is done
- Simplify overly defensive null checks where the value is guaranteed
- Remove redundant type annotations that are already inferred

Report at the end with only a 1-3 sentence summary of what you changed
