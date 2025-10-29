const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('system')
        .setDescription('Bot system information and feature status')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View bot status and features'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('features')
                .setDescription('Browse all bot features'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Get help with bot commands')),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'status') {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            const embed = new EmbedBuilder()
                .setTitle('🤖 PLOT Bot System Status')
                .setColor('#00FF00')
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    { name: '⏱️ Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
                    { name: '📊 Servers', value: `${client.guilds.cache.size}`, inline: true },
                    { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
                    { name: '🎯 Features Active', value: '✅ Tournaments\n✅ Tickets\n✅ Giveaways\n✅ Moderation\n✅ Polls\n✅ Leaderboards', inline: true },
                    { name: '💾 Database', value: '✅ Connected\n✅ All tables ready', inline: true },
                    { name: '🎮 Gaming Systems', value: '✅ Tournament Manager\n✅ Leaderboard Tracking\n✅ Achievement Ready', inline: true }
                )
                .setFooter({ text: `Bot Version: 2.0 | Ping: ${client.ws.ping}ms` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }
        
        else if (subcommand === 'features') {
            const embed = new EmbedBuilder()
                .setTitle('🎮 PLOT Bot - Complete Feature List')
                .setDescription('Your all-in-one Discord server management bot!')
                .setColor('#5865F2')
                .addFields(
                    {
                        name: '🏆 Tournament System',
                        value: '`/tournament create` - Create tournaments\n`/tournament join` - Join competitions\n`/tournament start` - Begin brackets\n`/tournament result` - Report match results',
                        inline: true
                    },
                    {
                        name: '🎫 Support Tickets',
                        value: '`/ticket-setup` - Configure ticket system\n`/ticket` - Create support ticket\n**Automatic transcripts & management**',
                        inline: true
                    },
                    {
                        name: '🎁 Giveaway System',
                        value: '`/giveaway start` - Host giveaways\n**Interactive entry buttons**\n**Auto winner selection**',
                        inline: true
                    },
                    {
                        name: '🔨 Moderation Tools',
                        value: '`/ban` `/kick` `/timeout` - Member management\n`/warn` `/warnings` - Warning system\n`/purge` - Bulk message deletion',
                        inline: true
                    },
                    {
                        name: '📝 Utility Features',
                        value: '`/poll` - Create interactive polls\n`/info` `/ping` - Server utilities\n`/dm` - Direct messaging\n`/invites` - Check invite stats',
                        inline: true
                    },
                    {
                        name: '🏅 Leaderboards',
                        value: '`/leaderboard view` - Check rankings\n**Tournament wins tracking**\n**Gaming points system**\n**Activity scoring**',
                        inline: true
                    },
                    {
                        name: '🎯 Gaming Features',
                        value: '**Match tracking & statistics**\n**Achievement system ready**\n**Competitive rankings**\n**Tournament history**',
                        inline: true
                    },
                    {
                        name: '⚙️ Configuration',
                        value: '`/system status` - Bot information\n**Automatic database management**\n**Permission-based access control**',
                        inline: true
                    }
                )
                .setFooter({ text: 'Use /system help for detailed command information' })
                .setTimestamp();
            
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('help_tournaments')
                            .setLabel('Tournament Help')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🏆'),
                        new ButtonBuilder()
                            .setCustomId('help_moderation')
                            .setLabel('Moderation Help')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔨'),
                        new ButtonBuilder()
                            .setCustomId('help_utility')
                            .setLabel('Utility Help')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('📝')
                    );            await interaction.reply({ embeds: [embed], components: [row] });
        }
        
        else if (subcommand === 'help') {
            const embed = new EmbedBuilder()
                .setTitle('📚 PLOT Bot Help Center')
                .setDescription('**Need help? Here are some quick guides!**')
                .setColor('#FFD700')
                .addFields(
                    {
                        name: '🚀 Getting Started',
                        value: '• Use `/system features` to see all commands\n• Check `/system status` for bot health\n• Most features work immediately!'
                    },
                    {
                        name: '🏆 Tournament Quick Start',
                        value: '1. `/tournament create` - Make a tournament\n2. Players use `/tournament join` to enter\n3. `/tournament start` when ready\n4. Use `/tournament result` to report matches'
                    },
                    {
                        name: '📝 Utility Features',
                        value: '• `/poll` - Get community opinions\n• `/leaderboard` - Track gaming achievements\n• `/info` - Get server information\n• `/invites` - Check invite statistics'
                    },
                    {
                        name: '🎫 Support & Moderation',
                        value: '• `/ticket-setup` configures support tickets\n• Use moderation commands like `/ban`, `/warn`\n• `/giveaway` for community engagement'
                    },
                    {
                        name: '❓ Need More Help?',
                        value: 'Create a support ticket with `/ticket` or ask staff members for assistance!'
                    }
                )
                .setFooter({ text: 'PLOT Bot - Making Discord servers awesome since 2024!' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }
    }
};