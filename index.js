const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();
const express = require('express');

// Tạo server HTTP đơn giản để Render không kill process
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
            return message.reply("Word chain game has started! Send a 2-word phrase to begin.");
        } else {
            gameActive = false;
            return message.reply("Word chain game has been stopped.");
        }
    }

    if (!gameActive) return;

    const words = content.split(/\s+/);

    if (words.length !== 2) return;

    if (lastWord === "") {
        // Lượt đầu tiên
        lastWord = words[1];
        lastUserId = message.author.id;
        message.react('✅');
        return;
    }

    if (message.author.id === lastUserId) {
        return message.reply("You cannot follow your own word!");
    }

    if (words[0] === lastWord) {
        // Nối đúng
        lastWord = words[1];
        lastUserId = message.author.id;
        message.react('✅');
    } else {
        // Nối sai
        message.reply(`Wrong! The next word must start with: **${lastWord}**`);
        message.react('❌');
    }
});

client.login(process.env.DISCORD_TOKEN);