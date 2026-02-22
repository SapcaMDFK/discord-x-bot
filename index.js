require("dotenv").config();

const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const { Client, GatewayIntentBits } = require("discord.js");

// Debug env
console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "OK" : "LIPSA");
console.log("CHANNEL_ID:", process.env.CHANNEL_ID ? "OK" : "LIPSA");
console.log("X_USERNAME:", process.env.X_USERNAME ? "OK" : "LIPSA");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const USERNAME = process.env.X_USERNAME;

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

    const url = `https://nitter.net/${USERNAME}`;

    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 20000
    });

    const $ = cheerio.load(res.data);

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