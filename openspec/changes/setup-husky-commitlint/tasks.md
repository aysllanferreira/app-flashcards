## 1. Root package and dependency install (issue #5, AC 1 and 7)

- [x] 1.1 Create root `.gitignore` containing `node_modules` and verify `cat .gitignore` shows that entry
- [x] 1.2 Create minimal root `package.json` (`name`, `private: true`, `packageManager: "pnpm@10.33.0"`, `"prepare": "husky"`) and verify it parses with `node -e "require('./package.json')"`
- [x] 1.3 Run `pnpm add -D husky @commitlint/cli @commitlint/config-conventional`, verify it exits 0, `pnpm-lock.yaml` exists, and `git config core.hooksPath` prints `.husky/_`
- [x] 1.4 Verify `git status --porcelain` lists no `node_modules` entries (AC 7)

## 2. commit-msg hook with commitlint (issue #5, AC 2 and 3)

- [x] 2.1 Create `commitlint.config.js` as CommonJS (`module.exports = { extends: ['@commitlint/config-conventional'] }`) and verify `echo "feat: x" | pnpm exec commitlint` exits 0
- [x] 2.2 Create `.husky/commit-msg` running `pnpm exec commitlint --edit "$1"` and verify the file exists and is executable
- [x] 2.3 Verify `git commit --allow-empty -m "bad message"` exits non-zero, prints a commitlint error, and `git log -1` is unchanged (AC 2)
- [x] 2.4 Verify `git commit --allow-empty -m "chore: verify commitlint"` exits 0 (AC 3), then drop that empty commit with `git reset HEAD~1` and confirm `git log -1` is back to the previous commit

## 3. pre-push hook blocking dev and main (issue #5, AC 4 and 5)

- [x] 3.1 Create `.husky/pre-push` in POSIX `sh` that reads each `<local ref> <local sha> <remote ref> <remote sha>` line from stdin and exits 1 with a message naming the branch when the remote ref is `refs/heads/dev` or `refs/heads/main`; verify it is executable and `sh -n .husky/pre-push` exits 0
- [x] 3.2 Verify the hook logic offline: `printf 'refs/heads/feat/x abc refs/heads/dev def\n' | sh .husky/pre-push origin url` exits 1 naming `dev`, the same with `refs/heads/main` exits 1 naming `main`, and with `refs/heads/feat/x` as the remote ref exits 0
- [ ] 3.3 Commit the work so far with Conventional Commit messages (no Claude attribution) and verify each commit passes the commit-msg hook

## 4. End-to-end verification (issue #5, AC 1, 4, 5, 6 and 7)

- [ ] 4.1 Record `git ls-remote origin refs/heads/dev`, run `git push origin HEAD:dev`, and verify it exits non-zero with the pre-push message naming `dev` and `ls-remote` shows the same SHA (AC 4)
- [ ] 4.2 Record `git ls-remote origin refs/heads/main`, run `git push origin HEAD:main`, and verify it exits non-zero with the pre-push message naming `main` and `ls-remote` shows the same SHA (AC 5)
- [ ] 4.3 Run `git push -u origin feat/husky-installation` and verify it exits 0 (AC 6)
- [ ] 4.4 Clone the committed branch into a scratch directory (`git clone --branch feat/husky-installation <repo> <scratch>/clone`), run `pnpm install` there, and verify it exits 0, `git config core.hooksPath` prints `.husky/_`, and `git status --porcelain` lists no `node_modules` entries (AC 1 and 7)
