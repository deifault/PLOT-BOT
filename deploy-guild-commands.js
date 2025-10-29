require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');

const commands = [];

const commandFolders = fs.readdirSync('./commands');

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        if (command.data && command.execute) {
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️  Skipped ${file}: Missing data or execute property`);
        }
    }
}

console.log(`\n📋 Loaded ${commands.length} commands total.`);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('\n🚀 Starting to deploy guild-specific commands...');

        if (!process.env.GUILD_ID) {
            console.error('❌ GUILD_ID not set in .env file!');
            return;
        }

        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        
        console.log(`✅ Successfully deployed ${data.length} guild commands to ${process.env.GUILD_ID}.`);
        console.log('⚡ Guild commands appear instantly in your server.');
        
    } catch (error) {
        console.error('❌ Error deploying guild commands:', error);
    }
})();
