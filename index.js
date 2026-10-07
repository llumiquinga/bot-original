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

// ========== COMANDOS DE BARRA ==========
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
  { name: 'leaderboard', description: '🏆 Los más ricos' },
  { name: 'ruleta', description: '🎡 Ruleta — rojo/negro/verde', options: [
    {name:'color',type:3,description:'Elige: rojo/negro/verde',required:true,choices:[
      {name:'Rojo',value:'rojo'},{name:'Negro',value:'negro'},{name:'Verde',value:'verde'}
    ]},
    {name:'apuesta',type:4,description:'Cantidad a apostar',required:true}
  ]},
  { name: 'dados', description: '🎲 Dados — par/impar/número', options: [
    {name:'opcion',type:3,description:'Par/Impar/Número(2-12)',required:true},
    {name:'apuesta',type:4,description:'Cantidad a apostar',required:true}
  ]},
  { name: 'gallos', description: '🐔 Pelea de gallos — apuesta a tu gallo', options: [
    {name:'gallos',type:3,description:'Gallo Rojo o Gallo Azul',required:true,choices:[
      {name:'Gallo Rojo 🔴',value:'rojo'},{name:'Gallo Azul 🔵',value:'azul'}
    ]},
    {name:'apuesta',type:4,description:'Cantidad a apostar',required:true}
  ]}
];

const rest = new REST({version:'10'}).setToken(TOKEN);
(async () => {
  try {
    console.log('🔄 Cargando comandos...');
    await rest.put(Routes.applicationCommands(client.user?.id??''), {body:commands});
    console.log('✅ ¡Todos los comandos listos!');
  } catch(e){console.error(e);}
})();

client.on('ready', () => {
  console.log(`✅ Encendido como ${client.user.tag}`);
});

// ========== AYUDANTES ==========
function getOrCreateUser(id) {
  const d = loadData();
  if (!d[id]) d[id] = { wallet:0, bank:0 };
  return d;
}

