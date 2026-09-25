import QRCode from 'qrcode';

export interface QRCodeOptions {
  colorDark?: string;
  colorLight?: string;
  width?: number;
  margin?: number;
}

export class QRService {
  /**
   * Generate SVG string of the QR Code
   */
  static async generateSVG(url: string, options: QRCodeOptions = {}): Promise<string> {
    const {
      colorDark = '#000000',
      colorLight = '#ffffff',
      margin = 2,
    } = options;

    return QRCode.toString(url, {
      type: 'svg',
      margin,
      color: {
        dark: colorDark,
        light: colorLight,
      },
      errorCorrectionLevel: 'H',
    });
  }

  /**
   * Generate PNG Buffer of the QR Code (suitable for download)
   */
  static async generatePNGBuffer(url: string, options: QRCodeOptions = {}): Promise<Buffer> {
    const {
      colorDark = '#000000',
      colorLight = '#ffffff',
      width = 1024,
      margin = 3,
    } = options;

    return QRCode.toBuffer(url, {
      type: 'png',
      width,
      margin,
      color: {
        dark: colorDark,
        light: colorLight,
      },
      errorCorrectionLevel: 'H',
    });
  }

  /**
   * Generate Data URL (base64 PNG) for inline rendering
   */
  static async generateDataURL(url: string, options: QRCodeOptions = {}): Promise<string> {
    const {
      colorDark = '#000000',
      colorLight = '#ffffff',
      width = 512,
      margin = 2,
    } = options;

    return QRCode.toDataURL(url, {
      width,
      margin,
      color: {
        dark: colorDark,
        light: colorLight,
      },
      errorCorrectionLevel: 'H',
    });
  }
}
