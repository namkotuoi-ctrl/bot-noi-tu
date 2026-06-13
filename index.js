const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();
const express = require('express');
const axios = require('axios');

// Nạp thư viện từ vựng
let dictionary = new Set();
async function loadOnlineDictionary() {
    try {
        // Sử dụng nguồn từ vựng tiếng Anh phổ biến trên GitHub
        const url = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
        const response = await axios.get(url);
        const words = response.data.split(/\r?\n/);
        dictionary = new Set(words.map(w => w.toLowerCase().trim()).filter(w => w.length > 0));
        console.log(`Loaded ${dictionary.size} English words from online source.`);
    } catch (err) {
        console.error("Could not load online dictionary:", err.message);
    }
}
loadOnlineDictionary();

const app = express();
app.get('/', (req, res) => res.send('Bot is online!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Health check listening on port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let lastWord = ""; // Lưu tiếng cuối cùng của từ trước đó
let lastUserId = ""; // Ngăn một người tự nối từ của chính mình
let gameActive = false; // Trạng thái trò chơi
let scores = {}; // Lưu trữ điểm số: { userId: points }

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();

    // Admin Commands
    if (content === '!start' || content === '!stop') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("You do not have permission to use this command.");
        }

        if (content === '!start') {
            gameActive = true;
            lastWord = "";
            lastUserId = "";
            scores = {}; // Reset điểm khi bắt đầu game mới
            return message.reply("Word chain game has started! Send a 2-word phrase to begin.");
        } else {
            gameActive = false;
            return message.reply("Word chain game has been stopped.");
        }
    }

    // Leaderboard Command (Public)
    if (content === '!leaderboard' || content === '!lb') {
        const scoreEntries = Object.entries(scores);
        if (scoreEntries.length === 0) {
            return message.reply("The leaderboard is currently empty!");
        }

        const sorted = scoreEntries
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        let lbMsg = "**🏆 Leaderboard - Top 10 🏆**\n";
        sorted.forEach(([id, score], index) => {
            lbMsg += `${index + 1}. <@${id}>: ${score} points\n`;
        });
        return message.reply(lbMsg);
    }

    if (!gameActive) return;

    const words = content.split(/\s+/);

    if (words.length !== 2) {
        return message.delete().catch(() => {});
    }

    // Kiểm tra từ điển
    if (!dictionary.has(words[0]) || !dictionary.has(words[1])) {
        message.delete().catch(() => {});
        return message.reply("One or both words are not in our dictionary!")
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }

    if (lastWord === "") {
        // Lượt đầu tiên
        lastWord = words[1];
        lastUserId = message.author.id;
        scores[message.author.id] = (scores[message.author.id] || 0) + 1;
        message.react('✅');
        return;
    }

    if (message.author.id === lastUserId) {
        message.delete().catch(() => {});
        return message.reply("You cannot follow your own word!")
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }

    if (words[0] === lastWord) {
        // Nối đúng
        lastWord = words[1];
        lastUserId = message.author.id;
        scores[message.author.id] = (scores[message.author.id] || 0) + 1;
        message.react('✅');
    } else {
        // Nối sai
        message.delete().catch(() => {});
        message.reply(`Wrong! The next word must start with: **${lastWord}**`)
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }
});

client.login(process.env.DISCORD_TOKEN);