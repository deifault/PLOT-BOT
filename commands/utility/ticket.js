const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const config = require('../../config');
const TranscriptGenerator = require('../../utils/transcriptGenerator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add to the ticket')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove from the ticket')
                        .setRequired(true))),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'close':
                await this.closeTicket(interaction, client);
                break;
            case 'add':
                await this.addUser(interaction, client);
                break;
            case 'remove':
                await this.removeUser(interaction, client);
                break;
        }
    },
    
    async closeTicket(interaction, client) {
        const channel = interaction.channel;
        const user = interaction.user;
        
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: '❌ This command can only be used in ticket channels.',
                ephemeral: true
            });
        }
        
        const member = await interaction.guild.members.fetch(user.id);
        const hasStaffRole = config.staffRoleId && member.roles.cache.has(config.staffRoleId);
        const canClose = member.permissions.has(PermissionFlagsBits.ManageChannels) || 
                        hasStaffRole ||
                        channel.name === `ticket-${user.username.toLowerCase()}`;
        
        if (!canClose) {
            return interaction.reply({
                content: '❌ You don\'t have permission to close this ticket.',
                ephemeral: true
            });
        }
        
        try {
            await client.db.closeTicket(channel.id);
            
            await interaction.reply('🔒 Generating transcript and closing ticket...');
            
            // Generate HTML transcript
            const transcriptGenerator = new TranscriptGenerator();
            const transcriptBuffer = await transcriptGenerator.generateTranscript(channel, client);
            
            // Send transcript to transcript channel
            const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptChannelId);
            if (transcriptChannel) {
                const attachment = new AttachmentBuilder(transcriptBuffer, {
                    name: `transcript-${channel.name}-${Date.now()}.html`
                });
                
                const transcriptEmbed = new EmbedBuilder()
                    .setTitle('🎯 Ticket Transcript')
                    .setDescription(`Transcript for **${channel.name}**`)
                    .setColor(config.embedColor)
                    .addFields([
                        { name: '🔒 Closed by', value: `${user}`, inline: true },
                        { name: '🎫 Channel', value: channel.name, inline: true }
                    ])
                    .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await transcriptChannel.send({
                    embeds: [transcriptEmbed],
                    files: [attachment]
                });
            }
            
            // Delete channel after a short delay
            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (error) {
                    console.error('Error deleting ticket channel:', error);
                }
            }, 3000);
            
        } catch (error) {
            console.error('Error closing ticket:', error);
            await interaction.reply({
                content: '❌ Failed to close ticket. Please try again later.',
                ephemeral: true
            });
        }
    },
    
    async addUser(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const channel = interaction.channel;
        
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: '❌ This command can only be used in ticket channels.',
                ephemeral: true
            });
        }
        
        // Everyone can add users to tickets
        
        try {
            await channel.permissionOverwrites.create(targetUser, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            
            await interaction.reply(`✅ Added ${targetUser} to the ticket.`);
            
        } catch (error) {
            console.error('Error adding user to ticket:', error);
            await interaction.reply({
                content: '❌ Failed to add user to ticket.',
                ephemeral: true
            });
        }
    },
    
    async removeUser(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const channel = interaction.channel;
        
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: '❌ This command can only be used in ticket channels.',
                ephemeral: true
            });
        }
        
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const hasStaffRole = config.staffRoleId && member.roles.cache.has(config.staffRoleId);
        if (!member.permissions.has(PermissionFlagsBits.ManageChannels) && !hasStaffRole) {
            return interaction.reply({
                content: '❌ You don\'t have permission to remove users from tickets.',
                ephemeral: true
            });
        }
        
        try {
            await channel.permissionOverwrites.delete(targetUser);
            
            await interaction.reply(`✅ Removed ${targetUser} from the ticket.`);
            
        } catch (error) {
            console.error('Error removing user from ticket:', error);
            await interaction.reply({
                content: '❌ Failed to remove user from ticket.',
                ephemeral: true
            });
        }
    }
};