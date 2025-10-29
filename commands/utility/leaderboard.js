const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Gaming leaderboards and achievements!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View server leaderboards')
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('Which game leaderboard?')
                        .addChoices(
                            { name: '🏆 Tournament Wins', value: 'tournaments' },
                            { name: '🎮 Gaming Points', value: 'gaming' },
                            { name: '💬 Activity Score', value: 'activity' },
                            { name: '🎯 Mini-Games', value: 'minigames' }
                        )
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add points to leaderboard (Admin only)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to award points')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('Game category')
                        .addChoices(
                            { name: '🏆 Tournament Wins', value: 'tournaments' },
                            { name: '🎮 Gaming Points', value: 'gaming' },
                            { name: '💬 Activity Score', value: 'activity' },
                            { name: '🎯 Mini-Games', value: 'minigames' }
                        )
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('points')
                        .setDescription('Points to add')
                        .setRequired(true)))
        .setDefaultMemberPermissions(0),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'view') {
            const gameType = interaction.options.getString('game');
            
            try {
                const leaderboard = await client.db.getLeaderboard(interaction.guild.id, gameType, 10);
                
                const gameNames = {
                    'tournaments': '🏆 Tournament Champions',
                    'gaming': '🎮 Gaming Masters', 
                    'activity': '💬 Most Active Members',
                    'minigames': '🎯 Mini-Game Champions'
                };
                
                const embed = new EmbedBuilder()
                    .setTitle(gameNames[gameType] || 'Leaderboard')
                    .setColor('#FFD700')
                    .setTimestamp()
                    .setFooter({ text: 'PLOT Leaderboards', iconURL: client.user.displayAvatarURL() });
                
                if (leaderboard.length === 0) {
                    embed.setDescription('No scores yet! Be the first to get on the leaderboard! 🎮');
                } else {
                    let leaderboardText = '';
                    const medals = ['🥇', '🥈', '🥉'];
                    
                    for (let i = 0; i < leaderboard.length; i++) {
                        const entry = leaderboard[i];
                        try {
                            const user = await client.users.fetch(entry.user_id);
                            const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
                            leaderboardText += `${medal} ${user.username}\n`;
                            leaderboardText += `   📊 Score: **${entry.score}** | Wins: **${entry.wins}** | Losses: **${entry.losses}**\n\n`;
                        } catch (error) {
                            leaderboardText += `${i + 1}. Unknown User\n   📊 Score: **${entry.score}**\n\n`;
                        }
                    }
                    
                    embed.setDescription(leaderboardText);
                }
                
                await interaction.reply({ embeds: [embed] });
                
            } catch (error) {
                console.error('Error viewing leaderboard:', error);
                await interaction.reply({
                    content: '❌ Failed to load leaderboard.',
                    ephemeral: true
                });
            }
        }
        
        else if (subcommand === 'add') {
            const user = interaction.options.getUser('user');
            const gameType = interaction.options.getString('game');
            const points = interaction.options.getInteger('points');
            
            try {
                await client.db.updateLeaderboard(
                    interaction.guild.id,
                    user.id,
                    gameType,
                    points,
                    points > 0 ? 1 : 0,
                    points < 0 ? 1 : 0
                );
                
                const embed = new EmbedBuilder()
                    .setTitle('📊 Leaderboard Updated!')
                    .setDescription(`Added **${points}** points to ${user} in **${gameType}**!`)
                    .setColor('#00FF00')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                
            } catch (error) {
                console.error('Error updating leaderboard:', error);
                await interaction.reply({
                    content: '❌ Failed to update leaderboard.',
                    ephemeral: true
                });
            }
        }
    }
};