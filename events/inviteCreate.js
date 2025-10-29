const { Events } = require('discord.js');

module.exports = {
    name: Events.InviteCreate,
    async execute(invite, client) {
        const guild = invite.guild;
        
        try {
            const invites = await guild.invites.fetch();
            client.invites = client.invites || new Map();
            client.invites.set(guild.id, invites);
        } catch (error) {
            console.error('Error updating invites cache:', error);
        }
    },
};
