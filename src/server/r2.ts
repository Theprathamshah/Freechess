import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error(
    "Missing R2 configuration. Expected CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME."
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __freechessR2Client: S3Client | undefined;
}

const r2Client =
  global.__freechessR2Client ??
  new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

if (!global.__freechessR2Client) {
  global.__freechessR2Client = r2Client;
}

export const putPgnObject = async (key: string, pgn: string): Promise<void> => {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pgn,
      ContentType: "application/x-chess-pgn",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
};

export const getPgnObject = async (key: string): Promise<string> => {
  const result = await r2Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  if (!result.Body) {
    throw new Error(`R2 object ${key} has no body`);
  }
  return result.Body.transformToString();
};
