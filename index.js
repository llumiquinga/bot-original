const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
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

function getUserData(id) {
  const d = loadData();
  if (!d[id]) d[id] = { wallet: 0, bank: 0 };
  return d[id];
}

function formatMoney(n) {
  return `$${n.toLocaleString()}`;
}

// Comandos de barra
const commands = [
  { name: 'balance', description: '💰 Ver tu saldo' },
  { name: 'daily', description: '🎁 Bono diario' },
  { name: 'work', description: '💼 Trabajar por dinero' },
  { name: 'deposit', description: '🏦 Depositar al banco', options: [{name:'cantidad',type:4,description:'Monto',required:true}] },
  { name: 'withdraw', description: '💵 Retirar del banco', options: [{name:'cantidad',type:4,description:'Monto',required:true}] },
  { name: 'pay', description: '💸 Enviar dinero', options: [
    {name:'usuario',type:6,description:'A quién',required:true},
    {name:'cantidad',type:4,description:'Cuánto',required:true}
  ]},
  { name: 'crime', description: '🔨 Delinquir — riesgo alto' },
  { name: 'slots', description: '🎰 Tragamonedas', options: [{name:'apuesta',type:4,description:'Monto',required:true}] },
  { name: 'leaderboard', description: '🏆 Los más ricos del servidor' }
];

const rest = new REST({version:'10'}).setToken(TOKEN);
(async () => {
  try {
    console.log('🔄 Cargando comandos...');
    await rest.put(Routes.applicationCommands(client.user?.id??''), {body:commands});
    console.log('✅ Todos los comandos registrados!');
  } catch(e){console.error(e);}
})();

client.on('ready', () => {
  console.log(`✅ Encendido como ${client.user.tag}`);
});

