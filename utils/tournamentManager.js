const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

class TournamentManager {
    constructor(client) {
        this.client = client;
    }

    generateSingleEliminationBracket(participants) {
        const participantCount = participants.length;
        const rounds = Math.ceil(Math.log2(participantCount));
        const totalSlots = Math.pow(2, rounds);
        
        const shuffled = [...participants].sort(() => Math.random() - 0.5);
        
        const bracketParticipants = [...shuffled];
        while (bracketParticipants.length < totalSlots) {
            bracketParticipants.push(null);
        }

        return {
            participants: bracketParticipants,
            rounds: rounds,
            totalSlots: totalSlots
        };
    }

    async createInitialMatches(tournamentId, bracketData) {
        const matches = [];
        const firstRoundMatches = bracketData.totalSlots / 2;

        for (let i = 0; i < firstRoundMatches; i++) {
            const participant1 = bracketData.participants[i * 2];
            const participant2 = bracketData.participants[i * 2 + 1];

            if (!participant1 && !participant2) continue;

            try {
                const matchId = await this.client.db.createMatch(
                    tournamentId,
                    1,
                    i + 1,
                    participant1?.user_id || null,
                    participant2?.user_id || null
                );

                matches.push({
                    id: matchId,
                    participant1: participant1,
                    participant2: participant2,
                    round: 1,
                    matchNumber: i + 1
                });

                if (!participant1 || !participant2) {
                    const winner = participant1 || participant2;
                    await this.client.db.updateMatchResult(matchId, winner.user_id);
                }
            } catch (error) {
                console.error('Error creating match:', error);
            }
        }

        return matches;
    }

    async advanceWinner(tournamentId, matchId, winnerId) {
        try {
            const tournament = await this.client.db.getTournament(tournamentId);
            if (!tournament) return false;

            await this.client.db.updateMatchResult(matchId, winnerId);

            const matches = await this.client.db.getTournamentMatches(tournamentId);
            const currentMatch = matches.find(m => m.id === matchId);
            
            if (!currentMatch) return false;

            const currentRoundMatches = matches.filter(m => m.round === currentMatch.round);
            const completedMatches = currentRoundMatches.filter(m => m.status === 'completed');

            if (completedMatches.length === currentRoundMatches.length) {
                await this.createNextRound(tournamentId, currentMatch.round);
            }

            return true;
        } catch (error) {
            console.error('Error advancing winner:', error);
            return false;
        }
    }

    async createNextRound(tournamentId, currentRound) {
        try {
            const currentRoundMatches = await this.client.db.getTournamentMatches(tournamentId, currentRound);
            const winners = currentRoundMatches
                .filter(m => m.winner_id)
                .map(m => m.winner_id);

            if (winners.length === 1) {
                await this.completeTournament(tournamentId, winners[0]);
                return;
            }

            const nextRound = currentRound + 1;
            const nextRoundMatches = Math.ceil(winners.length / 2);

            for (let i = 0; i < nextRoundMatches; i++) {
                const participant1 = winners[i * 2];
                const participant2 = winners[i * 2 + 1] || null;

                await this.client.db.createMatch(
                    tournamentId,
                    nextRound,
                    i + 1,
                    participant1,
                    participant2
                );

                if (!participant2) {
                    const newMatchId = await this.client.db.createMatch(
                        tournamentId, nextRound, i + 1, participant1, null
                    );
                    await this.client.db.updateMatchResult(newMatchId, participant1);
                }
            }
        } catch (error) {
            console.error('Error creating next round:', error);
        }
    }

    async completeTournament(tournamentId, winnerId) {
        try {
            await this.client.db.updateTournamentStatus(tournamentId, 'completed');
            
            const tournament = await this.client.db.getTournament(tournamentId);
            if (!tournament) return;

            console.log(`Tournament ${tournament.name} completed! Winner: ${winnerId}`);
            
            return winnerId;
        } catch (error) {
            console.error('Error completing tournament:', error);
        }
    }

