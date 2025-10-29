const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Direct message commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Send a DM to a specific user')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('User to send DM to')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Message to send')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Send a DM to all users with a specific role')
                .addRoleOption(option =>
                    option.setName('target_role')
                        .setDescription('Role to send DM to')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Message to send')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Send a DM to all server members (use with extreme caution)')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Message to send')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('confirm')
                        .setDescription('Type "CONFIRM" to proceed with mass DM')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'user':
                await this.dmUser(interaction, client);
                break;
            case 'role':
                await this.dmRole(interaction, client);
                break;
            case 'all':
                await this.dmAll(interaction, client);
                break;
        }
    },
    
    async dmUser(interaction, client) {
        const targetUser = interaction.options.getUser('target');
        const message = interaction.options.getString('message');
        
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle(`📬 Message from ${interaction.guild.name}`)
                .setDescription(message)
                .setColor(config.embedColor)
                .addFields([
                    { name: '👤 Sent by', value: `${interaction.user.tag}`, inline: true },
                    { name: '🏠 Server', value: `${interaction.guild.name}`, inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
            
            await targetUser.send({ embeds: [dmEmbed] });
            
            await interaction.reply({
                content: `✅ Successfully sent DM to ${targetUser.tag}`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error sending DM:', error);
            await interaction.reply({
                content: `❌ Failed to send DM to ${targetUser.tag}. They may have DMs disabled.`,
                ephemeral: true
            });
        }
    },
    
    async dmRole(interaction, client) {
        const targetRole = interaction.options.getRole('target_role');
        const message = interaction.options.getString('message');
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const members = targetRole.members;
            
            if (members.size === 0) {
                return interaction.editReply('❌ No members found with that role.');
            }
            
            if (members.size > 100) {
                return interaction.editReply('❌ Cannot send DMs to more than 100 users at once for safety.');
            }
            
            const dmEmbed = new EmbedBuilder()
                .setTitle(`📬 Message from ${interaction.guild.name}`)
                .setDescription(message)
                .setColor(config.embedColor)
                .addFields([
                    { name: '👤 Sent by', value: `${interaction.user.tag}`, inline: true },
                    { name: '🏠 Server', value: `${interaction.guild.name}`, inline: true },
                    { name: '👥 Role', value: `${targetRole.name}`, inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
            
            let successCount = 0;
            let failureCount = 0;
            
            for (const [userId, member] of members) {
                try {
                    await member.send({ embeds: [dmEmbed] });
                    successCount++;
                } catch (error) {
                    failureCount++;
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            await interaction.editReply(
                `📊 **DM Results:**\n✅ Successfully sent: ${successCount}\n❌ Failed to send: ${failureCount}\n\n*Total members in role: ${members.size}*`
            );
            
        } catch (error) {
            console.error('Error sending role DMs:', error);
            await interaction.editReply('❌ Failed to send DMs to role members.');
        }
    },
    
    async dmAll(interaction, client) {
        const message = interaction.options.getString('message');
        const confirmation = interaction.options.getString('confirm');
        
        if (confirmation !== 'CONFIRM') {
            return interaction.reply({
                content: '❌ You must type "CONFIRM" to proceed with mass DM to all members.',
                ephemeral: true
            });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const guild = interaction.guild;
            await guild.members.fetch();
            
            const members = guild.members.cache.filter(member => !member.user.bot);
            
            if (members.size > 500) {
                return interaction.editReply('❌ Cannot send DMs to more than 500 users for safety and rate limiting.');
            }
            
            const dmEmbed = new EmbedBuilder()
                .setTitle(`📬 Important Message from ${interaction.guild.name}`)
                .setDescription(message)
                .setColor(config.embedColor)
                .addFields([
                    { name: '👤 Sent by', value: `${interaction.user.tag}`, inline: true },
                    { name: '🏠 Server', value: `${interaction.guild.name}`, inline: true }
                ])
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
            
            let successCount = 0;
            let failureCount = 0;
            let processed = 0;
            
            await interaction.editReply(`📤 Starting mass DM to ${members.size} members...`);
            
            for (const [userId, member] of members) {
                try {
                    await member.send({ embeds: [dmEmbed] });
                    successCount++;
                } catch (error) {
                    failureCount++;
                }
                
                processed++;
                
                if (processed % 50 === 0) {
                    await interaction.editReply(
                        `📤 Progress: ${processed}/${members.size}\n✅ Sent: ${successCount}\n❌ Failed: ${failureCount}`
                    );
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            await interaction.editReply(
                `📊 **Mass DM Complete!**\n✅ Successfully sent: ${successCount}\n❌ Failed to send: ${failureCount}\n\n*Total members: ${members.size}*`
            );
            
        } catch (error) {
            console.error('Error sending mass DMs:', error);
            await interaction.editReply('❌ Failed to complete mass DM operation.');
        }
    }
};
