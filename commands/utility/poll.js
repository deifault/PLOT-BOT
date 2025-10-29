const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create interactive polls for your server!')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The poll question')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('options')
                .setDescription('Poll options separated by commas (max 10)')
                .setRequired(true))
        .setDefaultMemberPermissions(0),

    async execute(interaction, client) {
        const question = interaction.options.getString('question');
        const optionsStr = interaction.options.getString('options');
        
        const options = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
        
        if (options.length < 2) {
            return interaction.reply({
                content: '❌ You need at least 2 poll options!',
                ephemeral: true
            });
        }
        
        if (options.length > 10) {
            return interaction.reply({
                content: '❌ Maximum 10 poll options allowed!',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📊 ' + question)
            .setDescription('Click the buttons below to vote!')
            .setColor('#5865F2')
            .setFooter({ text: `Poll by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        
        let optionText = '';
        options.forEach((option, index) => {
            optionText += `${index + 1}️⃣ ${option}\n`;
        });
        embed.addFields([{ name: 'Options', value: optionText, inline: false }]);
        
        const buttons = [];
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        for (let i = 0; i < Math.min(options.length, 5); i++) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`poll_vote_${i}`)
                    .setLabel(`${i + 1}`)
                    .setEmoji(emojis[i])
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 5));
        const components = [row1];
        
        if (options.length > 5) {
            const buttons2 = [];
            for (let i = 5; i < Math.min(options.length, 10); i++) {
                buttons2.push(
                    new ButtonBuilder()
                        .setCustomId(`poll_vote_${i}`)
                        .setLabel(`${i + 1}`)
                        .setEmoji(emojis[i])
                        .setStyle(ButtonStyle.Primary)
                );
            }
            const row2 = new ActionRowBuilder().addComponents(buttons2);
            components.push(row2);
        }
        
        try {
            const message = await interaction.reply({ embeds: [embed], components, fetchReply: true });
            
            await client.db.createPoll(
                interaction.guild.id,
                interaction.channel.id,
                message.id,
                interaction.user.id,
                question,
                options
            );
            
        } catch (error) {
            console.error('Error creating poll:', error);
            await interaction.reply({
                content: '❌ Failed to create poll.',
                ephemeral: true
            });
        }
    }
};