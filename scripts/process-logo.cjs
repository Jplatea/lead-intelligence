const { Jimp } = require("jimp");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "src", "assets");

function recolor(image, rgb) {
  const clone = image.clone();
  clone.scan(0, 0, clone.bitmap.width, clone.bitmap.height, (x, y, idx) => {
    if (clone.bitmap.data[idx + 3] > 0) {
      clone.bitmap.data[idx] = rgb[0];
      clone.bitmap.data[idx + 1] = rgb[1];
      clone.bitmap.data[idx + 2] = rgb[2];
    }
  });
  return clone;
}

async function run() {
  const original = await Jimp.read(path.join(ASSETS, "prestige-logo-original.png"));
  original.autocrop();

  // "marca": the full icon + wordmark lockup.
  const marca = original.clone();
  await recolor(marca, [0, 0, 0]).write(path.join(ASSETS, "prestige-mark-black.png"));
  await recolor(marca, [255, 255, 255]).write(path.join(ASSETS, "prestige-mark-white.png"));

  // "logo": just the icon mark, cropped out of the left side (there's a
  // clear transparent gap around x=121-146 before the wordmark starts).
  const icon = original.clone().crop({ x: 0, y: 0, w: 130, h: original.bitmap.height });
  icon.autocrop();
  await recolor(icon, [0, 0, 0]).write(path.join(ASSETS, "prestige-logo-black.png"));
  await recolor(icon, [255, 255, 255]).write(path.join(ASSETS, "prestige-logo-white.png"));

  console.log("marca:", marca.bitmap.width, marca.bitmap.height);
  console.log("logo:", icon.bitmap.width, icon.bitmap.height);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
