require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
        console.log('\n🚀 Starting to deploy application (/) commands...');

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log(`✅ Successfully deployed ${data.length} global commands.`);
        console.log('⏰ Global commands may take up to 1 hour to appear in all servers.');

        console.log('\n🎉 Command deployment completed!');
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        
        if (error.code === 50001) {
            console.log('\n💡 Tip: Make sure your bot has the "applications.commands" scope when inviting it to your server.');
        }
        
        if (error.code === 401) {
            console.log('\n💡 Tip: Check your DISCORD_TOKEN in the .env file.');
        }
        
        if (error.code === 404) {
            console.log('\n💡 Tip: Check your CLIENT_ID and GUILD_ID in the .env file.');
        }
    }
})();
