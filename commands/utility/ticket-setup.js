const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Setup the ticket system with an embed')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the ticket embed (default: current channel)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title for the ticket embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description for the ticket embed')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const title = interaction.options.getString('title') || '🎫 PLOT Support';
        const description = interaction.options.getString('description') || 
            'Need help? Click the button below to create a support ticket!\n\n' +
            '• One ticket per person at a time';

        try {
            const ticketEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(config.embedColor)
                .setTimestamp()
                .setFooter({ text: 'PLOT Support', iconURL: client.user.displayAvatarURL() });

            const ticketButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('🎫')
                        .setStyle(ButtonStyle.Primary)
                );

            await channel.send({
                embeds: [ticketEmbed],
                components: [ticketButton]
            });

            await interaction.reply({
                content: `✅ Ticket system setup complete in ${channel}!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error setting up ticket system:', error);
            await interaction.reply({
                content: '❌ Failed to setup ticket system. Please check my permissions.',
                ephemeral: true
            });
        }
    }
};
