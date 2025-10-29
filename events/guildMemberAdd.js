const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const guild = member.guild;
        
        try {
            const newInvites = await guild.invites.fetch();
            const oldInvites = client.invites.get(guild.id) || new Map();
            
            let usedInvite = null;
            let inviter = null;
            
            for (const [code, invite] of newInvites) {
                const oldInvite = oldInvites.get(code);
                if (oldInvite && invite.uses > oldInvite.uses) {
                    usedInvite = invite;
                    inviter = invite.inviter;
                    break;
                }
            }
            
            if (!usedInvite) {
                if (guild.vanityURLCode) {
                    const vanityInvite = newInvites.find(invite => invite.code === guild.vanityURLCode);
                    if (vanityInvite) {
                        usedInvite = vanityInvite;
                        inviter = null;
                    }
                }
            }
            
            client.invites.set(guild.id, newInvites);
            
            if (usedInvite && inviter) {
                await client.db.addInvite(guild.id, inviter.id, member.id, usedInvite.code);
            }
            
            if (config.autoRoleId) {
                try {
                    const role = guild.roles.cache.get(config.autoRoleId);
                    if (role) {
                        await member.roles.add(role);
                    }
                } catch (error) {
                    console.error('Failed to assign auto role:', error);
                }
            }
            
            const welcomeChannel = guild.channels.cache.get(config.welcomeChannelId);
            if (welcomeChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🎉 Welcome to PLOT!')
                    .setDescription(`Welcome ${member}, we're glad to have you in PLOT!`)
                    .setColor(config.embedColor)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                                        .setFooter({ text: 'PLOT', iconURL: client.user.displayAvatarURL() });
                
                if (inviter) {
                    const inviteCount = await client.db.getInviteCount(guild.id, inviter.id);
                    embed.addFields([
                        {
                            name: '🎫 Invited By',
                            value: `${inviter} (${inviteCount} invites)`,
                            inline: true
                        }
                    ]);
                } else if (usedInvite) {
                    embed.addFields([
                        {
                            name: '🎫 Joined Via',
                            value: usedInvite.code === guild.vanityURLCode ? 'Vanity URL' : 'Unknown Invite',
                            inline: true
                        }
                    ]);
                }
                
                await welcomeChannel.send({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};
