#!/bin/bash

# Copyright 2020 The Go Authors. All rights reserved.
# Licensed under the MIT License. See LICENSE in the project root for license information.

set -euo pipefail

# TODO(rstambler): Remove this file, as syncing is no longer necessary.
# In order to sync with upstream, run merge.bash

# TODO(hyangah): commands for building docker container and running tests locally with docker run.
root_dir() {
  local script_name=$(readlink -f "${0}")
  local script_dir=$(dirname "${script_name}")
  local parent_dir=$(dirname "${script_dir}")
  echo "${parent_dir}"
}

ROOT="$(root_dir)"
cd "${ROOT}"  # always run from the root directory.

WORKTREE="$(mktemp -d)"
BRANCH="sync/merge-upstream-$(date +%Y%m%d%H%M%S)"

git fetch
git worktree add --track -b "${BRANCH}" "${WORKTREE}" origin/master

cd "${WORKTREE}"
export GIT_GOFMT_HOOK=off
git merge --no-commit "origin/upstream" || echo "Ignoring conflict..."

COMMIT=`git log --format=%h -n 1 "origin/upstream"`

gcloud builds submit --config=build/cloudbuild.yaml || echo "Build failed. Please address the issue..."

git commit -m "sync: merge microsoft/vscode-go@${COMMIT} into master"

git codereview mail HEAD
cd - && git worktree remove "${WORKTREE}"
