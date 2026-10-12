# System design: Flashcards MVP

The MVP architecture for the flashcards app, tracked in issue #8. Every diagram is edited in its Excalidraw+ scene, `NN-name` in the Excalidraw+ collection `app-flashcards`, and the repo holds two files exported from that scene:

- `NN-name.png`: the rendered image, exported from the scene screenshot.
- `NN-name.excalidraw`: the scene content, exported from the scene. Open it for viewing at <https://excalidraw.com> (File > Open).

To change a diagram, edit its Excalidraw+ scene through the Excalidraw+ MCP, check it with a screenshot, then re-export both files from the scene. Never edit or render the files here directly (see "Diagram conventions" in `CLAUDE.md`).

## Diagrams

### 01. System context

Who uses the system and which external systems it depends on (C4 level 1).

![System context](01-context.png)

### 02. AWS architecture

The deployment view: Route 53, Amplify, the EC2 instance (NGINX, api, worker), SQS with DLQs, EventBridge Scheduler, S3 + CloudFront, Polly, SES, SSM and CloudWatch, plus Neon and Clerk as third-party SaaS.

![AWS architecture](02-aws-architecture.png)

### 03. Flow: study session

Sign-in with Clerk, fetching due cards, and submitting a review that updates the spaced-repetition state.

![Study session flow](03-flow-study-session.png)

### 04. Flow: media upload and delivery

Presigned PUT straight to S3, confirmation through the API, and reads through CloudFront with Origin Access Control.

![Media upload flow](04-flow-media-upload.png)

### 05. Flow: async jobs

The TTS, bulk import and daily reminder pipelines, each with its retry and dead-letter path.

![Async jobs flow](05-flow-async-jobs.png)

### 06. Data model

Postgres tables and relationships, plus the hot query and its indexes.

![Data model](06-data-model.png)

### 07. CI/CD

From pull request to production for the backend image and the Amplify-hosted web app, plus the versioning lane that tags each app on pushes to `dev` and `main`.

![CI/CD](07-cicd.png)

### 08. API structure

How the NestJS API is organized inside its container:
- the entry points (`main.ts` now, `worker.ts` planned);
- the global request pipeline: validation pipe, then controller and service, then serializer interceptor;
- the feature modules in `src/modules/<name>/` (health built, the rest planned);
- the cross-cutting code in `src/config`, `src/common` and `src/openapi`;
- the committed OpenAPI contract, `apps/api/openapi.json`, with the checks that keep it current.

![API structure](08-api-structure.png)

## Decisions

