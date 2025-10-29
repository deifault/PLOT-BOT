const { Events, EmbedBuilder, ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        
        // Set bot status to Do Not Disturb
        client.user.setStatus('dnd');
        
        if (config.statusMessages.length > 0) {
            const status = config.statusMessages[0];
            client.user.setActivity(status.name, { type: ActivityType[status.type] });
        }
        
        client.giveawayManager.start();

        for (const guild of client.guilds.cache.values()) {
            try {
                const invites = await guild.invites.fetch();
                client.invites = client.invites || new Map();
                client.invites.set(guild.id, invites);
            } catch (error) {
                console.error(`Failed to fetch invites for guild ${guild.name}:`, error);
            }
        }

        console.log('Bot is fully ready and operational!');
    },
};
