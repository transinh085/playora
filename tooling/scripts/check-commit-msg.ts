/**
 * Conventional Commits: `type(scope)?: subject` — docs/engineering/conventions.md §8.
 * Usage (lefthook commit-msg): bun tooling/scripts/check-commit-msg.ts .git/COMMIT_EDITMSG
 */
const TYPES = [
  'feat',
  'fix',
  'chore',
  'docs',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'style',
  'revert',
];
const PATTERN = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: \\S.{0,99}$`);

const file = process.argv[2];
if (!file) {
  console.error('usage: check-commit-msg <commit-msg-file>');
  process.exit(2);
}

const subject = (await Bun.file(file).text()).split('\n')[0]?.trim() ?? '';
if (/^(Merge|Revert|fixup!|squash!) /.test(subject) || PATTERN.test(subject)) process.exit(0);

console.error(`✖ Commit message must follow Conventional Commits, e.g. "feat(api): add events module"
  allowed types: ${TYPES.join(', ')}
  got: "${subject}"`);
process.exit(1);