| Area | Decision | Why |
|---|---|---|
| Frontend hosting | Next.js on **AWS Amplify Hosting** at `app.*` | Managed SSR hosting and builds from git, so there is no web server to run |
| Backend compute | **One EC2 instance** running Docker Compose with `nginx`, `api` and `worker` containers | The cheapest way to run NestJS for an MVP. `api` and `worker` share one image and differ only in their start command |
| TLS / ingress | **NGINX with Let's Encrypt** (certbot) on the instance, reached through an **Elastic IP**. No ALB | Saves the ALB cost. The security group allows inbound 80/443 only, and SSH is replaced by SSM Session Manager |
| Database | **Neon Postgres** in prod, **Postgres in Docker (OrbStack)** locally | Serverless Postgres with branching and nothing to operate. The Neon project sits in the same AWS region as the EC2 instance. The app uses the pooled URL and migrations use the direct URL |
| Auth | **Clerk** | Hosted sign-up, sign-in and sessions. NestJS verifies session JWTs against cached JWKS, and Clerk `user.*` webhooks (Svix-signed) keep the `users` table in sync |
| Async jobs | **SQS standard queues**, one per job type (`tts-jobs`, `import-jobs`, `reminder-jobs`), each with a **DLQ** after 5 failed receives | Job types get their own visibility timeouts (60 s, 15 min, 5 min). Consumers are idempotent, and a CloudWatch alarm fires when a DLQ depth goes above 0 |
| Scheduling | **EventBridge Scheduler** sends one daily message to `reminder-jobs` | Avoids an in-process cron, which would send duplicates once there is more than one instance |
| Media | **S3** (private bucket) with **CloudFront + OAC** at `cdn.*` | Uploads go straight from the browser to S3 with presigned URLs, so file bytes never pass through EC2 |
| Text-to-speech | **Amazon Polly**, called from the worker | Audio is stored at `tts/{cardId}-{side}.mp3` and keyed by a text hash, so it is only regenerated when the text changes |
| Email | **Amazon SES** for review reminders | Clerk only sends auth emails |
| DNS | **Route 53**: `app.*` points to Amplify, `api.*` to the Elastic IP, `cdn.*` to CloudFront | One hosted zone for the domain |
| Secrets | **SSM Parameter Store** for api and worker, **Amplify environment variables** for web | Nothing secret lives in the repo or the Docker image |
| CI/CD | **GitHub Actions** CI on every PR to `dev`. Feature PRs are squash-merged into `dev`; release PRs `dev -> main` are merged with a **merge commit**. A merge to `main` builds the image, pushes it to **ECR**, runs migrations and redeploys through **SSM Run Command**. Amplify builds `main` on its own | AWS access uses GitHub OIDC, with no long-lived keys. Merge commits keep every `dev` commit in `main`'s history, so release PRs show only what is new |
| Versioning | `api` and `web` are versioned **independently** with Semantic Versioning, stored **only as git tags** (`<app>@X.Y.Z`) with GitHub Releases. The `versioning` workflow tags each app that `turbo ls --affected` reports on a push to `dev` with `<app>@X.Y.Z-dev.N` (bump from the commit type), and on a push to `main` promotes the latest dev version to `<app>@X.Y.Z` | The turbo graph catches shared-package, lockfile and root-config changes. No bot commits, so the `dev`/`main` rulesets need no bypass. Tags created with `GITHUB_TOKEN` don't trigger other workflows, so future deploy jobs must run in the same workflow or use `workflow_run` |
| API layout | NestJS **feature modules** in `apps/api/src/modules/<name>/` (`<name>.module.ts`, `.controller.ts`, `.service.ts`, `dto/`, plus `schema/` for persistence once the ORM is chosen). Cross-cutting code lives in `src/config`, `src/common` and `src/openapi`, and an architecture test enforces the layout | Every MVP feature gets the same predictable home. Controllers stay HTTP-only and services hold the logic, without the ceremony of per-module ports and adapters |
| API validation | **Zod 4 through Nest 12's built-in Standard Schema support**: `@Body/@Query/@Param({ schema })`, a global `StandardSchemaValidationPipe` (400 with one message per field) and a global `StandardSchemaSerializerInterceptor` that shapes responses. No `class-validator`, `class-transformer` or `nestjs-zod` | One schema gives the TypeScript type, the validation, the response shape and the OpenAPI schema. `nestjs-zod` doesn't support Nest 12, and `class-transformer` has had no release since 2022 |
| API contract | **OpenAPI 3.1 generated from the code** (`@nestjs/swagger` 12 with `zod-openapi`) and committed as `apps/api/openapi.json`. A drift test and Redocly lint keep it current and complete. Swagger UI is at `/docs`, off in production unless `SWAGGER_UI=true` | The contract is reviewable in PRs and can't silently drift from the code or lose documentation. Only body and response schemas are named components, because Swagger doesn't expand a named query schema into parameters |

## Accepted trade-offs

- **The single EC2 instance is a single point of failure.** There is no ALB or Auto Scaling group, so deploys and instance failures cause brief downtime. To scale out later: add an ALB, run two or more instances in an ASG, and switch TLS to ACM on the ALB.
- **Neon is outside the VPC.** Database traffic crosses the public internet over TLS. Keeping Neon in the same AWS region keeps latency low. Neon scales to zero, so the first query after an idle period has a cold start.
- **Media is public through CloudFront, protected only by unguessable UUID keys.** If private decks need stronger protection, switch to CloudFront signed URLs or signed cookies.

## Open questions

- Spaced-repetition algorithm: SM-2 or FSRS. The `review_states` columns cover both.
- ORM and migration tool for NestJS.
- AWS region and domain name.
