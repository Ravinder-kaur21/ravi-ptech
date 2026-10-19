/**
 * scripts/create-s3-bucket.ts
 *
 * Creates the MUVX S3 bucket + IAM CORS + lifecycle configuration.
 *
 * Usage:
 *   npx tsx scripts/create-s3-bucket.ts
 *
 * Requires AWS credentials to be available (env vars or SSO profile).
 * The bucket name comes from MUVX_AWS_BUCKET env var.
 */
import { S3Client, CreateBucketCommand, PutBucketCorsCommand, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3"

const bucket = process.env.MUVX_AWS_BUCKET
const region = process.env.MUVX_AWS_REGION ?? "us-east-1"

if (!bucket) {
  console.error("❌ Set MUVX_AWS_BUCKET env var first (e.g. muvx-prod-storage)")
  process.exit(1)
}

const s3 = new S3Client({ region })

async function main() {
  console.log(`🔧 Creating bucket: ${bucket} in ${region}`)

  // 1. Create bucket
  await s3.send(
    new CreateBucketCommand({
      Bucket: bucket,
      CreateBucketConfiguration:
        region === "us-east-1"
          ? undefined
          : { LocationConstraint: region as any },
    }),
  )
  console.log(`✅ Bucket created: ${bucket}`)

  // 2. CORS — needed if you ever do browser-direct uploads without presigned URLs
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "GET", "POST", "DELETE"],
            ExposeHeaders: ["ETag", "x-amz-request-id"],
            MaxAgeSeconds: 3000,
            AllowedOrigins: ["*"], // tighten to your domain in prod
          },
        ],
      },
    }),
  )
  console.log("✅ CORS configured")

  // 3. Lifecycle — transition to IA after 30 days, delete after 365
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "muvx-lifecycle",
            Status: "Enabled",
            Filter: { Prefix: "logos/" },
            AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
            NoncurrentVersionTransitions: [],
            Transitions: [
              { Days: 30, StorageClass: "STANDARD_IA" },
              { Days: 90, StorageClass: "GLACIER" },
            ],
            Expiration: { Days: 365 },
          },
        ],
      },
    }),
  )
  console.log("✅ Lifecycle configured")
  console.log(`\n🚀 S3 bucket ${bucket} is ready. Set MUVX_AWS_BUCKET=${bucket}`)
}

main().catch((err) => {
  console.error("❌ Failed:", err.message)
  process.exit(1)
})