// ============= COMANDOS CON PREFIJO (!) =============
client.on('messageCreate', async msg => {
  if (!msg.guild || msg.author.bot) return;
  const args = msg.content.trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  const uid = msg.author.id;
  const data = loadData();
  if (!data[uid]) data[uid] = { wallet:0, bank:0 };

  // !balance / !saldo
  if (['!balance','!saldo'].includes(cmd)) {
    const u = getUserData(uid);
    return msg.reply({embeds:[new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`💰 Saldo de ${msg.author.username}`)
      .addFields(
        {name:'💵 Cartera',value:formatMoney(u.wallet),inline:true},
        {name:'🏦 Banco',value:formatMoney(u.bank),inline:true},
        {name:'💎 Total',value:formatMoney(u.wallet+u.bank),inline:true}
      )
      .setFooter({text:'Original ✌️ — Economía'})
    ]});
  }

  // !daily / !diario
  if (['!daily','!diario'].includes(cmd)) {
    const last = data[uid].lastDaily || 0;
    const cd = 24*60*60*1000;
    if (Date.now()-last < cd) {
      const h = Math.ceil((cd-(Date.now()-last))/3600000);
      return msg.reply(`⏰ Ya reclamaste! Vuelve en ${h} horas`);
    }
    data[uid].wallet += 150;
    data[uid].lastDaily = Date.now();
    saveData(data);
    return msg.reply(`🎉 ¡Bono diario! +$150 💵`);
  }

  // !work
  if (cmd === '!work') {
    const last = data[uid].lastWork || 0;
    const cd = 4*60*60*1000;
    if (Date.now()-last < cd) {
      const m = Math.ceil((cd-(Date.now()-last))/60000);
      return msg.reply(`⏰ Descansa! Vuelve en ${m} minutos`);
    }
    const gan = Math.floor(Math.random()*231)+20;
    data[uid].wallet += gan;
    data[uid].lastWork = Date.now();
    saveData(data);
    return msg.reply(`💼 ¡Trabajaste bien! Ganaste ${formatMoney(gan)} 💵`);
  }

  // !deposit
  if (cmd === '!deposit') {
    let amt = args[0] === 'all' ? data[uid].wallet : parseInt(args[0]);
    if (!amt || amt <= 0 || amt > data[uid].wallet) return msg.reply('❌ Monto inválido');
    data[uid].wallet -= amt;
    data[uid].bank += amt;
    saveData(data);
    return msg.reply(`🏦 Depositaste ${formatMoney(amt)} al banco ✅`);
  }

  // !withdraw
  if (['!withdraw','!retirar'].includes(cmd)) {
    let amt = args[0] === 'all' ? data[uid].bank : parseInt(args[0]);
    if (!amt || amt <= 0 || amt > data[uid].bank) return msg.reply('❌ Monto inválido');
    data[uid].bank -= amt;
    data[uid].wallet += amt;
    saveData(data);
    return msg.reply(`💵 Retiraste ${formatMoney(amt)} del banco ✅`);
  }

  // !pay
  if (['!pay','!pagar'].includes(cmd)) {
    const quien = msg.mentions.users.first();
    const amt = parseInt(args[1]);
    if (!quien || !amt || amt <= 0 || data[uid].wallet < amt)
      return msg.reply('❌ Uso: !pay @usuario cantidad');
    if (!data[quien.id]) data[quien.id] = {wallet:0,bank:0};
    data[uid].wallet -= amt;
    data[quien.id].wallet += amt;
    saveData(data);
    return msg.reply(`💸 Le enviaste ${formatMoney(amt)} a ${quien.username} ✅`);
  }

  // !crime
  if (cmd === '!crime') {
    const last = data[uid].lastCrime || 0;
    const cd = 2*60*60*1000;
    if (Date.now()-last < cd) {
      const m = Math.ceil((cd-(Date.now()-last))/60000);
      return msg.reply(`⏰ Demasiado arriesgado! Vuelve en ${m} minutos`);
    }
    data[uid].lastCrime = Date.now();
    if (Math.random() < 0.6) {
      const multa = Math.floor(data[uid].wallet*(Math.random()*0.2+0.2));
      data[uid].wallet = Math.max(0, data[uid].wallet - multa);
      saveData(data);
      return msg.reply(`🚔 ¡Te atraparon! Pierdes ${formatMoney(multa)} ⚖️`);
    } else {
      const gan = Math.floor(Math.random()*451)+250;
      data[uid].wallet += gan;
      saveData(data);
      return msg.reply(`🔨 ¡Lo lograste! Ganaste ${formatMoney(gan)} 💰`);
    }
  }

  // !slots
  if (['!slots','!tragamonedas'].includes(cmd)) {
    const ap = parseInt(args[0]);
    if (!ap || ap <= 0 || data[uid].wallet < ap)
      return msg.reply('❌ Uso: !slots cantidad');
    data[uid].wallet -= ap;
    const sym = ['🍒','🍋','🍊','🍇','💎','7️⃣'];
    const rod = [sym[Math.floor(Math.random()*sym.length)], sym[Math.floor(Math.random()*sym.length)], sym[Math.floor(Math.random()*sym.length)]];
    let gan = 0;
    if (rod[0] === rod[1] && rod[1] === rod[2]) {
      gan = rod[0] === '💎' ? ap*10 : rod[0] === '7️⃣' ? ap*5 : ap*3;
    } else if (rod[0] === rod[1] || rod[1] === rod[2]) {
      gan = ap*1.5;
    }
    if (gan > 0) data[uid].wallet += Math.floor(gan);
    saveData(data);
    return msg.reply(`🎰 | ${rod[0]} | ${rod[1]} | ${rod[2]} |\n${gan>0?`🎉 ¡Ganaste ${formatMoney(Math.floor(gan))}!`:'😢 Perdiste'}`);
  }

  // !leaderboard / !lb
  if (['!leaderboard','!lb'].includes(cmd)) {
    const todos = Object.entries(loadData())
      .map(([id,d])=>({id,total:d.wallet+d.bank}))
      .sort((a,b)=>b.total-a.total).slice(0,10);
    let txt = '';
    for(let i=0;i<todos.length;i++){
      txt += `${i+1}. <@${todos[i].id}> — ${formatMoney(todos[i].total)}\n`;
    }
    return msg.reply({embeds:[new EmbedBuilder()
      .setColor('#FFD700').setTitle('🏆 Los más ricos').setDescription(txt||'Sin datos')
    ]});
  }
});

