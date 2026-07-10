# StackDrop Release Checklist

Use this checklist when publishing a Windows installer through GitHub Releases.

## 1. Pick the Version

Use a new semantic version. Do not reuse an existing tag.

Update these files together when changing the app version:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

The GitHub tag should match the app version with a leading `v`, for example `v2.1.4`.

## 2. Verify Locally

Run the standard checks from the repo root:

```powershell
npm run typecheck
npm run test
npm run test:e2e
npm run build
cd src-tauri
cargo test
cd ..
git diff --check
```

## 3. Build Installers Locally

```powershell
npm run tauri -- build
```

Expected local outputs:

```text
src-tauri\target\release\bundle\nsis\StackDrop_*_x64-setup.exe
src-tauri\target\release\bundle\msi\StackDrop_*_x64_en-US.msi
```

Do not commit `src-tauri/target/` or generated installers.

## 4. Commit and Push

Commit source, docs, workflow, and version metadata changes. Then push `main`:

```powershell
git push origin main
```

## 5. Tag the Release

After verification passes and `main` is pushed:

```powershell
git tag v2.1.4
git push origin v2.1.4
```

Replace `v2.1.4` with the selected version.

## 6. Download the Installer

Pushing the tag starts `.github/workflows/release.yml`. The workflow builds on Windows and attaches these files to the GitHub Release:

- NSIS `.exe` installer, recommended for most users
- MSI `.msi` package

Users should download the installer from:

```text
https://github.com/ChimdumebiNebolisa/StackDrop/releases/latest
```

## Notes

- The installer is currently unsigned, so Windows SmartScreen may warn users.
- The workflow creates a public GitHub Release when a version tag is pushed.
- Use [`RELEASE_NOTES.md`](RELEASE_NOTES.md) as the starting point for GitHub release notes.
