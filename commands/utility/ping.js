const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and response time'),
    
    async execute(interaction, client) {
        const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
        
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(config.embedColor)
            .addFields([
                { name: '📡 Websocket Heartbeat', value: `${client.ws.ping}ms`, inline: true },
                { name: '🔄 Roundtrip Latency', value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, inline: true },
                { name: '⏰ Uptime', value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true }
            ])
            .setTimestamp()
            .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
        
        await interaction.editReply({ content: null, embeds: [embed] });
    }
};
