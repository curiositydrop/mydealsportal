#!/usr/bin/env bash
# One-time, opt-in keyless GitHub -> Firestore READ-ONLY identity setup.
# Review before running. Does not configure GitHub repository variables.
set -euo pipefail
PROJECT_ID=mydealsportal
REPO=curiositydrop/mydealsportal
POOL=github-seo
PROVIDER=github
SA=seo-listings-reader
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
echo "Preparing read-only SEO identity for $REPO in $PROJECT_ID ($PROJECT_NUMBER)"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project="$PROJECT_ID"
if ! gcloud iam workload-identity-pools describe "$POOL" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
 gcloud iam workload-identity-pools create "$POOL" --location=global --project="$PROJECT_ID" --display-name="GitHub SEO listings" 
fi
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER" --workload-identity-pool="$POOL" --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
 gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL" --display-name="GitHub SEO preview" --issuer-uri="https://token.actions.githubusercontent.com" --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" --attribute-condition="assertion.repository == '$REPO' && assertion.ref == 'refs/heads/main'"
fi
SA_EMAIL="$SA@$PROJECT_ID.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
 gcloud iam service-accounts create "$SA" --project="$PROJECT_ID" --display-name="SEO listings Firestore reader"
fi
# Read-only role. This project-wide viewer role covers Firestore entities but cannot edit them.
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA_EMAIL" --role="roles/datastore.viewer" --quiet >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" --project="$PROJECT_ID" --role="roles/iam.workloadIdentityUser" --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO" --quiet >/dev/null
echo
echo 'SET THESE GITHUB REPOSITORY VARIABLES (Settings -> Secrets and variables -> Actions -> Variables):'
echo "SEO_WIF_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER"
echo "SEO_SERVICE_ACCOUNT=$SA_EMAIL"
echo 'No private keys are created. Preview only; no deployment.'
