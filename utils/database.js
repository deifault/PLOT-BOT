const sqlite3 = require('sqlite3').verbose();
const config = require('../config');

class Database {
    constructor() {
        this.db = new sqlite3.Database(config.databasePath);
        this.init();
    }

    init() {
        this.db.serialize(() => {
            this.db.run(`CREATE TABLE IF NOT EXISTS invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                inviter_id TEXT NOT NULL,
                invited_id TEXT NOT NULL,
                invite_code TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                reason TEXT,
                status TEXT DEFAULT 'open',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                closed_at DATETIME
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS mod_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                action TEXT NOT NULL,
                reason TEXT,
                duration INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS giveaways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                message_id TEXT NOT NULL,
                host_id TEXT NOT NULL,
                prize TEXT NOT NULL,
                winners INTEGER DEFAULT 1,
                end_time DATETIME NOT NULL,
                ended INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS giveaway_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                giveaway_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                FOREIGN KEY (giveaway_id) REFERENCES giveaways (id)
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS tournaments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                host_id TEXT NOT NULL,
                max_participants INTEGER DEFAULT 16,
                prize TEXT,
                status TEXT DEFAULT 'registration',
                bracket_type TEXT DEFAULT 'single_elimination',
                server_ip TEXT,
                tournament_date TEXT,
                signup_deadline TEXT,
                start_time DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            this.db.run(`ALTER TABLE tournaments ADD COLUMN server_ip TEXT`, () => {});
            this.db.run(`ALTER TABLE tournaments ADD COLUMN tournament_date TEXT`, () => {});
            this.db.run(`ALTER TABLE tournaments ADD COLUMN signup_deadline TEXT`, () => {});

            this.db.run(`CREATE TABLE IF NOT EXISTS tournament_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                ign TEXT NOT NULL,
                seed INTEGER,
                eliminated INTEGER DEFAULT 0,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
            )`);

            this.db.run(`ALTER TABLE tournament_participants ADD COLUMN ign TEXT`, () => {});
            this.db.run(`ALTER TABLE tournament_participants ADD COLUMN joined_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});

            this.db.run(`CREATE TABLE IF NOT EXISTS tournament_matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                round INTEGER NOT NULL,
                match_number INTEGER NOT NULL,
                participant1_id TEXT,
                participant2_id TEXT,
                winner_id TEXT,
                status TEXT DEFAULT 'pending',
                scheduled_time DATETIME,
                completed_time DATETIME,
                FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS polls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                message_id TEXT NOT NULL,
                creator_id TEXT NOT NULL,
                question TEXT NOT NULL,
                options TEXT NOT NULL,
                end_time DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                poll_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                option_index INTEGER NOT NULL,
                FOREIGN KEY (poll_id) REFERENCES polls (id)
            )`);

            this.db.run(`CREATE TABLE IF NOT EXISTS leaderboards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                game_type TEXT NOT NULL,
                score INTEGER DEFAULT 0,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                achievements TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

        });
    }

    addInvite(guildId, inviterId, invitedId, inviteCode) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO invites (guild_id, inviter_id, invited_id, invite_code) VALUES (?, ?, ?, ?)',
                [guildId, inviterId, invitedId, inviteCode],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    getInviteCount(guildId, userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT COUNT(*) as count FROM invites WHERE guild_id = ? AND inviter_id = ?',
                [guildId, userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    }

    createTicket(guildId, channelId, userId, reason) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO tickets (guild_id, channel_id, user_id, reason) VALUES (?, ?, ?, ?)',
                [guildId, channelId, userId, reason],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    closeTicket(channelId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE tickets SET status = "closed", closed_at = CURRENT_TIMESTAMP WHERE channel_id = ?',
                [channelId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    addModLog(guildId, userId, moderatorId, action, reason, duration = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO mod_logs (guild_id, user_id, moderator_id, action, reason, duration) VALUES (?, ?, ?, ?, ?, ?)',
                [guildId, userId, moderatorId, action, reason, duration],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    addWarning(guildId, userId, moderatorId, reason) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)',
                [guildId, userId, moderatorId, reason],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    getWarnings(guildId, userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC',
                [guildId, userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    createGiveaway(guildId, channelId, messageId, hostId, prize, winners, endTime) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO giveaways (guild_id, channel_id, message_id, host_id, prize, winners, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [guildId, channelId, messageId, hostId, prize, winners, endTime],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    addGiveawayEntry(giveawayId, userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)',
                [giveawayId, userId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    getActiveGiveaways() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM giveaways WHERE ended = 0 AND end_time <= CURRENT_TIMESTAMP',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    getGiveawayEntries(giveawayId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?',
                [giveawayId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => row.user_id));
                }
            );
        });
    }

    endGiveaway(giveawayId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE giveaways SET ended = 1 WHERE id = ?',
                [giveawayId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    createTournament(guildId, name, description, hostId, maxParticipants, prize, bracketType, serverIp, tournamentDate, signupDeadline) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO tournaments (guild_id, name, description, host_id, max_participants, prize, bracket_type, server_ip, tournament_date, signup_deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [guildId, name, description, hostId, maxParticipants, prize, bracketType, serverIp, tournamentDate, signupDeadline],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    joinTournament(tournamentId, userId, ign) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO tournament_participants (tournament_id, user_id, ign) VALUES (?, ?, ?)',
                [tournamentId, userId, ign],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    leaveTournament(tournamentId, userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM tournament_participants WHERE tournament_id = ? AND user_id = ?',
                [tournamentId, userId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    getTournament(tournamentId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM tournaments WHERE id = ?',
                [tournamentId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    getTournamentsByGuild(guildId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM tournaments WHERE guild_id = ? ORDER BY created_at DESC',
                [guildId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    getTournamentParticipants(tournamentId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM tournament_participants WHERE tournament_id = ? AND eliminated = 0 ORDER BY seed',
                [tournamentId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    updateTournamentStatus(tournamentId, status) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE tournaments SET status = ? WHERE id = ?',
                [status, tournamentId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    createMatch(tournamentId, round, matchNumber, participant1Id, participant2Id) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO tournament_matches (tournament_id, round, match_number, participant1_id, participant2_id) VALUES (?, ?, ?, ?, ?)',
                [tournamentId, round, matchNumber, participant1Id, participant2Id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    updateMatchResult(matchId, winnerId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE tournament_matches SET winner_id = ?, status = "completed", completed_time = CURRENT_TIMESTAMP WHERE id = ?',
                [winnerId, matchId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    getTournamentMatches(tournamentId, round = null) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM tournament_matches WHERE tournament_id = ?';
            let params = [tournamentId];
            
            if (round !== null) {
                query += ' AND round = ?';
                params.push(round);
            }
            
            query += ' ORDER BY round, match_number';
            
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getMatch(matchId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM tournament_matches WHERE id = ?',
                [matchId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    createPoll(guildId, channelId, messageId, creatorId, question, options, endTime) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO polls (guild_id, channel_id, message_id, creator_id, question, options, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [guildId, channelId, messageId, creatorId, question, JSON.stringify(options), endTime],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    getPollByMessageId(messageId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM polls WHERE message_id = ?',
                [messageId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    addPollVote(pollId, userId, optionIndex) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO poll_votes (poll_id, user_id, option_index) VALUES (?, ?, ?)',
                [pollId, userId, optionIndex],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    updateLeaderboard(guildId, userId, gameType, scoreChange, winChange, lossChange) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO leaderboards (guild_id, user_id, game_type, score, wins, losses, last_updated) VALUES (?, ?, ?, COALESCE((SELECT score FROM leaderboards WHERE guild_id = ? AND user_id = ? AND game_type = ?), 0) + ?, COALESCE((SELECT wins FROM leaderboards WHERE guild_id = ? AND user_id = ? AND game_type = ?), 0) + ?, COALESCE((SELECT losses FROM leaderboards WHERE guild_id = ? AND user_id = ? AND game_type = ?), 0) + ?, CURRENT_TIMESTAMP)',
                [guildId, userId, gameType, guildId, userId, gameType, scoreChange, guildId, userId, gameType, winChange, guildId, userId, gameType, lossChange],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    getLeaderboard(guildId, gameType, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM leaderboards WHERE guild_id = ? AND game_type = ? ORDER BY score DESC LIMIT ?',
                [guildId, gameType, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;