// ========== COMANDOS CON PREFIJO (!) ==========
client.on('messageCreate', async msg => {
  if (!msg.guild || msg.author.bot) return;
  const args = msg.content.trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  const uid = msg.author.id;
  const data = getOrCreateUser(uid);

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

  // !withdraw / !retirar
  if (['!withdraw','!retirar'].includes(cmd)) {
    let amt = args[0] === 'all' ? data[uid].bank : parseInt(args[0]);
    if (!amt || amt <= 0 || amt > data[uid].bank) return msg.reply('❌ Monto inválido');
    data[uid].bank -= amt;
    data[uid].wallet += amt;
    saveData(data);
    return msg.reply(`💵 Retiraste ${formatMoney(amt)} del banco ✅`);
  }

  // !pay / !pagar
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

  // !slots / !tragamonedas
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
      gan = Math.floor(ap*1.5);
    }
    if (gan > 0) data[uid].wallet += gan;
    saveData(data);
    return msg.reply(`🎰 | ${rod[0]} | ${rod[1]} | ${rod[2]} |\n${gan>0?`🎉 ¡Ganaste ${formatMoney(Math.floor(gan))}!`:'😢 Perdiste'}`);
  }

  // !ruleta
  if (cmd === '!ruleta') {
    const color = args[0]?.toLowerCase();
    const ap = parseInt(args[1]);
    if (!['rojo','negro','verde'].includes(color) || !ap || ap <= 0 || data[uid].wallet < ap)
      return msg.reply('❌ Uso: !ruleta rojo/negro/verde cantidad');
    data[uid].wallet -= ap;
    const res = Math.random() < 0.05 ? 'verde' : Math.random() < 0.5 ? 'rojo' : 'negro';
    let gan = 0;
    if (color === res) {
      gan = color === 'verde' ? ap*14 : ap*2;
      data[uid].wallet += gan;
    }
    saveData(data);
    const emoji = res==='rojo'?'🔴':res==='negro'?'⚫':'🟢';
    return msg.reply(`${emoji} Salió: ${res.toUpperCase()}\n${gan>0?`🎉 ¡Ganaste ${formatMoney(gan)}!`:'😢 Perdiste'}`);
  }

  // !dados
  if (cmd === '!dados') {
    const op = args[0]?.toLowerCase();
    const ap = parseInt(args[1]);
    const valido = ['par','impar','2','3','4','5','6','7','8','9','10','11','12'];
    if (!valido.includes(op) || !ap || ap <= 0 || data[uid].wallet < ap)
      return msg.reply('❌ Uso: !dados par/impar/número cantidad');
    data[uid].wallet -= ap;
    const d1 = Math.floor(Math.random()*6)+1;
    const d2 = Math.floor(Math.random()*6)+1;
    const total = d1+d2;
    let gan = 0;
    const acerto = op==='par' ? total%2===0 : op==='impar' ? total%2!==0 : parseInt(op)===total;
    if (acerto) {
      gan = ['2','12'].includes(op) ? ap*6 : ['3','11'].includes(op) ? ap*5 : ['4','5','9','10'].includes(op) ? ap*3 : ['6','7','8'].includes(op) ? ap*2.5 : ap*2;
      data[uid].wallet += Math.floor(gan);
    }
    saveData(data);
    return msg.reply(`🎲 Dado 1: ${d1} | Dado 2: ${d2} = **${total}**\n${acerto?`🎉 ¡Ganaste ${formatMoney(Math.floor(gan))}!`:'😢 Perdiste'}`);
  }

  // !gallos
  if (cmd === '!gallos') {
    const eleccion = args[0]?.toLowerCase();
    const ap = parseInt(args[1]);
    if (!['rojo','azul'].includes(eleccion) || !ap || ap <= 0 || data[uid].wallet < ap)
      return msg.reply('❌ Uso: !gallos rojo/azul cantidad');
    data[uid].wallet -= ap;
    const ganador = Math.random() < 0.5 ? 'rojo' : 'azul';
    let gan = 0;
    if (eleccion === ganador) {
      gan = ap*2;
      data[uid].wallet += gan;
    }
    saveData(data);
    const nom = ganador==='rojo'?'Gallo Rojo 🔴':'Gallo Azul 🔵';
    return msg.reply(`🐔 ¡Pelea! ⚔️\n🏆 Ganador: **${nom}**\n${eleccion===ganador?`🎉 ¡Acertaste! Ganaste ${formatMoney(gan)}!`:'😢 Perdiste'}`);
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

// ========== COMANDOS DE BARRA (/) ==========
client.on('interactionCreate', async int => {
  if (!int.isChatInputCommand()) return;
  const {commandName,user,options} = int;
  const uid = user.id;
  const data = getOrCreateUser(uid);

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

  if (commandName === 'ruleta') {
    const color = options.getString('color');
    const ap = options.getInteger('apuesta');
    if (!ap || ap <= 0 || data[uid].wallet < ap) return int.reply('❌ Saldo insuficiente');
    data[uid].wallet -= ap;
    const res = Math.random() < 0.05 ? 'verde' : Math.random() < 0.5 ? 'rojo' : 'negro';
    let gan = 0;
    if (color === res) {
      gan = color === 'verde' ? ap*14 : ap*2;
      data[uid].wallet += gan;
    }
    saveData(data);
    const emoji = res==='rojo'?'🔴':res==='negro'?'⚫':'🟢';
    return int.reply(`${emoji} Salió: ${res.toUpperCase()}\n${gan>0?`🎉 ¡Ganaste ${formatMoney(gan)}!`:'😢 Perdiste'}`);
  }

  if (commandName === 'dados') {
    const op = options.getString('opcion');
    const ap = options.getInteger('apuesta');
    if (!ap || ap <= 0 || data[uid].wallet < ap) return int.reply('❌ Saldo insuficiente');
    data[uid].wallet -= ap;
    const d1 = Math.floor(Math.random()*6)+1;
    const d2 = Math.floor(Math.random()*6)+1;
    const total = d1+d2;
    let gan = 0;
    const acerto = op==='par' ? total%2===0 : op==='impar' ? total%2!==0 : parseInt(op)===total;
    if (acerto) {
      gan = ['2','12'].includes(op) ? ap*6 : ['3','11'].includes(op) ? ap*5 : ['4','5','9','10'].includes(op) ? ap*3 : ap*2;
      data[uid].wallet += Math.floor(gan);
    }
    saveData(data);
    return int.reply(`🎲 Dado 1: ${d1} | Dado 2: ${d2} = **${total}**\n${acerto?`🎉 ¡Ganaste ${formatMoney(Math.floor(gan))}!`:'😢 Perdiste'}`);
  }

  if (commandName === 'gallos') {
    const eleccion = options.getString('gallos');
    const ap = options.getInteger('apuesta');
    if (!ap || ap <= 0 || data[uid].wallet < ap) return int.reply('❌ Saldo insuficiente');
    data[uid].wallet -= ap;
    const ganador = Math.random() < 0.5 ? 'rojo' : 'azul';
    let gan = 0;
    if (eleccion === ganador) {
      gan = ap*2;
      data[uid].wallet += gan;
    }
    saveData(data);
    const nom = ganador==='rojo'?'Gallo Rojo 🔴':'Gallo Azul 🔵';
    return int.reply(`🐔 ¡Pelea! ⚔️\n🏆 Ganador: **${nom}**\n${eleccion===ganador?`🎉 ¡Acertaste! Ganaste ${formatMoney(gan)}!`:'😢 Perdiste'}`);
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
