# CARENEST — Google Cloud Run Deployment Guide

This document outlines the production deployment workflow for CareNest on **Google Cloud Run** using containerized standalone builds and managed Cloud SQL PostgreSQL.

---

## 1. Prerequisites

1. Google Cloud Project with Cloud Run, Cloud SQL, and Cloud Scheduler APIs enabled.
2. Cloud SQL PostgreSQL instance (v16+ or v18).
3. Google Artifact Registry repository for storing container images.
4. Resend API Key for production transactional email delivery.

---

## 2. Environment Variables Configuration

Configure the following environment variables in your Cloud Run Service or Secret Manager:

| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string with SSL | `postgresql://user:pass@10.x.x.x:5432/carenest_db?sslmode=require` |
| `NEXTAUTH_SECRET` | 32+ character random secret for JWT encryption | Generate via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical public URL of your Cloud Run service | `https://carenest-service-xyz-uc.a.run.app` |
| `RESEND_API_KEY` | Resend API key for transactional email delivery | `re_xxxxxxxxxxxx` |
| `EMAIL_FROM` | Verified sender domain address | `CareNest <notifications@yourdomain.com>` |
| `CRON_SECRET` | Secret bearer token guarding scheduler endpoints | Generate via `openssl rand -hex 24` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port (Cloud Run sets to 8080) | `8080` |

---

## 3. Container Build & Push

Build the multi-stage Docker image using Google Cloud Build:

```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]

# 2. Build and push container image using Artifact Registry
gcloud builds submit --tag us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/carenest/app:v1
```

---

## 4. Deploying to Cloud Run

Deploy the container to Cloud Run with non-root user security and automatic scaling:

```bash
gcloud run deploy carenest \
  --image us-central1-docker.pkg.dev/[YOUR_PROJECT_ID]/carenest/app:v1 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --add-cloudsql-instances [YOUR_PROJECT_ID]:us-central1:[YOUR_INSTANCE_NAME] \
  --set-env-vars "NODE_ENV=production,NEXTAUTH_URL=https://carenest-app.run.app" \
  --set-secrets "DATABASE_URL=carenest-db-url:latest,NEXTAUTH_SECRET=carenest-auth-secret:latest,RESEND_API_KEY=resend-key:latest,CRON_SECRET=carenest-cron-secret:latest"
```

---

## 5. Google Cloud Scheduler Setup (Missed-Dose Escalation Cron)

Configure an automated, browser-independent cron job in Google Cloud Scheduler to trigger missed-dose evaluations every 15 minutes:

```bash
gcloud scheduler jobs create http carenest-missed-dose-escalation \
  --location us-central1 \
  --schedule "*/15 * * * *" \
  --uri "https://[YOUR_CLOUD_RUN_URL]/api/scheduler/process-escalations" \
  --http-method POST \
  --headers "Authorization=Bearer [YOUR_CRON_SECRET]" \
  --time-zone "America/New_York"
```

The endpoint evaluates grace periods, transitions unconfirmed doses to Tier 1 caretaker alerts, and escalates to Tier 2 family alerts with full idempotency and relational audit logging.