// ============= COMANDOS DE BARRA (/) =============
client.on('interactionCreate', async int => {
  if (!int.isChatInputCommand()) return;
  const {commandName,user,options} = int;
  const uid = user.id;
  const data = loadData();
  if (!data[uid]) data[uid] = { wallet:0, bank:0 };

  if (commandName === 'balance') {
    const u = getUserData(uid);
    return int.reply({embeds:[new EmbedBuilder()
      .setColor('#FFD700').setTitle(`💰 Saldo de ${user.username}`)
      .addFields(
        {name:'💵 Cartera',value:formatMoney(u.wallet),inline:true},
        {name:'🏦 Banco',value:formatMoney(u.bank),inline:true},
        {name:'💎 Total',value:formatMoney(u.wallet+u.bank),inline:true}
      )
      .setFooter({text:'Original ✌️ — Economía'})
    ]});
  }

  if (commandName === 'daily') {
    const last = data[uid].lastDaily || 0;
    const cd = 24*60*60*1000;
    if (Date.now()-last < cd) {
      const h = Math.ceil((cd-(Date.now()-last))/3600000);
      return int.reply(`⏰ Ya reclamaste! Vuelve en ${h} horas`);
    }
    data[uid].wallet += 150;
    data[uid].lastDaily = Date.now();
    saveData(data);
    return int.reply(`🎉 ¡Bono diario! +$150 💵`);
  }

  if (commandName === 'work') {
    const last = data[uid].lastWork || 0;
    const cd = 4*60*60*1000;
    if (Date.now()-last < cd) {
      const m = Math.ceil((cd-(Date.now()-last))/60000);
      return int.reply(`⏰ Descansa! Vuelve en ${m} minutos`);
    }
    const gan = Math.floor(Math.random()*231)+20;
    data[uid].wallet += gan;
    data[uid].lastWork = Date.now();
    saveData(data);
    return int.reply(`💼 ¡Trabajaste bien! Ganaste ${formatMoney(gan)} 💵`);
  }

  if (commandName === 'deposit') {
    let amt = options.getInteger('cantidad');
    if (amt === -1) amt = data[uid].wallet;
    if (!amt || amt <= 0 || amt > data[uid].wallet) return int.reply('❌ Monto inválido');
    data[uid].wallet -= amt; data[uid].bank += amt; saveData(data);
    return int.reply(`🏦 Depositaste ${formatMoney(amt)} al banco ✅`);
  }

  if (commandName === 'withdraw') {
    let amt = options.getInteger('cantidad');
    if (amt === -1) amt = data[uid].bank;
    if (!amt || amt <= 0 || amt > data[uid].bank) return int.reply('❌ Monto inválido');
    data[uid].bank -= amt; data[uid].wallet += amt; saveData(data);
    return int.reply(`💵 Retiraste ${formatMoney(amt)} del banco ✅`);
  }

  if (commandName === 'pay') {
    const quien = options.getUser('usuario');
    const amt = options.getInteger('cantidad');
    if (!quien || !amt || amt <= 0 || data[uid].wallet < amt)
      return int.reply('❌ Datos inválidos');
    if (!data[quien.id]) data[quien.id] = {wallet:0,bank:0};
    data[uid].wallet -= amt; data[quien.id].wallet += amt; saveData(data);
    return int.reply(`💸 Le enviaste ${formatMoney(amt)} a ${quien.username} ✅`);
  }

  if (commandName === 'crime') {
    const last = data[uid].lastCrime || 0;
    const cd = 2*60*60*1000;
    if (Date.now()-last < cd) {
      const m = Math.ceil((cd-(Date.now()-last))/60000);
      return int.reply(`⏰ Demasiado arriesgado! Vuelve en ${m} minutos`);
    }
    data[uid].lastCrime = Date.now();
    if (Math.random() < 0.6) {
      const multa = Math.floor(data[uid].wallet*(Math.random()*0.2+0.2));
      data[uid].wallet = Math.max(0, data[uid].wallet - multa);
      saveData(data);
      return int.reply(`🚔 ¡Te atraparon! Pierdes ${formatMoney(multa)} ⚖️`);
    } else {
      const gan = Math.floor(Math.random()*451)+250;
      data[uid].wallet += gan;
      saveData(data);
      return int.reply(`🔨 ¡Lo lograste! Ganaste ${formatMoney(gan)} 💰`);
    }
  }

  if (commandName === 'slots') {
    const ap = options.getInteger('apuesta');
    if (!ap || ap <= 0 || data[uid].wallet < ap)
      return int.reply('❌ Monto inválido');
    data[uid].wallet -= ap;
    const sym = ['🍒','🍋','🍊','🍇','💎','7️⃣'];
    const rod = [sym[Math.floor(Math.random()*sym.length)], sym[Math.floor(Math.random()*sym.length)], sym[Math.floor(Math.random()*sym.length)]];
    let gan = 0;
    if (rod[0] === rod[1] && rod[1] === rod[2]) {
      gan = rod[0] === '💎' ? ap*10 : rod[0] === '7️⃣' ? ap*5 : ap*3;
    } else if (rod[0] === rod[1] || rod[1] === rod[2]) {
      gan = Math.floor(ap*1.5);
    }
    if (gan > 0) data[uid].wallet += gan;
    saveData(data);
    return int.reply(`🎰 | ${rod[0]} | ${rod[1]} | ${rod[2]} |\n${gan>0?`🎉 ¡Ganaste ${formatMoney(gan)}!`:'😢 Perdiste'}`);
  }

  if (commandName === 'leaderboard') {
    const todos = Object.entries(loadData())
      .map(([id,d])=>({id,total:d.wallet+d.bank}))
      .sort((a,b)=>b.total-a.total).slice(0,10);
    let txt = '';
    for(let i=0;i<todos.length;i++) txt += `${i+1}. <@${todos[i].id}> — ${formatMoney(todos[i].total)}\n`;
    return int.reply({embeds:[new EmbedBuilder()
      .setColor('#FFD700').setTitle('🏆 Los más ricos').setDescription(txt||'Sin datos')
    ]});
  }
});

client.login(TOKEN).catch(e=>console.error('❌ Error:',e));
