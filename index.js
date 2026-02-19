require('dotenv').config();
const { initFirebase, getDb } = require('./firebase-config');
const { getUdemyPrice } = require('./scraper');
const TelegramBot = require('node-telegram-bot-api');

initFirebase();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

const levels = { NONE: 0, THRESHOLD: 1, TARGET: 2 };

async function checkAllCourses() {
  console.log('🚀 Checking prices...');

  const db = getDb();
  const courses = await db.collection('courses').get();
  if (courses.empty) {
    console.log('ℹ️ No courses found - add some first!');
    return;
  }

  for (const doc of courses.docs) {
    const course = { id: doc.id, ...doc.data() };
    console.log(`\n📚 ${course.title}`);

    const price = await getUdemyPrice(course.url);
    if (!price) {
      console.log('⚠️ Could not get price');
      continue;
    }

    console.log(`💰 Current: ₹${price} | Target: ${course.targetPrice} | Threshold: ${course.thresholdPrice}`);

    const currentLevel = levels[course.lastNotifiedLevel || 'NONE'];
    
    let shouldNotify = false;
    let newLevel = currentLevel;
    let message = '';

    // 🎯 YOUR EXACT RULES
    if (price <= course.targetPrice && currentLevel < levels.TARGET) {
      shouldNotify = true;
      newLevel = levels.TARGET;
      message = `🎯 *TARGET PRICE REACHED!*\n\n📚 ${course.title}\n💰 ₹${price}\n🎯 Target: ₹${course.targetPrice}\n🔗 ${course.url}`;
    } else if (price <= course.thresholdPrice && currentLevel === levels.NONE) {
      shouldNotify = true;
      newLevel = levels.THRESHOLD;
      message = `✅ *GOOD PRICE ALERT!*\n\n📚 ${course.title}\n💰 ₹${price}\n📊 Threshold: ₹${course.thresholdPrice}\n🔗 ${course.url}`;
    }

    if (shouldNotify) {
      await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
      console.log('📢 Telegram alert sent!');
      
      await doc.ref.update({
        lastNotifiedLevel: Object.keys(levels)[newLevel],
        currentPrice: price,
        lastChecked: new Date().toISOString()
      });
    } else {
      console.log('ℹ️ No alert needed');
    }
  }
  console.log('✅ All done!');
}

checkAllCourses().catch(console.error);
