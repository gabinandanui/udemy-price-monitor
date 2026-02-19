const axios = require('axios');

async function getUdemyPrice(url) {
  try {
    const slug = url.split('/course/')[1]?.replace(/\/$/, '');
    if (!slug) {
      console.warn('⚠️ Could not extract slug from URL');
      return null;
    }

    console.log(`🔍 Fetching: ${slug}`);

    // Udemy internal course API (no auth needed)
    const response = await axios.get(
      `https://www.udemy.com/api-2.0/course-landing-components/${slug}/me/`,
      {
        params: {
          components: 'price_text,discount_expiration,purchase',
          locale: 'en_IN',
        },
        headers: {
          'User-Agent': process.env.USER_AGENT ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Referer': `https://www.udemy.com/course/${slug}/`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    );

    const data = response.data;
    console.log('📦 Response:', JSON.stringify(data).substring(0, 500));

    const amount =
      data?.price_text?.data?.pricing_result?.price?.amount ||
      data?.price_text?.data?.pricing_result?.discount_price?.amount;

    if (amount) {
      console.log(`💰 Price found: ₹${amount}`);
      return parseFloat(amount);
    }

    console.warn('⚠️ Price not found in response');
    return null;

  } catch (error) {
    console.error('Failed:', error.response?.status, error.response?.data || error.message);
    return null;
  }
}

module.exports = { getUdemyPrice };
