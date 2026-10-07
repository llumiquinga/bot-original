const { Client, GatewayIntentBits, Collection, EmbedBuilder, REST, Routes } = require('discord.js');
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
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getUserData(userId) {
  const data = loadData();
  if (!data[userId]) data[userId] = { wallet: 0, bank: 0 };
  return data[userId];
}

// Comandos de barra
const commands = [
  {
    name: 'balance',
    description: '💰 Ver tu saldo de dinero'
  },
  {
    name: 'daily',
    description: '🎁 Reclamar tu bono diario'
  },
  {
    name: 'saldo',
    description: '💰 Ver tu saldo (igual que /balance)'
  },
  {
    name: 'diario',
    description: '🎁 Reclamar bono diario (igual que /daily)'
  }
];

// Registrar comandos de barra
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔄 Registrando comandos...');
    await rest.put(
      Routes.applicationCommands(client.user?.id || ''),
      { body: commands }
    );
    console.log('✅ Comandos de barra listos!');
  } catch (e) { console.error(e); }
})();

client.on('ready', () => {
  console.log(`✅ Bot encendido como ${client.user.tag}`);
});

// Comandos con prefijo (!)
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();

  if (['!balance', '!saldo'].includes(cmd)) {
    const u = getUserData(message.author.id);
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`💰 Saldo de ${message.author.username}`)
      .addFields(
        { name: '💵 Cartera', value: `$${u.wallet}`, inline: true },
        { name: '🏦 Banco', value: `$${u.bank}`, inline: true },
        { name: '💎 Total', value: `$${u.wallet + u.bank}`, inline: true }
      )
      .setFooter({ text: 'Original ✌️ — Economía' });
    return message.reply({ embeds: [embed] });
  }

  if (['!daily', '!diario'].includes(cmd)) {
    const data = loadData();
    const now = Date.now();
    const last = data[message.author.id]?.lastDaily || 0;
    const cd = 24 * 60 * 60 * 1000;
    
    if (now - last < cd) {
      const h = Math.ceil((cd - (now - last)) / 3600000);
      return message.reply(`⏰ Ya reclamaste! Vuelve en ${h} horas`);
    }
    
    if (!data[message.author.id]) data[message.author.id] = { wallet: 0, bank: 0 };
    data[message.author.id].wallet += 150;
    data[message.author.id].lastDaily = now;
    saveData(data);
    return message.reply(`🎉 ¡Bono diario! Recibiste $150 💵`);
  }
});

// Comandos de barra (/)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;

  if (['balance', 'saldo'].includes(commandName)) {
    const u = getUserData(user.id);
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`💰 Saldo de ${user.username}`)
      .addFields(
        { name: '💵 Cartera', value: `$${u.wallet}`, inline: true },
        { name: '🏦 Banco', value: `$${u.bank}`, inline: true },
        { name: '💎 Total', value: `$${u.wallet + u.bank}`, inline: true }
      )
      .setFooter({ text: 'Original ✌️ — Economía' });
    return interaction.reply({ embeds: [embed] });
  }

  if (['daily', 'diario'].includes(commandName)) {
    const data = loadData();
    const now = Date.now();
    const last = data[user.id]?.lastDaily || 0;
    const cd = 24 * 60 * 60 * 1000;
    
    if (now - last < cd) {
      const h = Math.ceil((cd - (now - last)) / 3600000);
      return interaction.reply(`⏰ Ya reclamaste hoy! Vuelve en ${h} horas`, { ephemeral: false });
    }
    
    if (!data[user.id]) data[user.id] = { wallet: 0, bank: 0 };
    data[user.id].wallet += 150;
    data[user.id].lastDaily = now;
    saveData(data);
    return interaction.reply(`🎉 ¡Bono diario reclamado! +$150 💵`);
  }
});

client.login(TOKEN).catch(err => console.error('❌ Error:', err));
