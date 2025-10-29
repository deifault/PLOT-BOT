const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Giveaway system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What are you giving away?')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('How long should the giveaway last? (e.g., 1h, 1d, 1w)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners (default: 1)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to host the giveaway (default: current channel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Message ID of the giveaway to end')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll a giveaway winner')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Message ID of the giveaway to reroll')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'start':
                await this.startGiveaway(interaction, client);
                break;
            case 'end':
                await this.endGiveaway(interaction, client);
                break;
            case 'reroll':
                await this.rerollGiveaway(interaction, client);
                break;
        }
    },
    
    async startGiveaway(interaction, client) {
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getString('duration');
        const winners = interaction.options.getInteger('winners') || 1;
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        // Parse duration
        const giveawayDuration = ms(duration);
        if (!giveawayDuration) {
            return interaction.reply({
                content: '❌ Invalid duration format. Use formats like: 1h, 1d, 1w',
                ephemeral: true
            });
        }
        
        const endTime = new Date(Date.now() + giveawayDuration);
        
        try {
            // Create giveaway embed
            const giveawayEmbed = new EmbedBuilder()
                .setTitle('🎉 GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${prize}\n\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n**Hosted by:** ${interaction.user}`)
                .setColor('#ff69b4')
                .setTimestamp(endTime)
                .setFooter({ text: 'PLOT • Ends at', iconURL: client.user.displayAvatarURL() });
            
            // Create enter button
            const enterButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('enter_giveaway')
                        .setLabel('🎉 Enter Giveaway')
                        .setStyle(ButtonStyle.Primary)
                );
            
            // Send giveaway message
            const giveawayMessage = await channel.send({
                embeds: [giveawayEmbed],
                components: [enterButton]
            });
            
            // Add to database
            await client.db.createGiveaway(
                interaction.guild.id,
                channel.id,
                giveawayMessage.id,
                interaction.user.id,
                prize,
                winners,
                endTime.toISOString()
            );
            
            await interaction.reply({
                content: `✅ Giveaway started in ${channel}!`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error starting giveaway:', error);
            await interaction.reply({
                content: '❌ Failed to start giveaway. Please try again.',
                ephemeral: true
            });
        }
    },
    
    async endGiveaway(interaction, client) {
        const messageId = interaction.options.getString('message_id');
        
        try {
            await this.endGiveawayById(interaction, client, messageId);
        } catch (error) {
            console.error('Error ending giveaway:', error);
            await interaction.reply({
                content: '❌ Failed to end giveaway. Please check the message ID and try again.',
                ephemeral: true
            });
        }
    },
    
    async rerollGiveaway(interaction, client) {
        const messageId = interaction.options.getString('message_id');
        
        try {
            // Get giveaway from database
            const giveaway = await new Promise((resolve, reject) => {
                client.db.db.get(
                    'SELECT * FROM giveaways WHERE message_id = ? AND guild_id = ?',
                    [messageId, interaction.guild.id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (!giveaway) {
                return interaction.reply({
                    content: '❌ Giveaway not found.',
                    ephemeral: true
                });
            }
            
            // Get entries
            const entries = await client.db.getGiveawayEntries(giveaway.id);
            
            if (entries.length === 0) {
                return interaction.reply({
                    content: '❌ No entries found for this giveaway.',
                    ephemeral: true
                });
            }
            
            // Select new winners
            const winners = this.selectWinners(entries, giveaway.winners);
            
            // Create reroll embed
            const rerollEmbed = new EmbedBuilder()
                .setTitle('🎉 Giveaway Rerolled! 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}\n\n**New Winner(s):**\n${winners.map(id => `<@${id}>`).join('\n')}`)
                .setColor('#00ff00')
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
            
            await interaction.reply({ embeds: [rerollEmbed] });
            
        } catch (error) {
            console.error('Error rerolling giveaway:', error);
            await interaction.reply({
                content: '❌ Failed to reroll giveaway. Please try again.',
                ephemeral: true
            });
        }
    },
    
    async endGiveawayById(interaction, client, messageId) {
        // Get giveaway from database
        const giveaway = await new Promise((resolve, reject) => {
            client.db.db.get(
                'SELECT * FROM giveaways WHERE message_id = ? AND guild_id = ?',
                [messageId, interaction.guild.id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!giveaway) {
            return interaction.reply({
                content: '❌ Giveaway not found.',
                ephemeral: true
            });
        }
        
        if (giveaway.ended) {
            return interaction.reply({
                content: '❌ This giveaway has already ended.',
                ephemeral: true
            });
        }
        
        // Get entries
        const entries = await client.db.getGiveawayEntries(giveaway.id);
        
        // Get the original message
        const channel = await client.channels.fetch(giveaway.channel_id);
        const message = await channel.messages.fetch(giveaway.message_id);
        
        let resultEmbed;
        
        if (entries.length === 0) {
            resultEmbed = new EmbedBuilder()
                .setTitle('🎉 Giveaway Ended 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner:** No one entered the giveaway 😢`)
                .setColor('#ff0000')
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
        } else {
            // Select winners
            const winners = this.selectWinners(entries, giveaway.winners);
            
            resultEmbed = new EmbedBuilder()
                .setTitle('🎉 Giveaway Ended! 🎉')
                .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner(s):**\n${winners.map(id => `<@${id}>`).join('\n')}\n\nCongratulations! 🎊`)
                .setColor('#00ff00')
                .setTimestamp()
                .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
        }
        
        // Update original message
        await message.edit({
            embeds: [resultEmbed],
            components: []
        });
        
        // Mark giveaway as ended
        await client.db.endGiveaway(giveaway.id);
        
        if (interaction) {
            await interaction.reply({
                content: '✅ Giveaway ended successfully!',
                ephemeral: true
            });
        }
    },
    
    selectWinners(entries, winnerCount) {
        const shuffled = [...entries].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(winnerCount, entries.length));
    }
};
