// Thin wrapper around the vendored qrcode-generator library (lib/qrcode-generator.js,
// MIT licensed, see that file's header) - generates a QR code as a standalone SVG
// string. Kept as a plain vendored file (not an npm dependency) so this project
// still needs no `npm install` step.

const qrcodeLib = require('./qrcode-generator');

function generateQrSvg(text) {
  // typeNumber 0 = auto-pick the smallest QR version that fits the data;
  // 'M' = medium error correction, a reasonable default for a printed/screen QR.
  const qr = qrcodeLib(0, 'M');
  qr.addData(text);
  qr.make();
  // cellSize/margin only affect the SVG's internal viewBox proportions (it's
  // vector, so the browser scales it to whatever CSS size is applied) -
  // margin defaults to cellSize*4, which is the minimum "quiet zone" a QR
  // code needs around it to stay reliably scannable.
  return qr.createSvgTag(8);
}

module.exports = { generateQrSvg };
