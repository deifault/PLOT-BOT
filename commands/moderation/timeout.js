const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to timeout')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of timeout (e.g., 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
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
            
            if (!targetMember.moderatable) {
                return interaction.reply({
                    content: '❌ I cannot timeout this user. They may have higher permissions than me.',
                    ephemeral: true
                });
            }
            
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    content: '❌ You cannot timeout someone with equal or higher role than you.',
                    ephemeral: true
                });
            }
            
            // Parse duration
            const timeoutDuration = ms(duration);
            if (!timeoutDuration || timeoutDuration > 28 * 24 * 60 * 60 * 1000) {
                return interaction.reply({
                    content: '❌ Invalid duration. Maximum timeout is 28 days. Use formats like: 10m, 1h, 1d',
                    ephemeral: true
                });
            }
            
            // Timeout the user
            await targetMember.timeout(timeoutDuration, `${moderator.tag}: ${reason}`);
            
            // Log to database
            await client.db.addModLog(guild.id, targetUser.id, moderator.id, 'timeout', reason, timeoutDuration);
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('⏰ User Timed Out')
                .setColor('#ffaa00')
                .addFields([
                    { name: '👤 User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: '👮 Moderator', value: `${moderator.tag}`, inline: true },
                    { name: '⏱️ Duration', value: duration, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '⏰ Ends', value: `<t:${Math.floor((Date.now() + timeoutDuration) / 1000)}:R>`, inline: true }
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
            console.error('Error timing out user:', error);
            await interaction.reply({
                content: '❌ Failed to timeout user. Please check my permissions and try again.',
                ephemeral: true
            });
        }
    }
};
