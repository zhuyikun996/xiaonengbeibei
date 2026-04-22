# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

WeChat Mini Program (微信小程序) for cloud development quickstart, built on WeChat Cloud Development (微信云开发). AppID: `wx179e5fae06276849`. All comments and UI text are in Chinese.

## Development Environment

- Use **WeChat Developer Tools (微信开发者工具)** — there is no npm build pipeline, no test framework, and no linter configured.
- Open this project directory directly in WeChat Developer Tools; it handles compilation, preview, and deployment.
- Cloud function dependencies use `wx-server-sdk` (see `cloudfunctions/quickstartFunctions/package.json`).

## Deploying Cloud Functions

Via WeChat Developer Tools: right-click `cloudfunctions/quickstartFunctions` → "上传并部署-云端安装依赖" (Upload and Deploy - Install Dependencies in Cloud).

Via CLI (TCLB tool):
```bash
bash uploadCloudFunction.sh
```
This runs `cloud functions deploy --e <envId> --n quickstartFunctions --r --project <projectPath>`.

## Required Configuration

Set the cloud environment ID in `miniprogram/app.js` — the `env` field in `globalData` must match a valid WeChat cloud environment, or all cloud calls will fail.

## Architecture

```
miniprogram/               # Frontend — WeChat mini program pages/components
  app.js                   # Entry point, initializes wx.cloud with env ID
  app.json                 # Page routing and window config
  pages/index/             # Landing page — lists cloud service demos
  pages/example/           # Example implementations (CRUD, upload, AI, etc.)
  components/cloudTipModal/ # Reusable tip/error modal component

cloudfunctions/            # Backend — WeChat cloud functions
  quickstartFunctions/index.js  # All backend logic in one file
```

### Cloud Function Routing

`quickstartFunctions/index.js` uses a single exported `main` function with a `switch` on `event.type` to route to handlers: `getOpenId`, `getMiniProgramCode`, `createCollection`, `selectRecord`, `insertRecord`, `updateRecord`, `deleteRecord`.

### Database

Uses the "sales" collection with schema: `{ region, city, sales }`. All CRUD operations go through the cloud function.

### Page Navigation

The index page uses `powerList` data to render feature cards. Navigation patterns:
- `type` field → navigates to `/pages/example/index?type=<type>`
- `link` field → navigates to web view page
- `page` field → navigates to `/pages/<page>/index`
- Database card → auto-creates collection on first click via cloud function

## Code Style

- 2-space indentation (configured in `project.config.json`)
- ES6 transpilation enabled in project settings
- No TypeScript
