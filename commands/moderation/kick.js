const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const moderator = interaction.user;
        const guild = interaction.guild;
        
        try {
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            
            if (!targetMember) {
                return interaction.reply({
                    content: '❌ User not found in this server.',
                    ephemeral: true
                });
            }
            
            if (!targetMember.kickable) {
                return interaction.reply({
                    content: '❌ I cannot kick this user. They may have higher permissions than me.',
                    ephemeral: true
                });
            }
            
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    content: '❌ You cannot kick someone with equal or higher role than you.',
                    ephemeral: true
                });
            }
            
            // Kick the user
            await targetMember.kick(`${moderator.tag}: ${reason}`);
            
            // Log to database
            await client.db.addModLog(guild.id, targetUser.id, moderator.id, 'kick', reason);
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('👢 User Kicked')
                .setColor('#ff9900')
                .addFields([
                    { name: '👤 User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: '👮 Moderator', value: `${moderator.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
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
            console.error('Error kicking user:', error);
            await interaction.reply({
                content: '❌ Failed to kick user. Please check my permissions and try again.',
                ephemeral: true
            });
        }
    }
};
