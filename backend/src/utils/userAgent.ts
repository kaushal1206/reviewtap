import { UAParser } from 'ua-parser-js';

export interface ParsedUserAgent {
  deviceType: string;
  os: string;
  browser: string;
}

export function parseUserAgent(userAgentString: string | undefined): ParsedUserAgent {
  if (!userAgentString) {
    return {
      deviceType: 'unknown',
      os: 'unknown',
      browser: 'unknown',
    };
  }

  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  const deviceType = result.device.type || 'desktop';
  const os = result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'unknown';
  const browser = result.browser.name ? `${result.browser.name} ${result.browser.major || ''}`.trim() : 'unknown';

  return {
    deviceType,
    os,
    browser,
  };
}
