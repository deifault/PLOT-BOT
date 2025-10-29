const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config');
const TranscriptGenerator = require('../utils/transcriptGenerator');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        
        if (interaction.customId === 'enter_giveaway') {
            try {
                const giveaway = await new Promise((resolve, reject) => {
                    client.db.db.get(
                        'SELECT * FROM giveaways WHERE message_id = ? AND guild_id = ? AND ended = 0',
                        [interaction.message.id, interaction.guild.id],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });
                
                if (!giveaway) {
                    return interaction.reply({
                        content: '❌ This giveaway is no longer active.',
                        ephemeral: true
                    });
                }
                
                const endTime = new Date(giveaway.end_time);
                if (Date.now() > endTime.getTime()) {
                    return interaction.reply({
                        content: '❌ This giveaway has already ended.',
                        ephemeral: true
                    });
                }
                
                const result = await client.db.addGiveawayEntry(giveaway.id, interaction.user.id);
                
                if (result === 0) {
                    return interaction.reply({
                        content: '❌ You are already entered in this giveaway!',
                        ephemeral: true
                    });
                }
                
                await interaction.reply({
                    content: '✅ You have successfully entered the giveaway! Good luck! 🍀',
                    ephemeral: true
                });
                
            } catch (error) {
                console.error('Error entering giveaway:', error);
                await interaction.reply({
                    content: '❌ Failed to enter giveaway. Please try again.',
                    ephemeral: true
                });
            }
        }
        else if (interaction.customId === 'create_ticket') {
            try {
                const guild = interaction.guild;
                const user = interaction.user;
                
                const existingTicket = guild.channels.cache.find(channel => 
                    channel.name === `ticket-${user.username.toLowerCase()}` && 
                    channel.type === 0
                );
                
                if (existingTicket) {
                    return interaction.reply({
                        content: `❌ You already have an open ticket: ${existingTicket}`,
                        ephemeral: true
                    });
                }
                
                const permissionOverwrites = [
                    {
                        id: guild.id,
                        deny: ['ViewChannel'],
                    },
                    {
                        id: user.id,
                        allow: [
                            'ViewChannel',
                            'SendMessages',
                            'ReadMessageHistory'
                        ],
                    },
                    {
                        id: client.user.id,
                        allow: [
                            'ViewChannel',
                            'SendMessages',
                            'ManageChannels'
                        ],
                    }
                ];

                if (config.staffRoleId) {
                    permissionOverwrites.push({
                        id: config.staffRoleId,
                        allow: [
                            'ViewChannel',
                            'SendMessages',
                            'ReadMessageHistory',
                            'ManageMessages'
                        ],
                    });
                }

                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username.toLowerCase()}`,
                    type: 0,
                    parent: config.ticketCategoryId,
                    permissionOverwrites: permissionOverwrites,
                });
                
                await client.db.createTicket(guild.id, ticketChannel.id, user.id, 'Created via embed');
                
                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎫 Support Ticket Created')
                    .setDescription(`A staff member will be with you shortly.`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setColor(config.embedColor)
                    .setFooter({ text: 'PLOT Support', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                const closeButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('🔒')
                            .setStyle(ButtonStyle.Danger)
                    );
                
                const staffMention = config.staffRoleId ? `<@&${config.staffRoleId}>` : '';
                await ticketChannel.send({
                    content: `${user} ${staffMention}`,
                    embeds: [ticketEmbed],
                    components: [closeButton]
                });
                
                await interaction.reply({
                    content: `✅ Ticket created! ${ticketChannel}`,
                    ephemeral: true
                });
                
            } catch (error) {
                console.error('Error creating ticket:', error);
                await interaction.reply({
                    content: '❌ Failed to create ticket. Please try again later.',
                    ephemeral: true
                });
            }
        }
        else if (interaction.customId === 'close_ticket') {
            const channel = interaction.channel;
            const user = interaction.user;
            
            if (!channel.name.startsWith('ticket-')) {
                return interaction.reply({
                    content: '❌ This button can only be used in ticket channels.',
                    ephemeral: true
                });
            }
            
            const member = await interaction.guild.members.fetch(user.id);
            const hasStaffRole = config.staffRoleId && member.roles.cache.has(config.staffRoleId);
            const canClose = member.permissions.has('ManageChannels') || 
                            hasStaffRole ||
                            channel.name === `ticket-${user.username.toLowerCase()}`;
            
            if (!canClose) {
                return interaction.reply({
                    content: '❌ Only staff members or the ticket owner can close this ticket.',
                    ephemeral: true
                });
            }
            
            try {
                await client.db.closeTicket(channel.id);
                
                await interaction.reply('🔒 Generating transcript and closing ticket...');
                
                const transcriptGenerator = new TranscriptGenerator();
                const transcriptBuffer = await transcriptGenerator.generateTranscript(channel, client);
                
                const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptChannelId);
                if (transcriptChannel) {
                    const attachment = new AttachmentBuilder(transcriptBuffer, {
                        name: `transcript-${channel.name}-${Date.now()}.html`
                    });
                    
                    const transcriptEmbed = new EmbedBuilder()
                        .setTitle('🎯 Ticket Transcript')
                        .setDescription(`🔒 **Closed by:** ${user}\n🎫 **Channel:** ${channel.name}`)
                        .setColor(config.embedColor)
                        .setFooter({ text: `Ticket ID: ${channel.id}`, iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    await transcriptChannel.send({
                        embeds: [transcriptEmbed],
                        files: [attachment]
                    });
                }
                
                setTimeout(async () => {
                    try {
                        await channel.delete();
                    } catch (error) {
                        console.error('Error deleting ticket channel:', error);
                    }
                }, 3000);
                
            } catch (error) {
                console.error('Error closing ticket:', error);
                await interaction.reply({
                    content: '❌ Failed to close ticket. Please try again later.',
                    ephemeral: true
                });
            }
        }
        else if (interaction.customId.startsWith('tournament_')) {
            const TournamentManager = require('../utils/tournamentManager');
            const tournamentManager = new TournamentManager(client);
            
            const [action, actionType, tournamentId] = interaction.customId.split('_');
            const tournamentIdNum = parseInt(tournamentId);
            
            if (actionType === 'join') {
                try {
                    const tournament = await client.db.getTournament(tournamentIdNum);
                    if (!tournament) {
                        return interaction.reply({
                            content: '❌ Tournament not found.',
                            ephemeral: true
                        });
                    }
                    
                    if (tournament.status !== 'registration') {
                        return interaction.reply({
                            content: '❌ This tournament isn\'t taking new players right now!',
                            ephemeral: true
                        });
                    }
                    
                    const participants = await client.db.getTournamentParticipants(tournamentIdNum);
                    if (participants.length >= tournament.max_participants) {
                        return interaction.reply({
                            content: '❌ Dang, this tournament is full! Better luck next time 😅',
                            ephemeral: true
                        });
                    }
                    
                    if (participants.some(p => p.user_id === interaction.user.id)) {
                        return interaction.reply({
                            content: '❌ You\'re already signed up! Can\'t wait to see you fight 🔥',
                            ephemeral: true
                        });
                    }
                    
                    const modal = new ModalBuilder()
                        .setCustomId(`tournament_signup_${tournamentIdNum}`)
                        .setTitle(`Join ${tournament.name}`);
                    
                    const ignInput = new TextInputBuilder()
                        .setCustomId('ign')
                        .setLabel('Your In-Game Name (IGN)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Enter your IGN here...')
                        .setRequired(true)
                        .setMaxLength(50);
                    
                    const row = new ActionRowBuilder().addComponents(ignInput);
                    modal.addComponents(row);
                    
                    await interaction.showModal(modal);
                    
                } catch (error) {
                    console.error('Error joining tournament via button:', error);
                    await interaction.reply({
                        content: '❌ Failed to join tournament. You may already be participating.',
                        ephemeral: true
                    });
                }
            }
            else if (actionType === 'leave') {
                try {
                    const tournament = await client.db.getTournament(tournamentIdNum);
                    if (!tournament) {
                        return interaction.reply({
                            content: '❌ Tournament not found.',
                            ephemeral: true
                        });
                    }
                    
                    if (tournament.status !== 'registration') {
                        return interaction.reply({
                            content: '❌ Too late to back out now! The tournament already started 😈',
                            ephemeral: true
                        });
                    }
                    
                    const result = await client.db.leaveTournament(tournamentIdNum, interaction.user.id);
                    if (result === 0) {
                        return interaction.reply({
                            content: '❌ You weren\'t in this tournament anyway! 🤔',
                            ephemeral: true
                        });
                    }
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🏃 You bailed!')
                        .setDescription(`Alright, you left **${tournament.name}**. Maybe next time! 👋`)
                        .setColor('#FF9900')
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    
                } catch (error) {
                    console.error('Error leaving tournament via button:', error);
                    await interaction.reply({
                        content: '❌ Failed to leave tournament.',
                        ephemeral: true
                    });
                }
            }
            else if (actionType === 'bracket') {
                try {
                    const bracketEmbed = await tournamentManager.generateBracketEmbed(tournamentIdNum);
                    if (!bracketEmbed) {
                        return interaction.reply({
                            content: '❌ Tournament bracket not available.',
                            ephemeral: true
                        });
                    }
                    
                    await interaction.reply({ embeds: [bracketEmbed], ephemeral: true });
                    
                } catch (error) {
                    console.error('Error viewing bracket via button:', error);
                    await interaction.reply({
                        content: '❌ Failed to load tournament bracket.',
                        ephemeral: true
                    });
                }
            }
            else if (actionType === 'participants') {
                try {
                    const tournament = await client.db.getTournament(tournamentIdNum);
                    if (!tournament) {
                        return interaction.reply({
                            content: '❌ Tournament not found.',
                            ephemeral: true
                        });
                    }
                    
                    const participants = await client.db.getTournamentParticipants(tournamentIdNum);
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`👥 ${tournament.name} - Participants`)
                        .setColor('#5865F2')
                        .setTimestamp();
                    
                    if (participants.length === 0) {
                        embed.setDescription('No participants yet! Be the first to join! 🎮');
                    } else {
                        let participantList = '';
                        for (let i = 0; i < participants.length; i++) {
                            const participant = participants[i];
                            try {
                                const user = await client.users.fetch(participant.user_id);
                                const ign = participant.ign || 'No IGN provided';
                                participantList += `**${i + 1}.** ${user.username}\n🎮 **IGN:** ${ign}\n\n`;
                            } catch (error) {
                                participantList += `**${i + 1}.** Unknown User\n🎮 **IGN:** ${participant.ign || 'No IGN'}\n\n`;
                            }
                        }
                        
                        embed.setDescription(`**${participants.length}/${tournament.max_participants} Players Registered**\n\n${participantList}`);
                    }
                    
                    embed.setFooter({ text: `Tournament ID: ${tournamentIdNum}` });
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    
                } catch (error) {
                    console.error('Error viewing participants via button:', error);
                    await interaction.reply({
                        content: '❌ Failed to load tournament participants.',
                        ephemeral: true
                    });
                }
            }
        }
        else if (interaction.customId.startsWith('poll_vote_')) {
            const optionIndex = interaction.customId.split('_')[2];
            
            try {
                const poll = await client.db.getPollByMessageId(interaction.message.id);
                if (!poll) {
                    return interaction.reply({
                        content: '❌ Poll not found.',
                        ephemeral: true
                    });
                }
                
                if (poll.end_time && Date.now() > new Date(poll.end_time).getTime()) {
                    return interaction.reply({
                        content: '❌ This poll has already ended.',
                        ephemeral: true
                    });
                }
                
                await client.db.addPollVote(poll.id, interaction.user.id, parseInt(optionIndex));
                
                await interaction.reply({
                    content: `✅ Your vote has been recorded for option ${parseInt(optionIndex) + 1}!`,
                    ephemeral: true
                });
                
            } catch (error) {
                console.error('Error voting in poll:', error);
                await interaction.reply({
                    content: '❌ Failed to record your vote.',
                    ephemeral: true
                });
            }
        }
    },
};
