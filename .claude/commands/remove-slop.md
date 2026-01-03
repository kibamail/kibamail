# Remove AI code slop

Make a detailed list of all files in the repository, and check them one after the other, and remove all AI generated slop introduced in this repository. Start with the most recently changed files and work downwards from there.

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
- For react handlers, remove any handlers that are named with convension handleX or handleY and rename them to onX or onY. For example: handleRollbackUpdate should be onRollbackUpdate
- Whenever possible, default to using function nameOfFn() {} rather than arrow functions, especially when the function type used does not change the impact of the implementation
- In the codebase, we use @ import aliases. so code that uses ../.. or ../../../ for imports makes the code dirty and should be cleaned up
- No naming variables e or confusing terms like that. if something is an event, name it event and not e
- No sharing state between tests. Tests should be able to run in complete isolation or collectively in parallel without any possible data conflicts amongst them.

Report at the end with only a 1-3 sentence summary of what you changed
