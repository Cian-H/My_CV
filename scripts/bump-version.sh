#!/bin/bash
set -e

# Generate CalVer: YYYY.M.COMMIT_COUNT
VERSION="$(date +"%Y.%-m").$(git rev-list --count HEAD)"

sed -i "0,/^version = .*/s/^version = .*/version = \"$VERSION\"/" pyproject.toml
sed -i "0,/^version = .*/s/^version = .*/version = \"$VERSION\"/" src/rust/Cargo.toml

if ! git diff --quiet pyproject.toml src/rust/Cargo.toml; then
    echo "Bumping version to $VERSION"
    git add pyproject.toml src/rust/Cargo.toml

    # Update Cargo.lock if possible
    devenv shell -- bash -c "cd src/rust && cargo check" >/dev/null 2>&1 || true
    git add src/rust/Cargo.lock || true
fi
