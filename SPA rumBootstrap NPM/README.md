# rumbootstrap (library)

This is a small TypeScript library that bootstraps Splunk RUM + Session Replay for React SPAs.

## Build

```bash
npm install
npm run build
```

## Local consumption

In your app's `package.json`:

```jsonc
{
  "dependencies": {
    "rumbootstrap": "file:../rumbootstrap-lib"
  }
}
```

Then install in the app:

```bash
npm install
```

Note: `prepare` runs automatically for file dependencies, so the library will compile during install.


## Note on TypeScript builds
This library uses React types during compilation. The repo includes `react`, `react-dom`, and their `@types/*` packages as **devDependencies** so `npm install` + `npm run build` works in the library repo.


## Version pinning
This build pins **both RUM and Session Recorder to v1.1.0** to avoid version mismatch with `latest`.
