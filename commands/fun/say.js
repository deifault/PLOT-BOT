const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('What should the bot say?')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the message in (default: current channel)')
                .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('embed')
                        .setDescription('Send as an embed (default: false)')
                        .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const message = interaction.options.getString('message');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const useEmbed = interaction.options.getBoolean('embed') || false;
        
        try {
            if (useEmbed) {
                const embed = new EmbedBuilder()
                    .setDescription(message)
                    .setColor(config.embedColor)
                    .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
                
                await channel.send({ embeds: [embed] });
            } else {
                await channel.send(message);
            }
            
            await interaction.reply({
                content: `✅ Message sent to ${channel}`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error sending message:', error);
            await interaction.reply({
                content: '❌ Failed to send message. Check my permissions in that channel.',
                ephemeral: true
            });
        }
    }
};
