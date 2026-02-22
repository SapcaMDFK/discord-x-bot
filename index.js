require("dotenv").config();

const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const { Client, GatewayIntentBits } = require("discord.js");

// Debug env
console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "OK" : "LIPSA");
console.log("CHANNEL_ID:", process.env.CHANNEL_ID ? "OK" : "LIPSA");
console.log("X_USERNAME:", process.env.X_USERNAME ? "OK" : "LIPSA");

// Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const USERNAME = process.env.X_USERNAME;

// Nitter mirrors
const MIRRORS = [
  "https://nitter.net",
  "https://nitter.fdn.fr",
  "https://nitter.cz",
  "https://nitter.1d4.us"
];

let lastTweet = null;

// Load last tweet
if (fs.existsSync("lastTweet.txt")) {
  lastTweet = fs.readFileSync("lastTweet.txt", "utf8");
}

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  checkTweets();
  setInterval(checkTweets, 20000); // 20 sec
});

async function checkTweets() {
  try {
    console.log("🔍 Verificare tweet-uri...");

    let html = null;
    let usedMirror = null;

    // Try mirrors
    for (const base of MIRRORS) {
      try {
        const res = await axios.get(`${base}/${USERNAME}`, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
          },
          timeout: 15000
        });

        html = res.data;
        usedMirror = base;
        console.log(`✅ Mirror OK: ${base}`);
        break;

      } catch {
        console.log(`❌ Mirror picat: ${base}`);
      }
    }

    if (!html) {
      console.log("❌ Niciun mirror disponibil");
      return;
    }

    const $ = cheerio.load(html);

    // New selector for Nitter
    const tweet = $("article.timeline-item").first();

    if (!tweet.length) {
      console.log("⚠️ Niciun tweet gasit");
      return;
    }

    const link = tweet.find("a[href*='/status/']").attr("href");

    if (!link) {
      console.log("⚠️ Link tweet lipsa");
      return;
    }

    const fullLink = `https://x.com${link}`;

    console.log("📌 Ultimul tweet:", fullLink);

    // New tweet
    if (fullLink !== lastTweet) {
      console.log("🆕 Tweet nou detectat!");

      lastTweet = fullLink;
      fs.writeFileSync("lastTweet.txt", lastTweet);

      const channel = await client.channels.fetch(CHANNEL_ID);

      await channel.send(
        `🆕 **New post from ${USERNAME}**\n${fullLink}`
      );

      console.log("✅ Trimite pe Discord");

    } else {
      console.log("ℹ️ Nimic nou");
    }

  } catch (err) {
    console.error("❌ Eroare:", err.message);
  }
}

client.login(process.env.DISCORD_TOKEN);