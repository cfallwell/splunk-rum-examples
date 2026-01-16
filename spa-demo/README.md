# RumBootstrap Shopping SPA TS Demo

Example React SPA using the `/spa-npm` package.

## Run locally

From the repo root:

```bash
cd spa-npm
npm install
npm run build

cd ../spa-demo
npm install
npm run dev
```

## Configuration

Edit `spa-demo/src/rum.config.ts` for realm/token/app/environment.

## Routes for testing

Includes extra routes (About/Support/Terms) and `/product/:id` to validate client-side route-change tracking.
