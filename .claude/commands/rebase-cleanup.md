Rebase the current branch on itself, squashing down to a single commit.

Before starting, create a new branch, titled `tmp-${branch name}`, to serve as a backup of this branch, in case the rebase goes wrong
for whatever reason.

Reword the one commit's message to a description of the consolidated changes.

If the rebase was successful and totally clean, output a message indicating safe to clean up the tmp branch