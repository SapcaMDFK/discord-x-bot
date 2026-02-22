require("dotenv").config();

const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const { Client, GatewayIntentBits } = require("discord.js");

// Debug env
console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "OK" : "LIPSA");
console.log("CHANNEL_ID:", process.env.CHANNEL_ID ? "OK" : "LIPSA");
console.log("X_USERNAME:", process.env.X_USERNAME ? "OK" : "LIPSA");

// Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const USERNAME = process.env.X_USERNAME;

// Nitter mirrors
const MIRRORS = [
  "https://nitter.net",
  "https://nitter.1d4.us",
  "https://nitter.fdn.fr",
  "https://nitter.cz",
  "https://nitter.moomoo.me"
];

let lastTweet = null;

// Load last tweet
if (fs.existsSync("lastTweet.txt")) {
  lastTweet = fs.readFileSync("lastTweet.txt", "utf8");
}

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  checkTweets();
  setInterval(checkTweets, 15000); // 15 sec
});

async function checkTweets() {
  try {
    console.log("🔍 Verificare tweet-uri...");

    let html = null;

    // Try mirrors
    for (const base of MIRRORS) {
      try {
        const res = await axios.get(`${base}/${USERNAME}`, {
          headers: {
            "User-Agent": "Mozilla/5.0"
          },
          timeout: 15000
        });

        html = res.data;
        console.log(`✅ Mirror OK: ${base}`);
        break;

      } catch (err) {
        console.log(`❌ Mirror picat: ${base}`);
      }
    }

    if (!html) {
      console.log("❌ Toate mirror-urile sunt indisponibile");
      return;
    }

    const $ = cheerio.load(html);

    const firstTweet = $(".timeline-item").first();

    if (!firstTweet.length) {
      console.log("⚠️ Niciun tweet gasit");
      return;
    }

    const link = firstTweet.find("a.tweet-link").attr("href");

    if (!link) {
      console.log("⚠️ Link lipsa");
      return;
    }

    const fullLink = `https://x.com${link}`;

    console.log("📌 Ultimul tweet:", fullLink);

    // Check if new
    if (fullLink !== lastTweet) {
      console.log("🆕 Tweet nou!");

      lastTweet = fullLink;
      fs.writeFileSync("lastTweet.txt", lastTweet);

      const channel = await client.channels.fetch(CHANNEL_ID);

      await channel.send(
        `🆕 **New X Post from ${USERNAME}!**\n${fullLink}`
      );

      console.log("✅ Postat pe Discord");

    } else {
      console.log("ℹ️ Nimic nou");
    }

  } catch (err) {
    console.error("❌ Eroare:", err.message);
  }
}

client.login(process.env.DISCORD_TOKEN);