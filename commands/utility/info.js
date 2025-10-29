const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get information about users, server, or bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Get information about a user')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('User to get info about (default: yourself)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Get information about the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bot')
                .setDescription('Get information about the bot')),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'user':
                await this.getUserInfo(interaction, client);
                break;
            case 'server':
                await this.getServerInfo(interaction, client);
                break;
            case 'bot':
                await this.getBotInfo(interaction, client);
                break;
        }
    },
    
    async getUserInfo(interaction, client) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        const embed = new EmbedBuilder()
            .setTitle(`👤 User Information`)
            .setColor(config.embedColor)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields([
                { name: '🏷️ Username', value: `${targetUser.tag}`, inline: true },
                { name: '🆔 User ID', value: `${targetUser.id}`, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: false },
                { name: '📅 Account Age', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true }
            ])
            .setTimestamp()
            .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
        
        if (targetMember) {
            embed.addFields([
                { name: '📥 Joined Server', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`, inline: false },
                { name: '📥 Join Age', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 Roles', value: targetMember.roles.cache.size > 1 ? targetMember.roles.cache.filter(role => role.name !== '@everyone').map(role => role).slice(0, 10).join(' ') : 'None', inline: false }
            ]);
            
            if (targetMember.premiumSince) {
                embed.addFields([
                    { name: '💎 Boosting Since', value: `<t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:R>`, inline: true }
                ]);
            }
        }
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async getServerInfo(interaction, client) {
        const guild = interaction.guild;
        
        const owner = await guild.fetchOwner();
        const channels = guild.channels.cache;
        const textChannels = channels.filter(channel => channel.type === 0).size;
        const voiceChannels = channels.filter(channel => channel.type === 2).size;
        const categories = channels.filter(channel => channel.type === 4).size;
        
        const embed = new EmbedBuilder()
            .setTitle(`🏠 Server Information`)
            .setColor(config.embedColor)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields([
                { name: '🏷️ Server Name', value: `${guild.name}`, inline: true },
                { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '💬 Text Channels', value: `${textChannels}`, inline: true },
                { name: '🔊 Voice Channels', value: `${voiceChannels}`, inline: true },
                { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: '🚀 Boost Count', value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
            ])
            .setTimestamp()
            .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
        
        if (guild.description) {
            embed.setDescription(guild.description);
        }
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async getBotInfo(interaction, client) {
        const uptime = process.uptime();
        const uptimeString = this.formatUptime(uptime);
        
        const embed = new EmbedBuilder()
            .setTitle(`🤖 Bot Information`)
            .setColor(config.embedColor)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields([
                { name: '🏷️ Bot Name', value: `${client.user.tag}`, inline: true },
                { name: '👨‍💻 Developer', value: 'deifault', inline: true },
                { name: '⏰ Uptime', value: uptimeString, inline: true },
                { name: '💻 Node.js', value: `${process.version}`, inline: true },
                { name: '📚 Discord.js', value: `v${require('discord.js').version}`, inline: true },
                { name: '🧠 Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
                { name: '⚡ Commands', value: `${client.commands.size}`, inline: true }
            ])
            .setDescription('PLOT')
            .setTimestamp()
            .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
        
        await interaction.reply({ embeds: [embed] });
    },
    
    formatUptime(uptime) {
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime % 86400 / 3600);
        const minutes = Math.floor(uptime % 3600 / 60);
        const seconds = Math.floor(uptime % 60);
        
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
};
