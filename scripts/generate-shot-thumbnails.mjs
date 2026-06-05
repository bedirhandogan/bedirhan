import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDir = path.join("public", "shots");
const outputDir = path.join(sourceDir, "thumbs");
const thumbWidth = 1680;
const webpQuality = 92;

function toThumbName(filename) {
  return `${filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.webp`;
}

await fs.mkdir(outputDir, { recursive: true });

const files = (await fs.readdir(sourceDir)).filter((file) =>
  /\.webp$/i.test(file),
);

for (const file of files) {
  const input = path.join(sourceDir, file);
  const output = path.join(outputDir, toThumbName(file));
  const image = sharp(input);
  const metadata = await image.metadata();

  await image
    .resize({ width: thumbWidth, withoutEnlargement: true })
    .webp({ quality: webpQuality, effort: 6 })
    .toFile(output);

  const outputMetadata = await sharp(output).metadata();
  const outputStats = await fs.stat(output);

  console.log(
    `${file} (${metadata.width}x${metadata.height}) -> ${output} (${outputMetadata.width}x${outputMetadata.height}, ${outputStats.size} bytes)`,
  );
}
