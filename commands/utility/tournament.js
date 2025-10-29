const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const TournamentManager = require('../../utils/tournamentManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tournament')
        .setDescription('Create and manage tournaments for the squad')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Start a new tournament')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('What should we call this tournament?')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Tell everyone what this is about')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('max-participants')
                        .setDescription('How many people can join? (2-64)')
                        .setMinValue(2)
                        .setMaxValue(64)
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What does the winner get?')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('server-ip')
                        .setDescription('Server IP address for the tournament')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('tournament-date')
                        .setDescription('When will the tournament happen? (e.g., Dec 25, 2024)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('signup-deadline')
                        .setDescription('When do signups end? (e.g., Dec 20, 2024)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('bracket-type')
                        .setDescription('What kind of tournament?')
                        .addChoices(
                            { name: 'Single Elim (lose once = out)', value: 'single_elimination' },
                            { name: 'Double Elim (2 chances)', value: 'double_elimination' },
                            { name: 'Everyone vs Everyone', value: 'round_robin' }
                        )
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Sign up for a tournament')
                .addIntegerOption(option =>
                    option.setName('tournament-id')
                        .setDescription('Which tournament? (use the ID number)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Back out of a tournament')
                .addIntegerOption(option =>
                    option.setName('tournament-id')
                        .setDescription('Which tournament to leave?')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Get the tournament going! (Admins only)')
                .addIntegerOption(option =>
                    option.setName('tournament-id')
                        .setDescription('Which tournament to start?')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('Stop a tournament early (Admins only)')
                .addIntegerOption(option =>
                    option.setName('tournament-id')
                        .setDescription('Which tournament to end?')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close-signups')
                .setDescription('Close signups for a tournament (Admins only)')
                .addIntegerOption(option =>
                    option.setName('tournament-id')
                        .setDescription('Which tournament to close signups for?')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bracket')
                .setDescription('See who\'s fighting who')
                .addIntegerOption(option =>
                    option.setName('tournament-id')
                        .setDescription('Which tournament bracket?')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('See what tournaments are happening'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('result')
                .setDescription('Report who won a match (Admins only)')
                .addIntegerOption(option =>
                    option.setName('match-id')
                        .setDescription('Which match? (match number)')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('winner')
                        .setDescription('Who came out on top?')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        const tournamentManager = new TournamentManager(client);
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'create':
                await this.createTournament(interaction, client, tournamentManager);
                break;
            case 'join':
                await this.joinTournament(interaction, client, tournamentManager);
                break;
            case 'leave':
                await this.leaveTournament(interaction, client, tournamentManager);
                break;
            case 'start':
                await this.startTournament(interaction, client, tournamentManager);
                break;
            case 'end':
                await this.endTournament(interaction, client, tournamentManager);
                break;
            case 'bracket':
                await this.viewBracket(interaction, client, tournamentManager);
                break;
            case 'list':
                await this.listTournaments(interaction, client, tournamentManager);
                break;
            case 'result':
                await this.reportResult(interaction, client, tournamentManager);
                break;
            case 'close-signups':
                await this.closeSignups(interaction, client, tournamentManager);
                break;
        }
    },
    
    async createTournament(interaction, client, tournamentManager) {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description') || 'Time to see who\'s the best!';
        const maxParticipants = interaction.options.getInteger('max-participants') || 16;
        const prize = interaction.options.getString('prize') || 'Bragging rights and respect';
        const bracketType = interaction.options.getString('bracket-type') || 'single_elimination';
        const serverIp = interaction.options.getString('server-ip') || 'TBA';
        const tournamentDate = interaction.options.getString('tournament-date') || 'TBA';
        const signupDeadline = interaction.options.getString('signup-deadline') || 'TBA';
        
        try {
            const tournamentId = await client.db.createTournament(
                interaction.guild.id,
                name,
                description,
                interaction.user.id,
                maxParticipants,
                prize,
                bracketType,
                serverIp,
                tournamentDate,
                signupDeadline
            );
            
            const embed = new EmbedBuilder()
                .setTitle(`🏆 ${name}`)
                .setDescription(`${description}\n\n🆔 **Tournament ID:** ${tournamentId}\n🏆 **Prize:** ${prize}\n👥 **Max Players:** ${maxParticipants}\n�️ **Server IP:** ${serverIp}\n📅 **Tournament Date:** ${tournamentDate}\n⏰ **Signup Deadline:** ${signupDeadline}\n�📝 **Status:** Open for signups!`)
                .setColor('#00FF00')
                .setFooter({ text: `Click the buttons below to join with your IGN` })
                .setTimestamp();
            
            const buttons = tournamentManager.createTournamentButtons(tournamentId);
            
            await interaction.reply({
                embeds: [embed],
                components: [buttons]
            });
            
        } catch (error) {
            console.error('Error creating tournament:', error);
            await interaction.reply({
                content: '❌ Failed to create tournament. Please try again later.',
                ephemeral: true
            });
        }
    },
    
    async joinTournament(interaction, client, tournamentManager) {
        const tournamentId = interaction.options.getInteger('tournament-id');
        const userId = interaction.user.id;
        
        try {
            const tournament = await client.db.getTournament(tournamentId);
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
            
            const participants = await client.db.getTournamentParticipants(tournamentId);
            if (participants.length >= tournament.max_participants) {
                return interaction.reply({
                    content: '❌ Aw man, this tournament is already full! Maybe next time 😔',
                    ephemeral: true
                });
            }
            
            if (participants.some(p => p.user_id === userId)) {
                return interaction.reply({
                    content: '❌ You\'re already in this tournament! Ready to fight? 😎',
                    ephemeral: true
                });
            }
            
            await client.db.joinTournament(tournamentId, userId);
            
            const embed = new EmbedBuilder()
                .setTitle('⚔️ You\'re in!')
                .setDescription(`Welcome to **${tournament.name}**! Time to show what you got 💪`)
                .setColor('#00FF00')
                .addFields([
                    { name: '🏆 Tournament', value: tournament.name, inline: false },
                    { name: '👥 Players', value: `${participants.length + 1}/${tournament.max_participants}`, inline: false },
                    { name: '🏆 Prize', value: tournament.prize, inline: false }
                ])
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Error joining tournament:', error);
            await interaction.reply({
                content: '❌ Failed to join tournament. You may already be participating.',
                ephemeral: true
            });
        }
    },
    
    async leaveTournament(interaction, client, tournamentManager) {
        const tournamentId = interaction.options.getInteger('tournament-id');
        const userId = interaction.user.id;
        
        try {
            const tournament = await client.db.getTournament(tournamentId);
            if (!tournament) {
                return interaction.reply({
                    content: '❌ Tournament not found.',
                    ephemeral: true
                });
            }
            
            if (tournament.status !== 'registration') {
                return interaction.reply({
                    content: '❌ Cannot leave tournament after it has started.',
                    ephemeral: true
                });
            }
            
            const result = await client.db.leaveTournament(tournamentId, userId);
            if (result === 0) {
                return interaction.reply({
                    content: '❌ You are not participating in this tournament.',
                    ephemeral: true
                });
            }
            
            const embed = new EmbedBuilder()
                .setTitle('👋 Left Tournament')
                .setDescription(`You have left **${tournament.name}**.`)
                .setColor('#FF9900')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Error leaving tournament:', error);
            await interaction.reply({
                content: '❌ Failed to leave tournament.',
                ephemeral: true
            });
        }
    },
    
    async startTournament(interaction, client, tournamentManager) {
        const tournamentId = interaction.options.getInteger('tournament-id');
        
        try {
            const tournament = await client.db.getTournament(tournamentId);
            if (!tournament) {
                return interaction.reply({
                    content: '❌ Tournament not found.',
                    ephemeral: true
                });
            }
            
            if (tournament.status !== 'registration') {
                return interaction.reply({
                    content: '❌ Tournament has already been started or completed.',
                    ephemeral: true
                });
            }
            
            const participants = await client.db.getTournamentParticipants(tournamentId);
            if (participants.length < 2) {
                return interaction.reply({
                    content: '❌ Need at least 2 participants to start the tournament.',
                    ephemeral: true
                });
            }
            
            // Generate bracket and create matches
            const bracketData = tournamentManager.generateSingleEliminationBracket(participants);
            const matches = await tournamentManager.createInitialMatches(tournamentId, bracketData);
            
            await client.db.updateTournamentStatus(tournamentId, 'active');
            
            const embed = new EmbedBuilder()
                .setTitle('🚀 Tournament Started!')
                .setDescription(`**${tournament.name}** has begun!`)
                .setColor('#FF6600')
                .addFields([
                    { name: '👥 Participants', value: `${participants.length}`, inline: true },
                    { name: '🏁 First Round Matches', value: `${matches.length}`, inline: true },
                    { name: '🎯 Status', value: 'Active', inline: true }
                ])
                .setFooter({ text: 'Use /tournament bracket to view the bracket!' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error starting tournament:', error);
            await interaction.reply({
                content: '❌ Failed to start tournament.',
                ephemeral: true
            });
        }
    },
    
    async endTournament(interaction, client, tournamentManager) {
        const tournamentId = interaction.options.getInteger('tournament-id');
        
        try {
            const tournament = await client.db.getTournament(tournamentId);
            if (!tournament) {
                return interaction.reply({
                    content: '❌ Tournament not found.',
                    ephemeral: true
                });
            }
            
            await client.db.updateTournamentStatus(tournamentId, 'completed');
            
            const embed = new EmbedBuilder()
                .setTitle('🏁 Tournament Ended')
                .setDescription(`**${tournament.name}** has been ended by an administrator.`)
                .setColor('#FF0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error ending tournament:', error);
            await interaction.reply({
                content: '❌ Failed to end tournament.',
                ephemeral: true
            });
        }
    },
    
    async viewBracket(interaction, client, tournamentManager) {
        const tournamentId = interaction.options.getInteger('tournament-id');
        
        try {
            const bracketEmbed = await tournamentManager.generateBracketEmbed(tournamentId);
            if (!bracketEmbed) {
                return interaction.reply({
                    content: '❌ Tournament not found or bracket not available.',
                    ephemeral: true
                });
            }
            
            await interaction.reply({ embeds: [bracketEmbed] });
            
        } catch (error) {
            console.error('Error viewing bracket:', error);
            await interaction.reply({
                content: '❌ Failed to load tournament bracket.',
                ephemeral: true
            });
        }
    },
    
    async listTournaments(interaction, client, tournamentManager) {
        try {
            const listEmbed = await tournamentManager.generateTournamentListEmbed(interaction.guild.id);
            await interaction.reply({ embeds: [listEmbed] });
            
        } catch (error) {
            console.error('Error listing tournaments:', error);
            await interaction.reply({
                content: '❌ Failed to load tournaments list.',
                ephemeral: true
            });
        }
    },
    
    async reportResult(interaction, client, tournamentManager) {
        const matchId = interaction.options.getInteger('match-id');
        const winner = interaction.options.getUser('winner');
        
        try {
            const match = await client.db.getMatch(matchId);
            
            if (!match) {
                return interaction.reply({
                    content: '❌ Match not found. Please check the match ID.',
                    ephemeral: true
                });
            }
            
            const success = await tournamentManager.advanceWinner(match.tournament_id, matchId, winner.id);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Match Result Reported')
                    .setDescription(`${winner} has been declared the winner of match ${matchId}!`)
                    .setColor('#00FF00')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({
                    content: '❌ Failed to report match result. Check match ID and try again.',
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error reporting result:', error);
            await interaction.reply({
                content: '❌ Failed to report match result.',
                ephemeral: true
            });
        }
    },
    
    async closeSignups(interaction, client, tournamentManager) {
        const tournamentId = interaction.options.getInteger('tournament-id');
        
        try {
            const tournament = await client.db.getTournament(tournamentId);
            if (!tournament) {
                return interaction.reply({
                    content: '❌ Tournament not found.',
                    ephemeral: true
                });
            }
            
            if (tournament.status !== 'registration') {
                return interaction.reply({
                    content: '❌ This tournament is not in registration phase.',
                    ephemeral: true
                });
            }
            
            await client.db.updateTournamentStatus(tournamentId, 'signups_closed');
            
            const embed = new EmbedBuilder()
                .setTitle('🔒 Signups Closed!')
                .setDescription(`Signups for **${tournament.name}** are now closed.`)
                .setColor('#FF9900')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error closing signups:', error);
            await interaction.reply({
                content: '❌ Failed to close signups.',
                ephemeral: true
            });
        }
    }
};