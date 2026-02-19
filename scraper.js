const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');

puppeteer.use(StealthPlugin());

async function getUdemyPrice(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // Mask as real browser
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    await page.setUserAgent(
      process.env.USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    // Block images/fonts to load faster
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait extra 5 seconds for JS to render price
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Debug: log full page HTML to see what's there
    const html = await page.content();
    console.log('📄 Page length:', html.length, 'chars');

    // Check if Cloudflare blocked us
    if (html.includes('Just a moment') || html.includes('cf-browser-verification')) {
      console.warn('🚫 Cloudflare detected — blocked!');
      return null;
    }

    const price = await page.evaluate(() => {
      // Method 1: JSON-LD
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data?.offers?.price) return parseFloat(data.offers.price);
        } catch {}
      }

      // Method 2: All price-related elements
      const allText = document.documentElement.innerHTML;

      // INR price pattern
      const inrPattern = /"amount"\s*:\s*"?([\d.]+)"?\s*,\s*"currency"\s*:\s*"INR"/;
      const inrMatch = allText.match(inrPattern);
      if (inrMatch) return parseFloat(inrMatch[1]);

      // discount_price pattern
      const discountPattern = /"discount_price":\{"amount":"([\d.]+)"/;
      const discountMatch = allText.match(discountPattern);
      if (discountMatch) return parseFloat(discountMatch[1]);

      // price amount pattern
      const pricePattern = /"price":\{"amount":"([\d.]+)"/;
      const priceMatch = allText.match(pricePattern);
      if (priceMatch) return parseFloat(priceMatch[1]);

      // Method 3: DOM elements with price class
      const priceSelectors = [
        '[data-purpose="course-price-text"]',
        '[class*="price-text--price"]',
        '[class*="purchase-section"] [class*="price"]',
        '.price--price-part--',
        '[class*="udlite-price"]',
      ];

      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.innerText || el.textContent;
          const match = text.match(/[\d,]+/);
          if (match) return parseFloat(match[0].replace(/,/g, ''));
        }
      }

      return null;
    });

    if (price) {
      console.log(`💰 Price found: ₹${price}`);
      return price;
    }

    // Debug: dump a snippet of HTML
    const snippet = html.substring(0, 2000);
    console.log('🔍 HTML snippet:', snippet);
    console.warn('⚠️ Price not found in page');
    return null;

  } catch (error) {
    console.error('Scrape failed:', error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { getUdemyPrice };