    async generateBracketEmbed(tournamentId) {
        try {
            const tournament = await this.client.db.getTournament(tournamentId);
            const participants = await this.client.db.getTournamentParticipants(tournamentId);
            const matches = await this.client.db.getTournamentMatches(tournamentId);

            if (!tournament) return null;

            const embed = new EmbedBuilder()
                .setTitle(`🏆 ${tournament.name} Bracket`)
                .setDescription(tournament.description || 'Who will be the champion?')
                .setColor('#FFD700')
                .setTimestamp();

            const roundMatches = {};
            matches.forEach(match => {
                if (!roundMatches[match.round]) {
                    roundMatches[match.round] = [];
                }
                roundMatches[match.round].push(match);
            });

            Object.keys(roundMatches).forEach(round => {
                const roundNum = parseInt(round);
                const matchesInRound = roundMatches[round];
                
                let roundText = '';
                matchesInRound.forEach(match => {
                    const p1 = match.participant1_id ? `<@${match.participant1_id}>` : 'BYE';
                    const p2 = match.participant2_id ? `<@${match.participant2_id}>` : 'BYE';
                    
                    if (match.winner_id) {
                        const winner = match.winner_id === match.participant1_id ? p1 : p2;
                        const loser = match.winner_id === match.participant1_id ? p2 : p1;
                        roundText += `✅ **${winner}** beat ~~${loser}~~ (Match ID: ${match.id})\n`;
                    } else {
                        roundText += `⚔️ ${p1} vs ${p2} (Match ID: ${match.id})\n`;
                    }
                });

                embed.addFields({
                    name: `Round ${roundNum}`,
                    value: roundText || 'No matches',
                    inline: true
                });
            });

            const statusText = {
                'registration': '🔓 Open for signups',
                'active': '🔥 Battle in progress',
                'completed': '👑 Finished'
            };
            
            embed.addFields([
                {
                    name: '📊 Status',
                    value: statusText[tournament.status] || tournament.status,
                    inline: false
                },
                {
                    name: '👥 Players',
                    value: `${participants.length}/${tournament.max_participants}`,
                    inline: false
                },
                {
                    name: '🏆 Prize',
                    value: tournament.prize || 'Bragging rights!',
                    inline: false
                }
            ]);

            return embed;
        } catch (error) {
            console.error('Error generating bracket embed:', error);
            return null;
        }
    }

    async generateTournamentListEmbed(guildId) {
        try {
            const tournaments = await this.client.db.getTournamentsByGuild(guildId);
            
            const embed = new EmbedBuilder()
                .setTitle('🏆 Tournaments in PLOT')
                .setDescription('Jump in and show everyone what you got!')
                .setColor('#FFD700')
                .setTimestamp();

            if (tournaments.length === 0) {
                embed.setDescription('No tournaments yet! Ask an admin to start one 😎');
                return embed;
            }

            const activeTournaments = tournaments.filter(t => t.status !== 'completed').slice(0, 10);
            
            for (const tournament of activeTournaments) {
                const participants = await this.client.db.getTournamentParticipants(tournament.id);
                const statusEmoji = {
                    'registration': '�',
                    'active': '⚔️',
                    'completed': '👑'
                };
                
                const statusText = {
                    'registration': 'Join now!',
                    'active': 'Fighting!',
                    'completed': 'Done'
                };

                embed.addFields({
                    name: `${statusEmoji[tournament.status] || '❓'} ${tournament.name}`,
                    value: `${statusText[tournament.status]}\n${participants.length}/${tournament.max_participants} players\nPrize: ${tournament.prize || 'Bragging rights'}\nID: **${tournament.id}**`,
                    inline: false
                });
            }

            return embed;
        } catch (error) {
            console.error('Error generating tournament list:', error);
            return null;
        }
    }

    createTournamentButtons(tournamentId) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`tournament_join_${tournamentId}`)
                    .setLabel('Join')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId(`tournament_leave_${tournamentId}`)
                    .setLabel('Leave')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖'),
                new ButtonBuilder()
                    .setCustomId(`tournament_bracket_${tournamentId}`)
                    .setLabel('Bracket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👀'),
                new ButtonBuilder()
                    .setCustomId(`tournament_participants_${tournamentId}`)
                    .setLabel('Participants')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥')
            );

        return row;
    }
}

module.exports = TournamentManager;