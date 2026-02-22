// Incarca variabilele din .env
require("dotenv").config();

const fs = require("fs");
const puppeteer = require("puppeteer-core");
const { Client, GatewayIntentBits } = require("discord.js");

// Log verificare .env
console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "OK" : "LIPSA");
console.log("CHANNEL_ID:", process.env.CHANNEL_ID ? "OK" : "LIPSA");
console.log("X_USERNAME:", process.env.X_USERNAME ? "OK" : "LIPSA");

// Client Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const USERNAME = process.env.X_USERNAME;

let browser;
let page;
let lastTweet = null;

// Incarca ultimul tweet salvat
if (fs.existsSync("lastTweet.txt")) {
  lastTweet = fs.readFileSync("lastTweet.txt", "utf8");
}

// Cand botul e gata
client.once("ready", async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  // Pornim Puppeteer (headless pentru Render)
  browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
  defaultViewport: null
});

  console.log("🌐 Browser pornit (headless)");

  page = await browser.newPage();

  // Prima verificare
  await checkTweets();

  // Verificare la 10 secunde
  setInterval(checkTweets, 10000);
});

// Functie verificare tweet-uri
async function checkTweets() {
  try {
    console.log("🔍 Verificare tweet-uri...");

    await page.goto(`https://nitter.net/${USERNAME}`, {
      waitUntil: "domcontentloaded",
      timeout: 0
    });

    // Asteapta incarcare continut
    await new Promise(r => setTimeout(r, 4000));

    const tweets = await page.$$eval(".timeline-item", items =>
      items.map(item => {
        const link = item.querySelector("a.tweet-link")?.href;
        const text = item.innerText;
        return { link, text };
      })
    );

    if (!tweets.length) {
      console.log("⚠️ Nu s-au gasit tweet-uri");
      return;
    }

    const latest = tweets[0];

    console.log("📌 Ultimul tweet:", latest.link);

    // Daca e nou
    if (latest.link && latest.link !== lastTweet) {
      console.log("🆕 Tweet nou!");

      lastTweet = latest.link;
      fs.writeFileSync("lastTweet.txt", lastTweet);

      // Extrage ID tweet
      const tweetId = latest.link.split("/").pop();

      // Link oficial X
      const xLink = `https://x.com/${USERNAME}/status/${tweetId}`;

      const channel = await client.channels.fetch(CHANNEL_ID);

      await channel.send(
        `🆕 **New X Post from ${USERNAME}!**\n${xLink}`
      );

      console.log("✅ Postat pe Discord:", xLink);

    } else {
      console.log("ℹ️ Nicio postare noua");
    }

  } catch (err) {
    console.error("❌ Eroare:", err.message);
  }
}

// Login bot
client.login(process.env.DISCORD_TOKEN);