# Dependency Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade workspace dependencies to current npm latest versions while preserving CLI behavior.

**Architecture:** Keep the Yarn workspace layout intact, update direct dependency ranges in manifests, regenerate the
lockfile with Yarn, and fix only compatibility regressions that the test/build suite exposes. Stabilize the verification
commands first so `yarn test` and `yarn build` are meaningful gates.

**Tech Stack:** Yarn 4 workspaces, TypeScript ESM, Vitest, Oxc lint/format tooling, Node 24 in the current environment.

### Task 1: Stabilize Baseline Verification

**Files:**

- Modify: test runner configuration
- Modify: `package.json`

**Step 1: Record failing commands**

Run: `yarn test`
Expected: FAIL from Watchman state writes in `/home/developer/.local/state` before the Jest to Vitest migration.

Run: `yarn build`
Expected: FAIL with `TS6305` when dependent workspaces build in parallel.

**Step 2: Apply minimal tooling fixes**

Set Jest `watchman: false` before migration and make the workspace build topological rather than parallel.

**Step 3: Verify baseline**

Run: `yarn test`
Expected: PASS.

Run: `yarn build`
Expected: PASS.

### Task 3a: Migrate Tooling Requested During Implementation

**Files:**

- Modify: `package.json`
- Modify: `clis/gpt/package.json`
- Modify: `packages/*/package.json`
- Modify: `tsconfig.json`
- Add: `vitest.config.ts`
- Add: `.oxlintrc.json`
- Add: `.oxfmtrc.json`

**Steps:**

1. Replace Jest with Vitest and keep coverage enabled.
2. Replace legacy lint and format commands with Oxlint/Oxfmt.
3. Run the CLI with `node --import tsx`.
4. Add `@typescript/native-preview` as an experimental `typecheck:native` gate while keeping `tsc` for declaration builds.

### Task 2: Upgrade Direct Dependencies

**Files:**

- Modify: `package.json`
- Modify: `clis/gpt/package.json`
- Modify: `packages/*/package.json`
- Modify: `yarn.lock`

**Step 1: Query latest versions**

Use npm registry `latest` dist-tags for direct dependencies and devDependencies.

**Step 2: Update manifests and lockfile**

Run Yarn upgrade commands so manifests and lockfile are updated together.

**Step 3: Install**

Run: `yarn install`
Expected: completes without lockfile or linker errors.

### Task 3: Fix Compatibility Regressions with Tests First

**Files:**

- Modify tests near affected source files as needed.
- Modify production files only after a failing test captures the changed behavior.

**Step 1: Run focused tests**

Run: `yarn test`
Expected: failures, if any, identify changed runtime behavior.

**Step 2: Add failing unit tests for behavior regressions**

Write the smallest test that reproduces the regression before changing production code.

**Step 3: Implement minimal fixes**

Change source code only enough to make the failing test pass.

### Task 4: Final Verification

**Files:**

- Review all changed files.

**Step 1: Run full gates**

Run: `yarn install --immutable`
Run: `yarn test`
Run: `yarn build`
Run: `yarn format:check`
Run: `yarn format:check`
Run: `yarn lint`
Run: `yarn typecheck:native`

**Step 2: Inspect diff**

Run: `git diff --stat`
Run: `git diff`

**Step 3: Report results**

Summarize package/tooling changes, tests added, and any known environment caveats.
