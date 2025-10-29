const { Events, Collection } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('tournament_signup_')) {
                const tournamentId = parseInt(interaction.customId.split('_')[2]);
                const ign = interaction.fields.getTextInputValue('ign');
                
                try {
                    const tournament = await client.db.getTournament(tournamentId);
                    if (!tournament) {
                        return interaction.reply({
                            content: '❌ Tournament not found.',
                            ephemeral: true
                        });
                    }
                    
                    if (tournament.status === 'signups_closed') {
                        return interaction.reply({
                            content: '❌ Signups are closed for this tournament.',
                            ephemeral: true
                        });
                    }
                    
                    const participants = await client.db.getTournamentParticipants(tournamentId);
                    if (participants.some(p => p.user_id === interaction.user.id)) {
                        return interaction.reply({
                            content: '❌ You\'re already registered for this tournament!',
                            ephemeral: true
                        });
                    }
                    
                    await client.db.joinTournament(tournamentId, interaction.user.id, ign);
                    
                    const { EmbedBuilder } = require('discord.js');
                    const embed = new EmbedBuilder()
                        .setTitle('⚔️ Successfully Registered!')
                        .setDescription(`Welcome to **${tournament.name}**!`)
                        .setColor('#00FF00')
                        .setDescription(`You're now registered for **${tournament.name}** with IGN: **${ign}**\n\nGood luck! 🍀`)
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } catch (error) {
                    console.error('Error processing tournament signup:', error);
                    await interaction.reply({
                        content: '❌ Failed to register for tournament. Please try again.',
                        ephemeral: true
                    });
                }
            }
            return;
        }
        
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        const { cooldowns } = client;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1000);
                return interaction.reply({
                    content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
                    ephemeral: true
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            
            const errorMessage = {
                content: 'There was an error while executing this command!',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },
};
