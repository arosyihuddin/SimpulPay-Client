import QRCode from "qrcode";

/** Generate data-URL QR (SVG) dari payload string. */
export async function qrDataUrl(code: string, size = 240): Promise<string> {
  return QRCode.toDataURL(code, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
