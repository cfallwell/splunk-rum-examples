# Repo Agent Rules

## Required Git Flow

- Never push code changes directly to `main`.
- For every requested change:
  - Create a new branch.
  - Make and commit the changes.
  - Open a pull request (merge request) for review.
- The user performs the merge.
- After the user confirms merge:
  - `git checkout main`
  - `git pull --ff-only`

## Release Notes Formatting

- For GitHub Releases, use standard Markdown with real newlines.
- Do not publish release notes containing literal escaped newline sequences like `\\n`.
- Prefer simple version headers and bullet lists matching existing clean release style.
