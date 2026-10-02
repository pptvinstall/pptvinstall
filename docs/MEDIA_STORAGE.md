# Private media storage

Production uploads fail closed unless private object storage is explicitly configured, or the operator confirms that an absolute `MEDIA_DIR` is on a mounted persistent disk. Manual text intake, Job Builder, quotes and documents remain available without photos. There is no automatic migration or deletion of existing media.

The source `render.yaml` declares a free web service without a disk. That is configuration evidence, not confirmation of the current Render dashboard. Ordinary ephemeral instance storage cannot preserve uploads through replacement or deployment. Do not describe existing disk uploads as durable until the actual mount has been verified.

## S3 or Cloudflare R2 setup

1. Create a dedicated private bucket. For AWS S3, keep all Block Public Access settings enabled and use Bucket owner enforced ownership. For R2, leave the `r2.dev` public endpoint and custom public domains disabled. The application never creates buckets, changes policies, grants public ACLs or generates public/presigned URLs.
2. Create server-only credentials scoped to that bucket and the `pptv-media/*` prefix (or your chosen prefix). Required object operations are read, write and delete. AWS permissions: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on that object prefix. Bucket-wide administration is unnecessary. R2 supports Object Read & Write credentials scoped to specific buckets.
3. Set the following environment variables on the Render service. Store secret values in Render's environment settings, never in Git or any `VITE_*` variable.

| Name | Purpose |
| --- | --- |
| `MEDIA_STORAGE` | `s3` for AWS/S3-compatible storage; `r2` for R2 |
| `MEDIA_S3_BUCKET` | Dedicated private bucket name |
| `MEDIA_S3_REGION` | Actual AWS region; `auto` for R2 |
| `MEDIA_S3_ACCESS_KEY_ID` | Server credential ID |
| `MEDIA_S3_SECRET_ACCESS_KEY` | Server secret |
| `MEDIA_S3_ENDPOINT` | Unset for AWS; for R2, the HTTPS S3 endpoint from its dashboard |
| `MEDIA_S3_SESSION_TOKEN` | Optional temporary AWS credential token |
| `MEDIA_S3_PREFIX` | Optional safe object prefix, default `pptv-media`; no leading/trailing slash |
| `MEDIA_S3_FORCE_PATH_STYLE` | Optional `true` for a compatible provider requiring path style; default `false` |

R2's default endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`; use the jurisdiction-specific endpoint shown in its dashboard when applicable. Only HTTPS service endpoints without embedded credentials, paths or query strings are accepted. Missing or invalid settings leave uploads disabled while the app boots normally. An unknown storage mode is disabled, never treated as disk.

4. Deploy through the normal green-branch workflow. Owner storage status reports the configured adapter and durability flag, without revealing bucket names, endpoints, filesystem paths or credentials. A configured flag is not a provider connectivity or privacy audit.
5. Use the established synthetic test path to upload one disposable test image. Confirm authenticated full/thumbnail access; unauthenticated media access must fail. Verify the object is inaccessible without authentication at the provider. Confirm it still downloads after a redeploy. Delete it through the authenticated media endpoint and verify removal. Never test with customer images or create live bookings.

There are no database migrations for this adapter: existing media records contain only storage keys and metadata. Images are validated, capped at 12 MiB before decoding, resized/re-encoded as JPEG and stripped of EXIF/GPS before storage. Storage keys include random IDs; owner authentication is still required. Provider reads/writes/deletes are time limited; reads enforce a 12 MiB size limit.

## Image decoder safety

Accepted uploads are JPEG, PNG and WebP. GIF is explicitly refused, and Sharp's GIF/TIFF/VIPS/HEIF loaders are blocked process-wide following the maintainer workarounds for the existing [libvips advisory](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) and [libheif advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c). HEIC remains unsupported. The dependency version is preserved, so `npm audit` still reports these advisories; the relevant decoder paths are disabled rather than claiming the dependency itself has been upgraded. Revisit this block only with a tested patched Sharp upgrade.

## Persistent disk alternative

Set `MEDIA_STORAGE=disk`, an absolute `MEDIA_DIR` inside the actual Render disk mount, and `MEDIA_DISK_PERSISTENT=true` only after verifying that mount in Render. The acknowledgement is an operator assertion, not an automatic mount check. Check backup/recovery for the volume. Never acknowledge an ordinary `.media` folder on ephemeral instance storage.

Changing adapters does not copy old disk files. Existing disk storage keys may point to unavailable objects after switching. Preserve any recoverable files separately and copy full images and thumbnails under the same keys into the new bucket prefix using an reviewed maintenance procedure before claiming older media is available. No automatic data reset, copying or bucket creation occurs.

## Development and tests

Non-production defaults to local disk; `JOBOS_STORE=memory` defaults to temporary memory. `MEDIA_STORAGE=memory` remains available for dev/staging test mode. Production refuses memory storage. `MEDIA_STORAGE=disabled` explicitly disables uploads in any environment. Existing image/media tests cover validation, metadata stripping and owner access; storage tests use an injected S3 client and temporary private local paths, without real provider calls.

Local OCR is enabled by default for text-heavy image hints and uses bundled English language data. `OCR_ENABLED=false` disables it on a constrained instance; typed text and manual confirmation remain available. OCR does not call a paid provider. This flag does not enable photo storage or bypass the production storage gate.

Official references: [AWS SDK v3 service commands](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/creating-and-calling-service-objects.html), [AWS S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html), [R2 S3 setup and bucket-scoped credentials](https://developers.cloudflare.com/r2/get-started/s3/), [R2 S3 compatibility and region](https://developers.cloudflare.com/r2/api/s3/api/), [R2 public bucket settings](https://developers.cloudflare.com/r2/buckets/public-buckets/).
