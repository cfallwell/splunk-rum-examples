# Changelog

## 1.0.0

- Reset the release line so GitHub Releases, the npm package, and the MPA bootstrap all publish under the same version.
- Replaced the split release automation with a single workflow that reads `spa-npm/package.json`, publishes the npm package, and creates the matching GitHub release with the MPA assets attached.
- Added a release-notes extraction step so the GitHub Release body and the package README can show the full set of notes for the shipped version.
- Added a helper script to set the release version in one place and regenerate the embedded/bootstrap artifacts from that same value.
- Embedded the local SignalFx RUM and session-recorder bundles for the MPA bootstrap flow and tracked their upstream release metadata.
