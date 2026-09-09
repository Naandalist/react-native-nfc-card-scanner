# Publishing

Releases go to npm through GitHub Actions **OIDC trusted publishing**. No `NPM_TOKEN` secret.

## One-time setup on npmjs.com

1. Open [package settings](https://www.npmjs.com/package/react-native-nfc-card-scanner/access).
2. **Trusted Publisher** → **GitHub Actions**.
3. Fill in exactly:
   - Organization or user: `Naandalist`
   - Repository: `react-native-nfc-card-scanner`
   - Workflow filename: `publish.yml`
   - Environment: leave empty
4. Allowed actions: enable **`npm publish`** (configs created after 3 Sep 2026 default to `npm stage publish` only).
5. Save. Existing automation tokens can be revoked after the first successful OIDC publish.

Requires npm CLI ≥ 11.5.1 and a GitHub-hosted runner (already true in `.github/workflows/publish.yml`).

## Cut a release

`package.json` version must already match the tag (currently `1.1.0`).

```bash
git checkout main
git pull
git tag v1.1.0
git push origin v1.1.0
```

Pushing the tag runs **Publish**. Provenance is generated automatically with trusted publishing.

If the npm connection only allows staging:

```bash
# in CI you would use: npm stage publish
npm stage ls
# then approve the stage on npmjs.com / `npm stage publish --approve`
```
