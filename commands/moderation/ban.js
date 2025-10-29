const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('delete_messages')
                .setDescription('Delete messages from the last 7 days')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessages = interaction.options.getBoolean('delete_messages') || false;
        const moderator = interaction.user;
        const guild = interaction.guild;
        
        try {
            // Check if user is bannable
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            
            if (targetMember) {
                if (!targetMember.bannable) {
                    return interaction.reply({
                        content: '❌ I cannot ban this user. They may have higher permissions than me.',
                        ephemeral: true
                    });
                }
                
                if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                    return interaction.reply({
                        content: '❌ You cannot ban someone with equal or higher role than you.',
                        ephemeral: true
                    });
                }
            }
            
            // Ban the user
            await guild.members.ban(targetUser, {
                deleteMessageSeconds: deleteMessages ? 7 * 24 * 60 * 60 : 0,
                reason: `${moderator.tag}: ${reason}`
            });
            
            // Log to database
            await client.db.addModLog(guild.id, targetUser.id, moderator.id, 'ban', reason);
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('🔨 User Banned')
                .setColor('#ff0000')
                .addFields([
                    { name: '👤 User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: '👮 Moderator', value: `${moderator.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '🗑️ Messages Deleted', value: deleteMessages ? 'Yes (7 days)' : 'No', inline: true }
                ])
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Log to moderation channel
            const modLogChannel = guild.channels.cache.get(config.modLogChannelId);
            if (modLogChannel) {
                await modLogChannel.send({ embeds: [successEmbed] });
            }
            
        } catch (error) {
            console.error('Error banning user:', error);
            await interaction.reply({
                content: '❌ Failed to ban user. Please check my permissions and try again.',
                ephemeral: true
            });
        }
    }
};
