const { EmbedBuilder } = require('discord.js');

class GiveawayManager {
    constructor(client) {
        this.client = client;
        this.checkInterval = null;
    }
    
    start() {
        this.checkInterval = setInterval(() => {
            this.checkEndedGiveaways();
        }, 30000);
        
        console.log('Giveaway manager started');
    }
    
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    
    async checkEndedGiveaways() {
        try {
            const endedGiveaways = await this.client.db.getActiveGiveaways();
            
            for (const giveaway of endedGiveaways) {
                await this.endGiveaway(giveaway);
            }
        } catch (error) {
            console.error('Error checking ended giveaways:', error);
        }
    }
    
    async endGiveaway(giveaway) {
        try {
            const entries = await this.client.db.getGiveawayEntries(giveaway.id);
            
            const channel = await this.client.channels.fetch(giveaway.channel_id);
            if (!channel) return;
            
            const message = await channel.messages.fetch(giveaway.message_id);
            if (!message) return;
            
            let resultEmbed;
            
            if (entries.length === 0) {
                resultEmbed = new EmbedBuilder()
                    .setTitle('🎉 Giveaway Ended 🎉')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner:** No one entered the giveaway 😢`)
                    .setColor('#ff0000')
                    .setTimestamp()
                    .setFooter({ text: 'PLOT', iconURL: this.client.user.displayAvatarURL() });
            } else {
                const winners = this.selectWinners(entries, giveaway.winners);
                
                resultEmbed = new EmbedBuilder()
                    .setTitle('🎉 Giveaway Ended! 🎉')
                    .setDescription(`**Prize:** ${giveaway.prize}\n\n**Winner(s):**\n${winners.map(id => `<@${id}>`).join('\n')}\n\nCongratulations! 🎊`)
                    .setColor('#00ff00')
                    .setTimestamp()
                    .setFooter({ text: 'PLOT', iconURL: this.client.user.displayAvatarURL() });
                
                if (winners.length > 0) {
                    const congratsMessage = `🎉 Congratulations ${winners.map(id => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`;
                    await channel.send(congratsMessage);
                }
            }
            
            await message.edit({
                embeds: [resultEmbed],
                components: []
            });
            
            await this.client.db.endGiveaway(giveaway.id);
            
        } catch (error) {
            console.error(`Error ending giveaway ${giveaway.id}:`, error);
        }
    }
    
    selectWinners(entries, winnerCount) {
        const shuffled = [...entries].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(winnerCount, entries.length));
    }
}

module.exports = GiveawayManager;
