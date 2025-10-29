const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
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
            
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    content: '❌ You cannot warn someone with equal or higher role than you.',
                    ephemeral: true
                });
            }
            
            // Add warning to database
            await client.db.addWarning(guild.id, targetUser.id, moderator.id, reason);
            await client.db.addModLog(guild.id, targetUser.id, moderator.id, 'warn', reason);
            
            // Get total warnings for user
            const warnings = await client.db.getWarnings(guild.id, targetUser.id);
            const warningCount = warnings.length;
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('⚠️ User Warned')
                .setColor('#ffff00')
                .addFields([
                    { name: '👤 User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: '👮 Moderator', value: `${moderator.tag}`, inline: true },
                    { name: '🔢 Warning Count', value: `${warningCount}`, inline: true },
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
            
            // DM the user about the warning
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('⚠️ You have been warned')
                    .setDescription(`You have been warned in **${guild.name}**`)
                    .setColor('#ffff00')
                    .addFields([
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '👮 Moderator', value: moderator.tag, inline: true },
                        { name: '🔢 Total Warnings', value: `${warningCount}`, inline: true }
                    ])
                    .setTimestamp()
                    .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
                
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled, ignore
            }
            
        } catch (error) {
            console.error('Error warning user:', error);
            await interaction.reply({
                content: '❌ Failed to warn user. Please try again.',
                ephemeral: true
            });
        }
    }
};
