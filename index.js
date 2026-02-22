require("dotenv").config();

const fs = require("fs");
const axios = require("axios");
const xml2js = require("xml2js");
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
  setInterval(checkTweets, 30000); // 30 sec
});

async function checkTweets() {
  try {
    console.log("🔍 Verificare RSS...");

    const url = `https://nitter.net/${USERNAME}/rss`;

    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 20000
    });

    const parser = new xml2js.Parser();
    const feed = await parser.parseStringPromise(res.data);

    const items = feed.rss.channel[0].item;

    if (!items || !items.length) {
      console.log("⚠️ RSS gol");
      return;
    }

    const latest = items[0];
    const link = latest.link[0];

    console.log("📌 Ultimul tweet:", link);

    if (link !== lastTweet) {
      console.log("🆕 Tweet nou!");

      lastTweet = link;
      fs.writeFileSync("lastTweet.txt", lastTweet);

      const channel = await client.channels.fetch(CHANNEL_ID);

      await channel.send(
        `🆕 **New post from ${USERNAME}**\n${link}`
      );

      console.log("✅ Postat pe Discord");

    } else {
      console.log("ℹ️ Nimic nou");
    }

  } catch (err) {
    console.error("❌ Eroare RSS:", err.message);
  }
}

client.login(process.env.DISCORD_TOKEN);