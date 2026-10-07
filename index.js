const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const DATA_FILE = path.join(__dirname, 'economy-data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getUserData(userId) {
  const data = loadData();
  if (!data[userId]) {
    data[userId] = { wallet: 0, bank: 0 };
  }
  return data[userId];
}

client.on('ready', () => {
  console.log(`✅ Bot encendido como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === '!balance' || command === '!saldo') {
    const userData = getUserData(message.author.id);
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`💰 Saldo de ${message.author.username}`)
      .addFields(
        { name: '💵 Cartera', value: `$${userData.wallet}`, inline: true },
        { name: '🏦 Banco', value: `$${userData.bank}`, inline: true },
        { name: '💎 Total', value: `$${userData.wallet + userData.bank}`, inline: true }
      )
      .setFooter({ text: 'Original ✌️ — Economía' });
    return message.reply({ embeds: [embed] });
  }

  if (command === '!daily' || command === '!diario') {
    const data = loadData();
    const now = Date.now();
    const lastDaily = data[message.author.id]?.lastDaily || 0;
    const cooldown = 24 * 60 * 60 * 1000;
    
    if (now - lastDaily < cooldown) {
      const hours = Math.ceil((cooldown - (now - lastDaily)) / (1000 * 60 * 60));
      return message.reply(`⏰ Ya reclamaste hoy! Vuelve en ${hours} horas`);
    }
    
    if (!data[message.author.id]) data[message.author.id] = { wallet: 0, bank: 0 };
    data[message.author.id].wallet += 150;
    data[message.author.id].lastDaily = now;
    saveData(data);
    
    return message.reply(`🎉 ¡Reclamaste tu bono diario! Recibiste $150 💵`);
  }
});

client.login(TOKEN).catch(err => {
  console.error('❌ Error al encender el bot:', err);
});
