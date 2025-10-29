const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete messages in bulk')
        .addSubcommand(subcommand =>
            subcommand
                .setName('amount')
                .setDescription('Delete a specific number of messages')
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of messages to delete (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Delete messages from a specific user')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('User whose messages to delete')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of messages to search through (default: 50)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bots')
                .setDescription('Delete messages from bots')
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of messages to search through (default: 50)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('contains')
                .setDescription('Delete messages containing specific text')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Text to search for in messages')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of messages to search through (default: 50)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        // Check if bot has permission to manage messages
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ I don\'t have permission to manage messages in this channel.',
                ephemeral: true
            });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            let messages;
            let deletedCount = 0;
            
            switch (subcommand) {
                case 'amount':
                    deletedCount = await this.purgeAmount(interaction, client);
                    break;
                case 'user':
                    deletedCount = await this.purgeUser(interaction, client);
                    break;
                case 'bots':
                    deletedCount = await this.purgeBots(interaction, client);
                    break;
                case 'contains':
                    deletedCount = await this.purgeContains(interaction, client);
                    break;
            }
            
            // Log the purge action
            await client.db.addModLog(
                interaction.guild.id,
                interaction.user.id,
                interaction.user.id,
                'purge',
                `Deleted ${deletedCount} messages in ${interaction.channel.name}`
            );
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('🧹 Messages Purged')
                .setColor('#00ff00')
                .addFields([
                    { name: '📊 Messages Deleted', value: `${deletedCount}`, inline: true },
                    { name: '📍 Channel', value: `${interaction.channel}`, inline: true },
                    { name: '👮 Moderator', value: `${interaction.user}`, inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Log to moderation channel
            const modLogChannel = interaction.guild.channels.cache.get(config.modLogChannelId);
            if (modLogChannel && modLogChannel.id !== interaction.channel.id) {
                await modLogChannel.send({ embeds: [successEmbed] });
            }
            
        } catch (error) {
            console.error('Error purging messages:', error);
            await interaction.editReply({
                content: '❌ Failed to purge messages. Please try again.'
            });
        }
    },
    
    async purgeAmount(interaction, client) {
        const count = interaction.options.getInteger('count');
        
        const messages = await interaction.channel.messages.fetch({ limit: count });
        const filteredMessages = messages.filter(msg => Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
        
        if (filteredMessages.size === 0) {
            await interaction.editReply('❌ No messages found to delete (messages must be less than 14 days old).');
            return 0;
        }
        
        await interaction.channel.bulkDelete(filteredMessages, true);
        return filteredMessages.size;
    },
    
    async purgeUser(interaction, client) {
        const targetUser = interaction.options.getUser('target');
        const searchCount = interaction.options.getInteger('count') || 50;
        
        const messages = await interaction.channel.messages.fetch({ limit: searchCount });
        const userMessages = messages.filter(msg => 
            msg.author.id === targetUser.id && 
            Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
        );
        
        if (userMessages.size === 0) {
            await interaction.editReply(`❌ No messages found from ${targetUser.tag} in the last ${searchCount} messages.`);
            return 0;
        }
        
        await interaction.channel.bulkDelete(userMessages, true);
        return userMessages.size;
    },
    
    async purgeBots(interaction, client) {
        const searchCount = interaction.options.getInteger('count') || 50;
        
        const messages = await interaction.channel.messages.fetch({ limit: searchCount });
        const botMessages = messages.filter(msg => 
            msg.author.bot && 
            Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
        );
        
        if (botMessages.size === 0) {
            await interaction.editReply(`❌ No bot messages found in the last ${searchCount} messages.`);
            return 0;
        }
        
        await interaction.channel.bulkDelete(botMessages, true);
        return botMessages.size;
    },
    
    async purgeContains(interaction, client) {
        const searchText = interaction.options.getString('text').toLowerCase();
        const searchCount = interaction.options.getInteger('count') || 50;
        
        const messages = await interaction.channel.messages.fetch({ limit: searchCount });
        const containingMessages = messages.filter(msg => 
            msg.content.toLowerCase().includes(searchText) && 
            Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
        );
        
        if (containingMessages.size === 0) {
            await interaction.editReply(`❌ No messages containing "${searchText}" found in the last ${searchCount} messages.`);
            return 0;
        }
        
        await interaction.channel.bulkDelete(containingMessages, true);
        return containingMessages.size;
    }
};
