const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check warnings for')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user');
        const guild = interaction.guild;
        
        try {
            const warnings = await client.db.getWarnings(guild.id, targetUser.id);
            
            if (warnings.length === 0) {
                return interaction.reply({
                    content: `✅ ${targetUser.tag} has no warnings.`,
                    ephemeral: true
                });
            }
            
            const embed = new EmbedBuilder()
                .setTitle(`⚠️ Warnings for ${targetUser.tag}`)
                .setColor('#ffff00')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`Total warnings: **${warnings.length}**`)
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
            
            // Show last 10 warnings
            const recentWarnings = warnings.slice(0, 10);
            for (let i = 0; i < recentWarnings.length; i++) {
                const warning = recentWarnings[i];
                const moderator = await client.users.fetch(warning.moderator_id).catch(() => ({ tag: 'Unknown User' }));
                const date = new Date(warning.created_at);
                
                embed.addFields([{
                    name: `Warning #${i + 1}`,
                    value: `**Reason:** ${warning.reason}\n**Moderator:** ${moderator.tag}\n**Date:** <t:${Math.floor(date.getTime() / 1000)}:R>`,
                    inline: false
                }]);
            }
            
            if (warnings.length > 10) {
                embed.setDescription(`Total warnings: **${warnings.length}**\n*Showing 10 most recent warnings*`);
            }
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Error fetching warnings:', error);
            await interaction.reply({
                content: '❌ Failed to fetch warnings. Please try again.',
                ephemeral: true
            });
        }
    }
};
