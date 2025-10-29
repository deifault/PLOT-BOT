const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Check invite statistics')
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Check invite count for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check invites for (default: yourself)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Show invite leaderboard')),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'check':
                await this.checkInvites(interaction, client);
                break;
            case 'leaderboard':
                await this.showLeaderboard(interaction, client);
                break;
        }
    },
    
    async checkInvites(interaction, client) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        try {
            const inviteCount = await client.db.getInviteCount(interaction.guild.id, targetUser.id);
            
            const embed = new EmbedBuilder()
                .setTitle('🎫 Invite Statistics')
                .setColor(config.embedColor)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields([
                    { name: '👤 User', value: `${targetUser.tag}`, inline: true },
                    { name: '🎫 Total Invites', value: `${inviteCount}`, inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error checking invites:', error);
            await interaction.reply({
                content: '❌ Failed to check invite statistics.',
                ephemeral: true
            });
        }
    },
    
    async showLeaderboard(interaction, client) {
        try {
            const leaderboard = await new Promise((resolve, reject) => {
                client.db.db.all(
                    `SELECT inviter_id, COUNT(*) as invite_count 
                     FROM invites 
                     WHERE guild_id = ? 
                     GROUP BY inviter_id 
                     ORDER BY invite_count DESC 
                     LIMIT 10`,
                    [interaction.guild.id],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    }
                );
            });
            
            if (leaderboard.length === 0) {
                return interaction.reply({
                    content: '📊 No invite data found for this server.',
                    ephemeral: true
                });
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🏆 Invite Leaderboard')
                .setColor(config.embedColor)
                .setDescription('Top inviters in this server')
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
            
            let leaderboardText = '';
            for (let i = 0; i < leaderboard.length; i++) {
                const entry = leaderboard[i];
                const user = await client.users.fetch(entry.inviter_id).catch(() => ({ tag: 'Unknown User' }));
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                leaderboardText += `${medal} **${user.tag}** - ${entry.invite_count} invites\n`;
            }
            
            embed.addFields([
                { name: '📊 Rankings', value: leaderboardText, inline: false }
            ]);
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error showing invite leaderboard:', error);
            await interaction.reply({
                content: '❌ Failed to fetch invite leaderboard.',
                ephemeral: true
            });
        }
    }
};
