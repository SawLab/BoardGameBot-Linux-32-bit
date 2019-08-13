var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const cron = require('node-cron');
let shell = require("shelljs");

const MAX_GAME_NAME_LENGTH = 32;
const MAX_NICKNAME_LENGTH = 10;
const MAX_USERNAME_LENGTH = 32;
const MIN_USERNAME_LENGTH = 2;

var db = new sqlite3.Database('./BoardGameBot.db', (err) => {
	if (err)
	{
		return console.error(err.message);
	}
	console.log('Connected to BoardGameBot database');
});
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
	console.log('Starting cron jobs...');
	StartCronJobs();
});

bot.on('guildMemberAdd', function (member)
{
	let message = `Welcome <@!${member.id}>! Type **!addme** to get started or **!help** to see all my commands.`;
	SendMessageToServer(message, auth.channelID);
});

bot.on('guildMemberRemove', (member, evt) => {
	//Automatically remove users from the database when they leave the channel.
	 new Promise((resolve,reject) => {
		let message = `<@!${member.id}> has left the channel. Deleting their user data...`;
		SendMessageToServer(message, auth.channelID);
		resolve();
	})
	.then(() => {
		RemoveMe(member.id, auth.channelID);
	});
});

bot.on('message', function (user, userID, channelID, message, evt) {
	// Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
	if(message.toLowerCase().includes('good bot') || message.toLowerCase().includes('goodbot')) {
		if (message.toLowerCase().includes('not') || message.toLowerCase().includes('isnt') || message.toLowerCase().includes('isn\'t')) { SendMessageToServer(':cry:', channelID); }
		else { SendMessageToServer(':blush:', channelID); }
	}
	if(message.toLowerCase().includes('bad bot') || message.toLowerCase().includes('badbot')) {
		if (message.toLowerCase().includes('not') || message.toLowerCase().includes('isnt') || message.toLowerCase().includes('isn\'t')) { SendMessageToServer(':blush:', channelID); }
		else { SendMessageToServer(':cry:', channelID); }
	}
	
	if(message.toLowerCase().includes('worst bot') || message.toLowerCase().includes('worstbot')) 
	{
		if (message.toLowerCase().includes('not') || message.toLowerCase().includes('isnt') || message.toLowerCase().includes('isn\'t')) { SendMessageToServer(':confused:', channelID); }
		else
		{
			SendMessageToServer(`Setting <@!${userID}> total wins to 0...\nSetting weekly wins to 0...\nSetting monthly wins to 0...\nBanning user...\nJust kidding! :smiling_imp:`, channelID);
		}
	}
	
    if (message.substring(0, 1) == '!') {
		
		if (channelID in bot.directMessages) {	//block direct message commands
			let message = 'Your attempts to be sneaky are futile. My commands only work in the main channel.';
			return SendMessageToServer(message, channelID);
		}
		
        var args = message.substring(1).split(' ');
        var cmd0 = args[0].toLowerCase();
		console.log('cmd0: ' + cmd0);
		var cmd1 = args[1];
		console.log('cmd1: ' + cmd1);
		var cmd2 = args[2];
		console.log('cmd2: ' + cmd2);
       
        args = args.splice(1);
        switch(cmd0) {
            case 'ping':
                Ping(channelID);
				break;
			case 'help':
				Help(channelID);
				break;
			case 'leaderboard': 	
				Leaderboard(channelID, cmd1);
				break;				
			case 'addme':
				AddMe(userID, channelID);
				break;
			case 'removeme':
				RemoveMe(userID, channelID);
				break;
			case 'win':
				AddWin(userID, channelID, cmd1);
				break;
			case 'loss':
				AddLoss(userID, channelID, cmd1);
				break;			
			case 'myscore':
				ViewMyScore(userID, channelID, cmd1);
				break;
			case 'namechange':
				ChangeUserName(userID, channelID);
				break;
			case 'source':
				ViewSourceCode(channelID);
				break;
			case 'deleteallusers':
				DeleteAllUsers(userID, channelID);
				break;
			case 'addgame':
				AddGame(userID, channelID, cmd1, cmd2);
				break;
			case 'viewgames':
				ViewGames(channelID);
				break;
			case 'admin':
				ViewAdminCommands(channelID);
				break;
			case 'givewin':
				GiveUserWin(userID, channelID, cmd1, cmd2);
				break;
			case 'giveloss':
				GiveUserLoss(userID, channelID, cmd1, cmd2);
				break;
			case 'deleteuser':
				DeleteUser(userID, channelID, cmd1);
				break;
			case 'deletegame':
				DeleteGame(userID, channelID, cmd1);
				break;
			case 'updategamename':
				UpdateGameName(userID, channelID, cmd1, cmd2);
				break;
			case 'updatenickname':
				UpdateNickname(userID, channelID, cmd1, cmd2);
				break;
			case 'viewusers':
				ViewAllUsers(userID, channelID);
				break;
			case 'viewwins':
				ViewAllWins(userID, channelID, cmd1);
				break;
			case 'adduser':
				AddUser(userID, channelID, cmd1);
				break;
			case 'addadmin':
				AddAdmin(userID, channelID, cmd1);
				break;
			case 'deleteadmin':
				DeleteAdmin(userID, channelID, cmd1);
				break;
			case 'resetuser':
				ResetUserWins(userID, channelID, cmd1);
				break;
			case 'viewadmins':
				ViewAdmins(channelID);
				break;
			case 'headadmin':
				ViewHeadAdminCommands(userID, channelID);
				break;
			case 'duel':
				DuelUser(userID, channelID, cmd1);
				break;
			case 'fight':
				Fight(userID, channelID, cmd1, cmd2);
				break;
			case 'restoredatabase':
				RestoreDatabase(userID, channelID, cmd1);
				break;
			case 'undorestore':
				UndoDatabaseRestore(userID, channelID);
				break;
			case 'viewbackups':
				ViewDatabaseBackupTimes(userID, channelID);
				break;
			case 'deleteallgames':
				DeleteAllGames(userID, channelID);
				break;
			case 'resetallusers':
				ResetAllUsers(userID, channelID);
				break;
			case 'about':
				About(channelID);
				break;
			case 'bug':
				BugReport(channelID);
				break;
			default:
				IncorrectCommand(channelID);
				break;
         }
     }
});

//Decides whether to print the leaderboard for total wins or specific game wins
function Leaderboard(channelID, game)
{
	if (game == null) {
		TotalWinsLeaderboard(channelID);
	}
	else {
		GameWinsLeaderboard(channelID, game);
	}
}

//Prints the top 3 scores and all players that have those scores for the selected game
function GameWinsLeaderboard(channelID, game)
{
	var gameName;
	var gameID;
	
	let sql = `SELECT gameID, gameName FROM Games WHERE gameNickname = ? COLLATE NOCASE`;
	db.get(sql, [game], function(err, row) { 				//First check to make sure the game exists and grab its full name.
		if(err) {
			return console.error(err.message);
		}
		if (row == null) {
			let message = "Invalid nickname. Type **!viewgames** for a list of valid nicknames.";
			return SendMessageToServer(message, channelID);
		}
		gameName = row.gameName;
		gameID = row.gameID;
		
		sql = `SELECT userID, wins FROM WinTable WHERE gameID = ? ORDER BY wins DESC`
			db.all(sql,[gameID],
			function(err, rows) {
				if (err) { return console.error(error.message); }
				if (rows == null) {
					let message = 'There are no users in my system to show a leaderboard of.';
					return SendMessageToServer(message, channelID);	
				}
				
				var messageToSend = `__**Top ${gameName} winners:**__ \n`;
				var i;
				
				var firstScore = rows[0].wins; //Top score will always be in the first element and we've confirmed there is at least one element in rows
				var secondScore;
				var thirdScore;
				
				var firstWinners = [];
				var secondWinners = [];
				var thirdWinners = [];
				
				for(i = 0; i < rows.length; i++) {
					if (rows[i].wins === firstScore ) {	//add all users that share the top score
						firstWinners.push(rows[i]);
					}
					else {
						secondScore = rows[i].wins;	//set the second place score and stop iterating to start search for second place
						break; 
					}	
				}
				
				for (; i < rows.length; i++) {
					if (rows[i].wins === secondScore) {	//add all users that share the second place score
						secondWinners.push(rows[i]);
					}
					else {
						thirdScore = rows[i].wins;	//set the third place wins and stop iterating to start search for third place
						break;
					}
				}
				
				for (; i < rows.length; i++) {
					if (rows[i].wins === thirdScore) { //add all users that share the third place score
						thirdWinners.push(rows[i]);
					}
					else {
						break;	//stop iterating. No more users we need to find.
					}
				}
				
				messageToSend = messageToSend + `:first_place: `;
				if(firstWinners.length > 0 && firstScore > 0) {;	//append any first place winners to message. Ignore if the score is 0
					firstWinners.forEach(function(winner) {
						messageToSend = `${messageToSend} <@!${winner.userID}> `;				
					});
					messageToSend = messageToSend + ` - ${firstScore}`;
				}
						
				messageToSend = messageToSend + `\n:second_place: `; 
				if (secondWinners.length > 0 && secondScore > 0) { //append any third place winners to message. Ignore if the score is 0
					secondWinners.forEach(function(winner) {
						messageToSend = `${messageToSend} <@!${winner.userID}> `;
					});
					messageToSend = messageToSend + ` - ${secondScore}`;
				}
				
				messageToSend = messageToSend + `\n:third_place: `;
				if (thirdWinners.length > 0 && thirdScore > 0) { //append any third place winners to message. Ignore if the score is 0
					thirdWinners.forEach(function(winner) {
						messageToSend = `${messageToSend} <@!${winner.userID}> `;
					});
					messageToSend = messageToSend + ` - ${thirdScore}`;
				}
				
				SendMessageToServer(messageToSend, channelID);	
		});
	});		
}

//Prints the top 3 scores and all players that have those scores for the selected game
function TotalWinsLeaderboard(channelID) {
		
	let sql = `SELECT userID, totalWins wins FROM Users ORDER BY wins DESC`
	db.all(sql,[],
	function(err, rows) {
		if (err) { return console.error(error.message); }
		if (rows == null) {
			let message = 'There are no users in my system to show a leaderboard of.';
			return SendMessageToServer(message, channelID);	
		}
		
		var messageToSend = `__**Top winners across all games:**__ \n`;
		var i;
		
		var firstScore = rows[0].wins; //Top score will always be in the first element and we've confirmed there is at least one element in rows
		var secondScore;
		var thirdScore;
		
		var firstWinners = [];
		var secondWinners = [];
		var thirdWinners = [];
		
		for(i = 0; i < rows.length; i++) {
			if (rows[i].wins === firstScore ) {	//add all users that share the top score
				firstWinners.push(rows[i]);
			}
			else {
				secondScore = rows[i].wins;	//set the second place score and stop iterating to start search for second place
				break; 
			}	
		}
		
		for (; i < rows.length; i++) {
			if (rows[i].wins === secondScore) {	//add all users that share the second place score
				secondWinners.push(rows[i]);
			}
			else {
				thirdScore = rows[i].wins;	//set the third place wins and stop iterating to start search for third place
				break;
			}
		}
		
		for (; i < rows.length; i++) {
			if (rows[i].wins === thirdScore) { //add all users that share the third place score
				thirdWinners.push(rows[i]);
			}
			else {
				break;	//stop iterating. No more users we need to find.
			}
		}
		
		messageToSend = messageToSend + `:first_place: `;
		if(firstWinners.length > 0 && firstScore > 0) {;	//append any first place winners to message. Ignore if the score is 0
			firstWinners.forEach(function(winner) {
				messageToSend = `${messageToSend} <@!${winner.userID}> `;				
			});
			messageToSend = messageToSend + ` - ${firstScore}`;
		}
				
		messageToSend = messageToSend + `\n:second_place: `; 
		if (secondWinners.length > 0 && secondScore > 0) { //append any third place winners to message. Ignore if the score is 0
			secondWinners.forEach(function(winner) {
				messageToSend = `${messageToSend} <@!${winner.userID}> `;
			});
			messageToSend = messageToSend + ` - ${secondScore}`;
		}
		
		messageToSend = messageToSend + `\n:third_place: `;
		if (thirdWinners.length > 0 && thirdScore > 0) { //append any third place winners to message. Ignore if the score is 0
			thirdWinners.forEach(function(winner) {
				messageToSend = `${messageToSend} <@!${winner.userID}> `;
			});
			messageToSend = messageToSend + ` - ${thirdScore}`;
		}
		
		SendMessageToServer(messageToSend, channelID);	
});

}

//Increments the user's specified game wins by 1 then sets their total wins to the sum of all their game wins.
function AddWin(userID, channelID, gameNickname)
{
	if (gameNickname == null) {
		let message = "The nickname for the game must be specfied. Type **!viewgames** to see a list of games and their nicknames. Format: **!win {nickname}**";
		SendMessageToServer(message, channelID);
		return;
	}
	
	db.serialize(function() {
		var totalWins;
		var gameWins;
		var weeklyWins;
		var monthlyWins;
		var gameName;
		var gameID;
		
		let sql = `SELECT gameID, gameName FROM Games WHERE gameNickname = ? COLLATE NOCASE`; //Get the gameID and gameName
		db.get(sql, [gameNickname], function(err, row) {
			if (err) { return console.error(err.message); }
			if (row == null) {
				let message = `The nickname **${gameNickname}** does not exist. Type **!viewgames** for a list of valid nicknames.`;
				return SendMessageToServer(message, channelID);
			}
			gameID = row.gameID;
			gameName = row.gameName;
			
			sql = `SELECT wins FROM WinTable WHERE userID = ? AND gameID = ?`; //Get the current number of wins for the user i
			db.get(sql, [userID, gameID], function(err, row) {
				if (err) { return console.error(err.message); }
				if (row == null) {
					let message = `<@!${userID}> is not in my system! Type **!addme** so you can start tracking your wins.`
					return SendMessageToServer(message, channelID);
				}
				gameWins = row.wins;
				gameWins = gameWins + 1;	//increment game win count
				
				sql = `UPDATE WinTable SET wins = ? WHERE userID = ? AND gameID = ?`; //set the game win count to the new value
				db.run(sql, [gameWins, userID, gameID], function(err) {
					if (err) { return console.error(err.message); }
					
					sql = `SELECT SUM(wins) totalWins FROM WinTable WHERE userID = ?`; //sum all the wins of the user
					db.get(sql, [userID], function(err, row) {
						if (err) { return console.error(err.message); }
						
						totalWins = row.totalWins; 
						
						sql = `SELECT weeklyWins, monthlyWins FROM Users WHERE userID = ?`;
						db.get(sql,[userID], function(err, row) {
							if (err) { console.error(err.message); }
							
							weeklyWins = row.weeklyWins + 1;
							
							monthlyWins = row.monthlyWins + 1;
							
							sql = `UPDATE Users SET totalWins = ?, weeklyWins = ?, monthlyWins = ? Where userID = ?`; //set the total wins to the sum
							db.run(sql, [totalWins, weeklyWins, monthlyWins, userID], function(err) {
								if (err) { return console.error(err.message); }
								let message = `Congratulations <@!${userID}>! You now have **${gameWins}** wins in **${gameName}** and your total wins are now **${totalWins}**. :gem:`;
								SendMessageToServer(message, channelID);
							});
						});	
					});
				});
			});
		});	
	});
}

//Decrements the user's specified game wins by 1 then sets their total wins to the sum of all their game wins.
function AddLoss(userID, channelID, gameNickname)
{
	if (gameNickname == null) {
		let message = "The nickname for the game must be specfied. Type **!viewgames** to see a list of games and their nicknames. Format: **!loss {nickname}**";
		SendMessageToServer(message, channelID);
		return;
	}
	
	db.serialize(function() {
		var totalWins;
		var gameWins;
		var gameName;
		var gameID;
		var weeklyWins;
		var monthlyWins;
		
		let sql = `SELECT gameID, gameName FROM Games WHERE gameNickname = ? COLLATE NOCASE`; //Get the gameID and gameName
		db.get(sql, [gameNickname], function(err, row) {
			if (err) { return console.error(err.message); }
			if (row == null) {
				let message = `The nickname **${gameNickname}** does not exist. Type **!viewgames** for a list of valid nicknames.`;
				return SendMessageToServer(message, channelID);
			}
			gameID = row.gameID;
			gameName = row.gameName;
			
			sql = `SELECT wins FROM WinTable WHERE userID = ? AND gameID = ?`; //Get the current number of wins for the user i
			db.get(sql, [userID, gameID], function(err, row) {
				if (err) { return console.error(err.message); }
				if (row == null) {
					let message = `<@!${userID}> is not in my system! Type **!addme** so you can start tracking your wins.`
					return SendMessageToServer(message, channelID);
				}
				gameWins = row.wins;
				gameWins = gameWins - 1;	//decrement game win count
				
				if (gameWins < 0) {
					let message = `<@!${userID}> cannot have less than 0 wins in **${gameName}**.`;
					return SendMessageToServer(message, channelID);
				}
				
				sql = `UPDATE WinTable SET wins = ? WHERE userID = ? AND gameID = ?`; //set the game win count to the new value
				db.run(sql, [gameWins, userID, gameID], function(err) {
					if (err) { return console.error(err.message); }
					
					sql = `SELECT SUM(wins) totalWins FROM WinTable WHERE userID = ?`; //sum all the wins of the user
					db.get(sql, [userID], function(err, row) {
						if (err) { return console.error(err.message); }
						
						totalWins = row.totalWins; 
						
						sql = `SELECT weeklyWins, monthlyWins FROM Users WHERE userID = ?`;
						db.get(sql,[userID], function(err, row) {
							if (err) { console.error(err.message); }
							weeklyWins = row.weeklyWins - 1; //Decrement their weekly wins
							weeklyWins = (weeklyWins < 0)  ? 0 : weeklyWins;	//if weeklyWins is less than 0 set weeklyWins to 0
							
							monthlyWins = row.monthlyWins - 1; //Decrement their monthly wins
							monthlyWins = (monthlyWins < 0)  ? 0 : monthlyWins;	//if monthlyWins is less than 0 set monthlyWins to 0
						
							sql = `UPDATE Users SET totalWins = ?, weeklyWins = ?, monthlyWins = ? Where userID = ?`; //set the total wins to the sum
							db.run(sql, [totalWins, weeklyWins, monthlyWins, userID], function(err) {
								if (err) { return console.error(err.message); }
								let message = `<@!${userID}> now has **${gameWins}** wins in **${gameName}** and their total wins have been reduced to **${totalWins}**. :bomb: `;
								SendMessageToServer(message, channelID);
							});
						});
					});
				});
			});
		});	
	});
}

//Adds the user to the database. If user already exists, let the user know.
function AddMe(userID, channelID)
{	
	db.serialize(function() {
		
		var gameIDs = [];
	
		let sql = `INSERT INTO Users(userID) VALUES(?)`;
		db.run(sql, [userID], function(err) {
			if(err)
			{
				if(err.message.includes("SQLITE_CONSTRAINT"))
				{
					let message = `<@!${userID}> already exists in my system!`;
					SendMessageToServer(message, channelID);
				}
				return console.error(err.message);
			}
			
			sql = `SELECT gameID from Games`;
			 db.all(sql, [], function(err, rows) {
				if (err) {
					return console.error(err.message);
				}	
				rows.forEach(function(row) {
					gameIDs.push(row.gameID);
				});	
				
				gameIDs.forEach( function(gameID) {			
					sql = `INSERT INTO WinTable(userID, gameID) VALUES(?, ?)`;
					db.run(sql, [userID, gameID], function(err) {
						if (err) {
							console.error(err.message);
							let message = 'ERROR: Could not add user to the win table.';
							SendMessageToServer(message, channelID);
						}						
					});
				});
				let message = `<@!${userID}> is now ready to start tracking their wins! :thumbsup:`;
				SendMessageToServer(message, channelID);
			});	
		});	 									
	});
}

//Allows the player to remove themeselves from the database
function RemoveMe(userID, channelID)
{
	let sql = `SELECT totalWins FROM Users WHERE userID = ?`;	//first checks to make sure the user is in the system
	db.get(sql, [userID], function(err,row) {
		if (row == null) {
			let message = `<@!${userID}> must first type **!addme** before they can be deleted!`
			return SendMessageToServer(message, channelID);
		}
		if (err) {
			return console.error(err.message);
		}
		
		sql = 'DELETE FROM Users WHERE userID = ?';	//Deletes the user from the Users table
		db.run(sql, [userID], function(err) {
			if (err) {
				return console.error(err.message);
			}
		});
		
		sql = 'DELETE FROM WinTable WHERE userID = ?';	//Deletes all the User's records in the win table
		db.run(sql, [userID], function(err) {
			if (err) {
				console.error(err.message);
			}
		});
		
		let message = `<@!${userID}> has been deleted from the database.`
						+ `\nSorry to see you go... :cry: `;
			SendMessageToServer(message, channelID);
	});	
}

//Pings the bot
function Ping(channelID)
{					
	let message = 'Pong :ping_pong:';
	SendMessageToServer(message, channelID);
}

//Prints message if command is not recognized.
function IncorrectCommand(channelID)
{
	let message = 'Command not recognized. Type **!help** for a list of approved commands. :x:';
	SendMessageToServer(message, channelID);
}

//Prints all the approved commands in the channel
function Help(channelID)
{
	let message = 'Approved Commands:'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!addme** - adds you to the database so you can start tracking your wins!'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!leaderboard** - prints the top 3 users across all games'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!leaderboard {nickname}** - prints the top 3 users for the specified game'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!win {nickname}** - adds a win to your account for the specified game'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!loss {nickname}** - removes a win from your account for the specified game'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!myscore** - view your total wins'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!myscore {nickname}** - view your total wins for the specified game'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!viewgames** - view list of all games and their nicknames'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!duel {@userMention}** - duel the selected user. Most wins per game wins!'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!source** - view my source code'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!admin** - view admin commands'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!viewadmins** - view a list of all admins'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!about** - view why I was created!'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!bug** - view how to report a bug or issue'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t**!help** - prints the help screen';
	SendMessageToServer(message, channelID);
}

//Sends a message to the desgignated channel
function SendMessageToServer(messageToSend, channelID)
{
	bot.sendMessage({
		to: channelID,
		message: messageToSend
	});
}

//Decides to either print the user's total wins or the user's wins for the specified game
function ViewMyScore(userID, channelID, game)
{
	if (game == null) {
		ViewMyTotalScore(userID, channelID);
	}
	else {
		ViewMyGameScore(userID, channelID, game);
	}
}

//Allows the user to view their total wins for the specified game
function ViewMyGameScore(userID, channelID, game)
{
	var gameName;
	var gameID;
	
	let sql = `SELECT gameID, gameName FROM Games WHERE gameNickname = ? COLLATE NOCASE`;	//Check if the game exists, if so grab its full name and gameID
	db.get(sql, [game], function(err, row) {
		if (row == null) {
			let message = `**${game}** is an invalid nickname. Type !viewgames for a list of valid nicknames.`;
			return SendMessageToServer(message, channelID);
		}
		if (err) {
			return console.error(err.message);
		}
		gameName = row.gameName;
		gameID = row.gameID;
		
	    sql = `SELECT wins FROM WinTable WHERE userID = ? AND gameID = ?`;
		db.get(sql, [userID, gameID], function(err, row) {
			if (row == null) {
				let message = `<@!${userID}> does not exist in my system! Type **!addme** to be added.`;
				return SendMessageToServer(message, channelID);
			}
			let message = `<@!${userID}> has **${row.wins}** wins for **${gameName}**.`;
			SendMessageToServer(message, channelID);
		});
	});	
}

//Allows the user to view personal total wins score.
function ViewMyTotalScore(userID, channelID)
{
	let sql = "SELECT totalWins wins FROM Users WHERE userID = ?";
	db.get(sql, [userID], function(err, row) {
		if(err)	{
			return console.error(err.message);
		}
		if (row == null) {
			let message = `<@!${userID}> does not exist in my system! Type **!addme** to be added.`;
			return SendMessageToServer(message, channelID);
		}
		let message = `Total wins for <@!${userID}> is: **${row.wins}**`;
		SendMessageToServer(message, channelID);
	});
}

//Print the link to the source code for this bot
function ViewSourceCode(channelID)
{
	let message = 'Enter my secret chambers...'
				+ '\nhttps://github.com/SawLab/BoardGameBot-Linux-32-bit/blob/master/bot.js';
	SendMessageToServer(message, channelID);
}

//Prints list of all games and their nicknames
function ViewGames(channelID)
{
	let sql = 'SELECT gameName name, gameNickname nick FROM Games ORDER BY gameName ASC';
	
	db.all(sql, [], function(err, rows) {
		if (err) {
			return console.error(err.message);
		}
		
		if (rows == null) {
			let message = "No games to view. Admin must add a board game using the !addgame command."
			SendMessageToServer(message, channelID);
		}
		
		let message = "__**Game Name: Nickname**__\n";
		rows.forEach(row => {
			message = `${message}${row.name}: ${row.nick}\n`;	
		});		
		SendMessageToServer(message, channelID);
	});
}

//Prints list of commands only the admins can use
function ViewAdminCommands(channelID)
{
	let message = 'Admin Commands:'
				+ '\n\t\t\t\t\t\t\t\t\t**!addgame {New_Game_Name} {nickname}** - adds a game to the game list and begins tracking wins for all users'
				+ '\n\t\t\t\t\t\t\t\t\t**!updategamename {nickname} {New_Game_Name}** - updates the name of an existing game'
				+ '\n\t\t\t\t\t\t\t\t\t**!updatenickname {oldnickname} {newnickname}** - updates the nickname of an existing game'
				+ '\n\t\t\t\t\t\t\t\t\t**!givewin {@userMention}{nickname}** - add a win to the selected user'
				+ '\n\t\t\t\t\t\t\t\t\t**!giveloss {@userMention} {nickname}** - remove a win from the selected user'
				+ '\n\t\t\t\t\t\t\t\t\t**!adduser {@userMention}** - force two users to duel'
				+ '\n\t\t\t\t\t\t\t\t\t**!fight {@user1Mention} {@user2Mention}** - adds the specified user to the database'
				+ '\n\t\t\t\t\t\t\t\t\t**!resetuser {@userMention}** - resets all the specified user\'s wins back to 0'
				+ '\n\t\t\t\t\t\t\t\t\t**!viewusers** - displays all recorded users in my system'
				+ '\n\t\t\t\t\t\t\t\t\t**!viewwins** - displays all recorded users total wins'
				+ '\n\t\t\t\t\t\t\t\t\t**!viewwins {nickname}** - displays all recorded users wins for the specified game'
				+ '\n\t\t\t\t\t\t\t\t\t**!headadmin** - displays head admin commands';
	SendMessageToServer(message, channelID);
}

//Prints a list of the head admin and all other added admins
function ViewAdmins(channelID)
{
	var headAdminID = auth.headAdminID;
	var adminIDs = auth.adminIDs;
	
	let message = `__**Head Admin:**__\n<@!${headAdminID}>\n\n__**Admins:**__\n`;
	
	adminIDs.forEach(function(id) {
		message = `${message}<@!${id}>\n`;
	});
	
	SendMessageToServer(message, channelID);
}

//Duels the user with the seleted user. The user with the most wins per game wins.
function DuelUser(userID, channelID, userToDuel)
{
	var userToDuelID;
	
	var user1WinRecords;
	var user2WinRecords;
	
	var user1VictoryPoints = 0;
	var user2VictoryPoints = 0;
	var numOfTies = 0;
	
	var numGames = 0;
	
	if (userToDuel == null) {
		let message = `Missing user to duel. Format: **!duel {@userMention}**`;
		return SendMessageToServer(message, channelID);
	}
	
	if (!CheckMentionFormat(userToDuel)) {
		let message = `Incorrect user format. Format: **!duel {@userMention}**`;
		return SendMessageToServer(message, channelID);
	}

	
	userToDuelID = GetIDFromMention(userToDuel);

	if (userToDuelID ==='586429426133106699' || userID === '586429426133106699') { //check if dueling the bot
		let message = `I win. Don\'t even try.`;
		return SendMessageToServer(message, channelID);
	}
	

	let sql = `SELECT gameID, wins FROM WinTable WHERE userID = ? ORDER BY gameID`; //get user1 win records
	db.all(sql, [userID], function(err, rows) {
		if (err) { return console.error(err.message); }
		if (rows.length === 0) {
			let message = `No win records for <@!${userID}>. They must type **!addme** or a game needs to be added.`;
			return SendMessageToServer(message, channelID);
		}
		user1WinRecords = rows;
		
		sql = `SELECT gameID, wins FROM WinTable WHERE userID = ? ORDER BY gameID`; //get user2 win records
		db.all(sql, [userToDuelID], function(err, rows) {
			if (err) { return console.error(err.message); }
			if (rows.length === 0) {
				let message = `No win records for <@!${userToDuelID}>. They must type **!addme** or a game needs to be added.`;
				return SendMessageToServer(message, channelID);
			}
			user2WinRecords = rows;
			
			if (user1WinRecords.length != user2WinRecords.length) {
				let userIssue = (user1WinRecords.length > user2WinRecords.length) ? `<@!${userToDuelID}>` : `<@!${userID}>`;
				let message = `${userIssue} needs to be added to my system before they can duel!`;
				return SendMessageToServer(message, channelID);
			}
			
			var i;
			//start battle
			for (i = 0; i < user1WinRecords.length; i++) {
				if (user1WinRecords[i].wins === 0 && user2WinRecords[i].wins === 0) {
					continue; //no battle do nothing
				}
				else if (user1WinRecords[i].wins > user2WinRecords[i].wins) {
					user1VictoryPoints = user1VictoryPoints + 1;	//user1 wins!
				}
				else if (user1WinRecords[i].wins < user2WinRecords[i].wins) {
					user2VictoryPoints = user2VictoryPoints + 1;	//user2 wins!
				}
				else {
					numOfTies = numOfTies + 1; //tie
				}
				numGames = numGames + 1
			}
				
			sql = `SELECT a.totalWins totalWins1, a.weeklyWins weeklyWins1, a.monthlyWins monthlyWins1, b.totalWins totalWins2, b.weeklyWins weeklyWins2, b.monthlyWins monthlyWins2 FROM Users a, Users b WHERE a.userID = ? AND b.userID = ?`;
			db.get(sql, [userID, userToDuelID], function(err, row) {
				if (err) { return console.error(err.message); }
				
				var message = `Through a total of **${numGames}** battles... :crossed_swords: \n <@!${userID}> won **${user1VictoryPoints}** battles, <@!${userToDuelID}> won **${user2VictoryPoints}** battles, and tying in **${numOfTies}** battles...\n`
				
				//Add in total, weekly, monthly win bonuses
				if (row.totalWins1 > row.totalWins2) {
					user1VictoryPoints = user1VictoryPoints + 1;
					message = `${message}<@!${userID}> has the total wins advantage!\n`;
				}
				else if (row.totalWins1 < row.totalWins2) {
					user2VictoryPoints = user2VictoryPoints + 1;
					message = `${message}<@!${userToDuelID}> has the total wins advantage!\n`;
				}
				
				if (row.weeklyWins1 > row.weeklyWins2) {
					user1VictoryPoints = user1VictoryPoints + 1;
					message = `${message}<@!${userID}> has the weekly wins advantage!\n`;
				}
				else if (row.weeklyWins1 < row.weeklyWins2) {
					user2VictoryPoints = user2VictoryPoints + 1;
					message = `${message}<@!${userToDuelID}> has the weekly wins advantage!\n`;
				}
				
				if (row.monthlyWins1 > row.monthlyWins2) {
					user1VictoryPoints = user1VictoryPoints + 1;
					message = `${message}<@!${userID}> has the monthly wins advantage!\n`;
				}
				else if (row.monthlyWins1 < row.monthlyWins2) {
					user2VictoryPoints = user2VictoryPoints + 1;
					message = `${message}<@!${userToDuelID}> has the monthly wins advantage!\n`;
				}
				
				
				if (user1VictoryPoints > user2VictoryPoints) {
					message = message + `<@!${userID}> wins!`;
				}
				else if (user1VictoryPoints < user2VictoryPoints) {
					message = message + `<@!${userToDuelID}> wins!`;
				}
				else {
					message = message + `<@!${userID}> and <@!${userToDuelID}> have tied!`
				}
		
				SendMessageToServer(message, channelID);	
			});		
		});	
	});
}

//Displays information about this bot
function About(channelID)
{
	let message = 'Aharance originally created me for his friends to use in their virtual board game group.\nIf I\'m currently being used somewhere else then I\'m doing even better than I hoped for! ';
	SendMessageToServer(message, channelID);
}

//Displays information on how to report a bug
function BugReport(channelID)
{
	let message = 'Please report any bugs or issues to aharance@gmail.com or directly using GitHub: \nhttps://github.com/SawLab/BoardGameBot-Linux-32-bit/issues';
	SendMessageToServer(message, channelID);
}

/* HEAD ADMIN PRIVILEGES BELOW THIS POINT */

//Head Admin only. Delete another user from the system
function DeleteUser(userID, channelID, userToDelete)
{
	var userToDeleteID;
	
	if (userID != auth.headAdminID) { //check if user is admin
		let message = `<@!${userID}> is not the head admin! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (userToDelete == null) {
		let message = 'Missing user to delete. Format: **!deleteuser {@userMention}**';
		return SendMessageToServer(message, channelID);
	}
	
	if(!CheckMentionFormat(userToDelete)) {
		let message = 'Incorect user format. Format: **!deleteuser {@userMention}**';
		return SendMessageToServer(message, channelID);
	}
	
	userToDeleteID = GetIDFromMention(userToDelete);

	RemoveMe(userToDeleteID, channelID);
}

//Head Admin Only. Removes a user to the admin list.
function DeleteAdmin(userID, channelID, adminToDelete)
{
	
	var admin;
	var adminList;
	var adminToDeleteID;
	if (userID != auth.headAdminID) {
		let message = `<@!${userID}> is not the head admin! :rage:`
		return SendMessageToServer(message, channelID);
	}
	adminList = auth.adminIDs;
	if(!CheckMentionFormat(adminToDelete)) {
		let message = 'Incorrect user format. Format: **!addadmin {@userMention}**';
		return SendMessageToServer(message, channelID);
	}
	adminToDeleteID = GetIDFromMention(adminToDelete);

		fs.readFile('./auth.json', 'utf8', (err, jsonString) => {
			if (err) { return console.error(err.message); }
			
			let authJsonObj = JSON.parse(jsonString);
			if (!authJsonObj.adminIDs.includes(adminToDeleteID)) {
				let message = `<@!${adminToDeleteID}> is already not an admin!`;
				return SendMessageToServer(message, channelID);
			}
			
			let indexOfAdminToDelete = authJsonObj.adminIDs.indexOf(adminToDeleteID);
			if (indexOfAdminToDelete > -1) {
				authJsonObj.adminIDs.splice(indexOfAdminToDelete, 1);
			}
			
			fs.writeFile('./auth.json', JSON.stringify(authJsonObj, null, 2), (err) => {	//delete the id from the file so that future runs will have the proper data
				if (err) { 
					console.error(err.message);
					let message = 'ERROR: Could not delete admin from file.'
					return SendMessageToServer(message, channelID);		
				}
				auth.adminIDs = authJsonObj.adminIDs;
				let message = `<@!${adminToDeleteID}> has been successfully removed as an admin!`;
				SendMessageToServer(message, channelID);		
			});
		});
	
}

//Head Admin Only. Adds a user to the admin list.
function AddAdmin(userID, channelID, newAdmin)
{
	
	var admin;
	var adminList;
	var adminToAddID;
	if (userID != auth.headAdminID) {
		let message = `<@!${userID}> is not the head admin! :rage: `
		return SendMessageToServer(message, channelID);
	}
	adminList = auth.adminIDs;
	if(!CheckMentionFormat(newAdmin)) {
		let message = 'Incorrect user format. Format: **!addadmin {@userMention}**';
		return SendMessageToServer(message, channelID);
	}
	adminToAddID = GetIDFromMention(newAdmin);
	
	if (GetUserByID(adminToAddID) == null) {
		let message = `${newAdmin} is not a user in this server.`
		return SendMessageToServer(message, channelID);
	}
	
		fs.readFile('./auth.json', 'utf8', (err, jsonString) => {
			if (err) { return console.error(err.message); }
			
			let authJsonObj = JSON.parse(jsonString);
			if (authJsonObj.adminIDs.includes(adminToAddID)) {
				let message = `<@!${adminToAddID}> is already an admin!`;
				return SendMessageToServer(message, channelID);
			}
			
			authJsonObj.adminIDs.push(adminToAddID);
			
			fs.writeFile('./auth.json', JSON.stringify(authJsonObj, null, 2), (err) => {	//add new id to file so that future runs will have the data
				if (err) { 
					console.error(err.message);
					let message = 'ERROR: Could not write admin to file.'
					return SendMessageToServer(message, channelID);		
				}
				auth.adminIDs = authJsonObj.adminIDs;			//set the currently running data so that admin privilges take into effect immidiately.
				let message = `<@!${adminToAddID}> has successfully been added as an admin! :crown:`;
				SendMessageToServer(message, channelID);
			});
		});
	
}

//Head Admin only. Deletes the entered games from the game list and all wins tracked for that game
function DeleteGame(userID, channelID, gameNickname)
{
	var gameID;
	var gameName;
	
	if (userID != auth.headAdminID) {
		let message = `<@!${userID}> is not the head admin! :rage: `
		return SendMessageToServer(message, channelID);
	}
	
	db.serialize( function() {
		let sql = `SELECT gameID, gameName FROM Games Where gameNickname = ? COLLATE NOCASE`
		db.get(sql, [gameNickname], function(err, row) {
			if (err) { return console.error(err.message); }
			if (row == null) {
				let message = `Game with nickname **${gameNickname}** does not exist in my system`;
				return SendMessageToServer(message, channelID);
			}	
			gameName = row.gameName;
			gameID = row.gameID;
			sql = `DELETE FROM Games Where gameID = ?`
			db.run(sql, [gameID], function(err) {
				if (err) {
					return console.error(err.message);
				}
				sql = `DELETE FROM WinTable Where gameID = ?` //delete all rows of the game from the game table
				db.run(sql, [gameID], function(err) {
					if (err) { return console.error(err.message); }
					
					sql = `SELECT userID, SUM(wins) totalWins FROM WinTable GROUP BY userID` //Sum up everyone's new total wins in case wins were deleted
					db.all(sql, [], function(err, rows) {
						if (err) { return console.error(err.message); }
						if (rows.length === 0) { //last game was deleted so everyone's totalWins should be 0
							sql = `UPDATE USERS SET totalWins = 0`;
							db.run(sql, [], function(err) {
								if (err) { return console.error(err.message); }
							});
						}
						else {
							rows.forEach(function(row) {
								sql = `UPDATE USERS SET totalWins = ? WHERE userID = ?`; //Set each user's totalWins to the new sum
								db.run(sql, [row.totalWins, row.userID], function(err) {
									if (err) { return console.error(err.message); }
								});
							});
						}
						
						let message = `**${gameName}** has been deleted from the database along with its recorded wins.`;
						SendMessageToServer(message, channelID);
					});
				});
			});
		});
	});
}

//Head Admin only. WIPES ENTIRE USER TABLE
function DeleteAllUsers(userID, channelID)
{
	if (userID != auth.headAdminID) {
		let message = `<@!${userID}> is not the head admin! :rage:`
		return SendMessageToServer(message, channelID);
	}
	
	let sql = `DELETE FROM WinTable`; //Delete the win table first to avoid foreign key conflicts
	db.run(sql, [], function(err) {
		if (err) {
			return console.error(err.message);
		}
		sql = "DELETE FROM Users";	//Now Delete all users
		db.run(sql, [], function(err) {
			if (err) {
				return console.error(err.message);
			}
			let message = "All user data has been deleted";
			SendMessageToServer(message, channelID);
		});
	});	
}

//Head Admin only. WIPES ENTIRE GAMES TABLE
function DeleteAllGames(userID, channelID)
{
	if (userID != auth.headAdminID) {
		let message = `<@!${userID}> is not the head admin! :rage:`
		return SendMessageToServer(message, channelID);
	}
	
	let sql = `DELETE FROM WinTable`; //Delete the win table first to avoid foreign key conflicts
	db.run(sql, [], function(err) {
		if (err) {
			return console.error(err.message);
		}
		sql = `DELETE FROM Games`;	//Now Delete all games
		db.run(sql, [], function(err) {
			if (err) {
				return console.error(err.message);
			}
			let message = "All game data has been deleted";
			SendMessageToServer(message, channelID);
		});
	});	
}

//Head Admin only. Resets all user wins to 0
function ResetAllUsers(userID, channelID)
{
	if (userID != auth.headAdminID) {
		let message = `<@!${userID}> is not the head admin! :rage:`
		return SendMessageToServer(message, channelID);
	}
	
	let sql = `UPDATE WinTable SET wins = 0`; //Set all game record wins to 0
	db.run(sql, [], function(err) {
		if (err) {
			return console.error(err.message);
		}
		sql = `UPDATE Users SET totalWins = 0, weeklyWins = 0, monthlyWins = 0`;	//Set total and weekly wins to 0
		db.run(sql, [], function(err) {
			if (err) {
				return console.error(err.message);
			}
			let message = "All user wins have been reset.";
			SendMessageToServer(message, channelID);
		});
	});	
}

//Head Admin Only. Restores Database using the specified backup
function RestoreDatabase(userID, channelID, num) {
	if (userID != auth.headAdminID) {
		let message = `<@!${userID}> is not the head admin! :rage: `
		return SendMessageToServer(message, channelID);
	}
	if (num == null) {
		let message = `Missing backup specification. Format: **!restoredatabase {backupNumber}** Backup number can be 1, 3, or 7.`; 
		return SendMessageToServer(message, channelID);
	}
	
	if (num !== '1' && num !== '3' && num !== '7' ) {
		let message = `**${num}** is not a permitted input. Format: **!restoredatabase {backupNumber}** Backup number can be 1, 3, or 7.`;
		return SendMessageToServer(message, channelID);
	}

	 if (shell.exec("sqlite3 BoardGameBot.db .dump > Old.bak").code !== 0) { //Copy current database so we dont risk losing it
		let message = `${num} day database restoration failed. Could not copy database.`;
		SendMessageToServer(message, channelID);
		shell.exit(1);
	}
	else {
		db.close(); //close the database connection so we can modify it
		
		 if (shell.exec("rm BoardGameBot.db").code !== 0) {
			let message = `${num} day database restoration failed. Could not delete database.`;
			SendMessageToServer(message, channelID);
			shell.exit(1);
		} 
		else {
			
			if (shell.exec(`sqlite3 BoardGameBot.db < ${num}DayBackup.bak`).code !== 0) {
			let message = `${num} day database restoration failed. Could not insert backup data.`;
			SendMessageToServer(message, channelID);
			shell.exit(1);
		}
			db = new sqlite3.Database('./BoardGameBot.db', (err) => { //reconnect to the restored database
				if (err)
				{
					return console.error(err.message);
				}
				console.log('1 Day Backup restoration complete.');
				let message = `Database restored to ${num} days ago.`;
				return SendMessageToServer(message, channelID);
			});
			
		}
	} 

}

//Undos the most recent database restoration
function UndoDatabaseRestore(userID, channelID) {
	
	if (userID != auth.headAdminID) {
		let message = `<@!${userID}> is not the head admin! :rage: `
		return SendMessageToServer(message, channelID);
	}
	
	fs.stat('Old.bak', function(err, stat) {
    if(err == null) {
        if (shell.exec("sqlite3 BoardGameBot.db .dump > Undo.bak").code !== 0) { //Copy current database so we dont risk losing it
			let message = `${num} days database restoration failed. Could not copy database.`;
			SendMessageToServer(message, channelID);
			shell.exit(1);
		}
		else {
			db.close(); //close the database so we don't have any issues deleting it and reconnecting
			if (shell.exec("rm BoardGameBot.db").code !== 0) { //delete the current database
				let message = `Undo database restoration failed. Could not delete database.`;
				SendMessageToServer(message, channelID);
				shell.exit(1);
			}
			else {
				if (shell.exec("sqlite3 BoardGameBot.db < Old.bak").code !== 0) { //Insert the old data into an empty database
					let message = `Undo database restoration failed. Could not insert old database data into the new one.`;
					SendMessageToServer(message, channelID);
					shell.exit(1);
				}
				else {
					db = new sqlite3.Database('./BoardGameBot.db', (err) => { //reconnect to the restored database
						if (err)
						{
							return console.error(err.message);
						}
						if (shell.exec("rm Old.bak").code !== 0) { //Delete the old database so we can make the previous database we just reverted from the old database
							let message = `Undo database restoration failed. Could not delete old database.`;
							SendMessageToServer(message, channelID);
							shell.exit(1);
						}
						else {
							if (shell.exec("mv Undo.bak Old.bak").code !== 0) { //Rename the undone database to Old.bak so that we can revert the undo
							let message = `Undo database restoration failed. Could not rename the backup.`;
							SendMessageToServer(message, channelID);
							shell.exit(1);
						}
							else {
								console.log(`Undo database restore complete. Reverted to database at ${stat.ctime}`);
								let message = `Database restoration has been undone. Reverted to database at ${stat.ctime}`;
								return SendMessageToServer(message, channelID);
							}
						}
					});
				}
			}
		}
		
    } else if(err.code === 'ENOENT') {
        // file does not exist
        console.log('Old.bak does not exist!');
		let message = 'There has been no restoration to undo!';
		return SendMessageToServer(message, channelID);
    } else {
        console.log('Datbase Undo Restoration error: ', err.code);
    }
});
}

//Displays the DateTime of each database backup
function ViewDatabaseBackupTimes(userID, channelID) {
	
	if (userID != auth.headAdminID) {
		let message = `<@!${userID}> is not the head admin! :rage: `
		return SendMessageToServer(message, channelID);
	}
	
	let message = `__**Saved Database Backup Times:**__\n`;
	
	new Promise((resolve,reject) => { 
		fs.stat('Old.bak', function(err, stat) {
			if (err == null) {
				message = `${message}Last Restoration: ${stat.mtime}\n`;
			}
		});
		resolve();
	})
	.then(() => { 
		fs.stat('1DayBackup.bak', function(err, stat) {
			if (err == null) {	
				message = `${message}1 Day Backup: ${stat.mtime}\n`;
			}
		});
	})
	.then(() => {
		fs.stat('3DayBackup.bak', function(err, stat) {
			if (err == null) {
				message = `${message}3 Day Backup: ${stat.mtime}\n`;
			}
		});
	})
	.then(() => {
		fs.stat('7DayBackup.bak', function(err, stat) {
			if (err == null) {
				message = `${message}7 Day Backup: ${stat.mtime}\n`;
			}
			SendMessageToServer(message, channelID);
		});
	})
}

/* ADMIN PRIVILEGES BELOW THIS POINT */

//Admin only. Prints list of commands only the head admin can use
function ViewHeadAdminCommands(userID, channelID)
{
	
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	let message = 'Head Admin Commands:'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!deletegame {nickname}** - deletes an existing game from the list and its recorded wins'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!deleteuser {@userMention}** - delete the specified user from the database'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!deleteallusers** - DELETES ALL USERS AND WINS FROM THE DATABASE.'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!deleteallgames** - DELETES ALL GAMES AND WINS FROM THE DATABASE.'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!resetallusers** - RESETS ALL USER WINS.'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!addadmin {@userMention}** - gives the specified user admin permissions'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!deleteadmin {@userMention}** - removes the specified user\'s admin permissions'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!restoredatabase {num}** - Restores to the database back up from 1, 3 or 7 days ago'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!undorestore** - Undoes the most recent database backup restoration'
				+ '\n\t\t\t\t\t\t\t\t\t\t\t\t**!viewbackups** - Displays the date and time of each stored backup';
	SendMessageToServer(message, channelID);
}

//Admin only. Adds a player win to the specified user and game.
function GiveUserWin(userID, channelID, userToEdit, game)
{
	var userToEditID;
	
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (userToEdit == null) {
		let message = 'Missing the user to edit. Format: **!givewin {@userMention} {nickname}**';
		return SendMessageToServer(message, channelID);
	}
	
	if (game == null) {
		let message = 'Missing game. Format: **!givewin {@userMention} {nickname}**';
		return SendMessageToServer(message, channelID);
	}

	if (!CheckMentionFormat(userToEdit)) {
		let message = 'Incorrect user format. Format: **!givewin {@userMention} {nickname}**';
		return SendMessageToServer(message, channelID);
	}
	
	userToEditID = GetIDFromMention(userToEdit);
	
	if (GetUserByID(userToEditID) == null) {
		let message = `${userToEdit} is not in this server. Format: !givewin {@userMention} {nickname}`;
		return SendMessageToServer(message, channelID);
	}	

	AddWin(userToEditID, channelID, game); //Call the AddWin function with user's id
}

//Admin only. Add Game to the Games table, add the new game to the User table as a column.
function AddGame(userID, channelID, gameName, nickName)
{
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (gameName == null) {
		let message = "Game name not specified. Format: **!addgame {gameName} {nickname}**. Use \'_\' instead of spaces for the game name.";
		SendMessageToServer(message, channelID);
		return;
	}
	
	if (gameName.length > MAX_GAME_NAME_LENGTH) {
		let message = `The game name cannot be larger than **${MAX_GAME_NAME_LENGTH}** characters. Please shorten the game name.`;
		SendMessageToServer(message, channelID);
		return;
	}
	
	if (nickName == null) {
		let message = "Nickname not specified. Format **!addgame {gameName} {nickname}**.";
		SendMessageToServer(message, channelID);
		return;
	}
	
	if (nickName.length > MAX_NICKNAME_LENGTH) {
	let message = `The nickname cannot be larger than **${MAX_NICKNAME_LENGTH}** characters. Please shorten the nickname.`;
		SendMessageToServer(message, channelID);
		return;
	}
	
	var formattedGameName = gameName.replace(/_/g, ' ');
		
	db.serialize(function() {
		
		var userIDs = [];
		var idString;
		var gameID;
		
		let sql = `INSERT INTO Games(gameName, gameNickname) VALUES(?, ?)`;//insert game into games table if it does not already exist
		db.run(sql, [formattedGameName, nickName], function(err) {
			if (err) {
				if(err.message.includes("SQLITE_CONSTRAINT"))
				{
					let message = "This game name or nickname already exists in my system!";
					SendMessageToServer(message, channelID);
				}
				return console.error(err.message);
			}
			sql = `SELECT userID from Users`;	//get all existing user IDs
			db.all(sql, [], function(err, rows) {
				if (err) { return console.error(err.message); }	
				rows.forEach(function(row) {
					userIDs.push(row.userID);
				});	
				
				sql = `SELECT gameID FROM Games WHERE gameNickname = ? COLLATE NOCASE`; //get the game id for the game that was just added
				db.get(sql, [nickName], function(err, row) {
					if (err) { return console.error(err.message); }
					gameID = row.gameID;
					
					userIDs.forEach(function(playerID) {	//if there are users give them their own rows in the Win Table
						sql = `INSERT INTO WinTable(userID, gameID) VALUES(?, ?)`;
						db.run(sql, [playerID, gameID], function(err) {
							if (err) { return console.error(err.message); }								
						});	
					});
				let message = `**${formattedGameName}** with nickname **${nickName}** has been added to the game list and is ready to start tracking wins! :game_die:`;
				SendMessageToServer(message, channelID);	
				});
			});
		});			
	});
}

//Admin only. Subtracts a player win from the specified user and game.
function GiveUserLoss(userID, channelID, userToEdit, game)
{
	var userToEditID;
	
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (userToEdit == null) {
		let message = 'Missing the user to edit. Format: **!giveloss {@userMention} {nickname}**';
		return SendMessageToServer(message, channelID);
	}
	
	if (game == null) {
		let message = 'Missing game. Format: **!giveloss {@userMention} {nickname}**';
		return SendMessageToServer(message, channelID);
	}

	if (!CheckMentionFormat(userToEdit)) {
		let message = 'Incorrect user format. Format: **!giveloss {@userMention} {nickname}**';
		return SendMessageToServer(message, channelID);
	}
	
	userToEditID = GetIDFromMention(userToEdit);
	
	if (GetUserByID(userToEditID) == null) {
		let message = `${userToEdit} is not in this server. Format: !giveloss {@userMention} {nickname}`;
		return SendMessageToServer(message, channelID);
	}	

	AddLoss(userToEditID, channelID, game); //Call the AddLoss function with user's id
}

//Admin only. Adds the specified user to the database.
function AddUser(userID, channelID, userToAdd)
{
	var userToAddID;
	var userToAddObject;
	
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (userToAdd == null) {
		let message = 'Missing user to add. Format: **!adduser {@userMention}**';
		return SendMessageToServer(message, channelID);
	}
	
	if (!CheckMentionFormat(userToAdd)) {
		let message = 'Incorrect user format. Format: **!adduser {@userMention}**';
		return SendMessageToServer(message, channelID);
	}
	
	userToAddID = GetIDFromMention(userToAdd);
	userToAddObject = GetUserByID(userToAddID);
	
	if (userToAddObject == null) {
		let message = `${userToAdd} does not exist. Format: !adduser {@userMention}`;
		return SendMessageToServer(message, channelID);
	}
	
	AddMe(userToAddID, channelID);
}

//Admin only. Update the gameName of an existing game in the database
function UpdateGameName(userID, channelID, nickName, newGameName)
{
	var oldGameName;
	
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (nickName == null) {
		let message = `Nickname for the game is missing. Format: **!updategamename {nickname} {New_Game_Name}**`;
		return SendMessageToServer(message, channelID);
	}
	
	if (newGameName == null) {
		let message = `The new name for the game is missing. Format: **!updategamename {nickname} {New_Game_Name}**`;
		return SendMessageToServer(message, channelID);
	}

	if (nickName.length > MAX_NICKNAME_LENGTH) {
		let message = `The length of the nickname cannot be larger than **${MAX_NICKNAME_LENGTH}** characters. Format: **!updategamename {nickname} {New_Game_Name}**`;
		return SendMessageToServer(message, channelID);
	}
	
	if (newGameName.length > MAX_GAME_NAME_LENGTH) {
		let message = `The length of the game name cannot be larger than **${MAX_GAME_NAME_LENGTH}** characters. Format: **!updategamename {nickname} {New_Game_Name}**`;
		return SendMessageToServer(message, channelID);
	}
	
	newGameName = newGameName.replace(/_/g, ' ');
	
	let sql = 'SELECT gameName FROM Games Where gameNickname = ? COLLATE NOCASE';
	db.get(sql, [nickName], function(err, row) {
		if (row == null) {
			let message = `**${nickName}** does not exist in my system. Type !viewgames for a list of valid nicknames.`;
			return SendMessageToServer(message, channelID);
		}
		oldGameName = row.gameName;
		
		sql = 'UPDATE Games SET gameName = ? WHERE gameNickname = ?'
		db.run(sql, [newGameName, nickName], function(err) {
			if (err) {
				return console.error(err.message);
			}
			let message = `'**${oldGameName}**' successfully changed to '**${newGameName}**'`;
			SendMessageToServer(message, channelID);
		});
	});
}

//Admin only. Updates the nickname of an existing game
function UpdateNickname(userID, channelID, oldNickName, newNickName)
{
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (oldNickName == null)
	{
		let message = 'The current nickname is missing. Format: **!updatenickname {oldNickName} {newNickName}**';
		return SendMessageToServer(message, channelID);
	}
	
	if (newNickName == null)
	{
		let message = 'The new nickname is missing. Format: **!updatenickname {oldNickName} {newNickName}**';
		return SendMessageToServer(message, channelID);
	}
	
	if (newNickName.length > MAX_NICKNAME_LENGTH)
	{
		let message = 'The new nickname cannot be greater than **${MAX_NICKNAME_LENGTH}** characters.';
		return SendMessageToServer(message, channelID);
	}
	
	let sql = 'UPDATE Games SET gameNickname = ? WHERE gameNickname = ? COLLATE NOCASE';
	db.run(sql,[newNickName, oldNickName], function(err) {
		if (err) {
			return console.error(err.message);
		}
			sql = 'SELECT gameName FROM Games WHERE gameNickname = ? COLLATE NOCASE';
			db.get(sql, [newNickName], function(err, row) {
				if (row == null) {
					let message = "Error: Could not validate that nickname has changed.";
					SendMessageToServer(message, channelID);
				}
				let message = `The nickname for **${row.gameName}** has changed from **${oldNickName}** to **${newNickName}**.`
				SendMessageToServer(message, channelID);
			});
	});
}

//Admin only. Prints all users in the system
function ViewAllUsers(userID, channelID)
{
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	let sql = `SELECT userID FROM Users`;
	db.all(sql, [], function(err, rows) {
		if (err) {
			return console.error(err.message);
		}
		let message = `**__Displaying all registered users:__**\n`;
		rows.forEach(function(row) {
			message = `${message}<@!${row.userID}>\n`;
		});
		SendMessageToServer(message, channelID);
	});	
}

//Admin only. Decides which view all function to use based on user input
function ViewAllWins(userID, channelID, gameNickname)
{
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (gameNickname == null) {
		ViewAllTotalWins(channelID);
	}
	else {
		ViewAllWinsByGame(channelID, gameNickname);
	}
}

//Admin only. Displays the total wins for each user.
function ViewAllTotalWins(channelID)
{
	let sql = `SELECT userID, totalWins from Users`;
	db.all(sql, [], function(err, rows) {
		if (err) {
			return console.error(err.message);
		}
		let message = `**__Displaying all users' total wins:__**\n`;
		rows.forEach(function(row) {
			message = `${message}<@!${row.userID}>: ${row.totalWins}\n`;
		});
		SendMessageToServer(message, channelID);
	});
}

//Admin only. Displays the wins in the specified game for each user.
function ViewAllWinsByGame(channelID, gameNickname) 
{	
	db.serialize(function() {
		var gameName;
		var gameID;
		
		let sql = `SELECT gameID, gameName FROM Games WHERE gameNickname = ? COLLATE NOCASE`;
		db.get(sql, [gameNickname], function(err, row) {
			if (err) {
				return console.error(err.message);
			}
			if (row == null) {
				let message = `**${gameNickname}** is not a valid nickname. Type **!viewgames** for a list of valid nicknames.`;
				return SendMessageToServer(message, channelID);
			}
			gameName = row.gameName;
			gameID = row.gameID;
			
				sql = `SELECT userID, wins FROM WinTable WHERE gameID = ?`;
				db.all(sql, [gameID], function(err, rows) {
				if (err) {
					return console.error(err.message);
				}
				let message = `**__Displaying all user wins for the game ${gameName}:__**\n`;
				rows.forEach(function(row) {
					message = `${message}<@!${row.userID}>: ${row.wins}\n`;
				});
				SendMessageToServer(message, channelID);
			});
		});
	});
}

//Admin only. Resets the specified user's wins back to 0
function ResetUserWins(userID, channelID, userToReset) 
{
	var userToResetID;
	
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (userToReset == null) {
		let message = `Missing user to reset. Format: **!resetuser {@userMention}**`;
		return SendMessageToServer(message, channelID);
	}
	
	if (!CheckMentionFormat(userToReset)) {
		let message = `Incorrect user format. Format: **!resetuser {@userMention}**`;
		return SendMessageToServer(message, channelID);
	}
	
	userToResetID = GetIDFromMention(userToReset);
	
	let sql = `UPDATE Users SET totalWins = 0 weeklyWins = 0, monthlyWins = 0 WHERE userID = ?`;
	db.run(sql, [userToResetID], function(err) {
		if (err) { return console.error(err.message); }
		
		sql = `UPDATE WinTable SET wins = 0 WHERE userID = ?`;
		db.run(sql, [userToResetID], function(err) {
			if (err) { return SendMessageToServer(message, channelID); }
			
			let message = `<@!${userToResetID}> has had all their wins reset.`;
			return SendMessageToServer(message, channelID);
		});
	});
}

//Admin Only. Force two users to duel.
function Fight(userID, channelID, user1, user2)
{
	var user1ID;
	
	if (!auth.adminIDs.includes(userID) && userID != auth.headAdminID) {
		let message = `<@!${userID}> can\'t tell me what to do! :rage:`;
		return SendMessageToServer(message, channelID);
	}
	
	if (user1 == null) {
		let message = 'Missing user1. Format: **!fight {@user1Mention} {@user2Mention}**';
		return SendMessageToServer(message, channelID);
	}
	
	if (!CheckMentionFormat(user1)) {
		let message = 'Improper user1 format. Format: **!fight {@user1Mention} {@user2Mention}**';
		return SendMessageToServer(message, channelID);
	}
	
	if (!CheckMentionFormat(user2)) {
		let message = 'Improper user2 format. Format: **!fight {@user1Mention} {@user2Mention}**';
		return SendMessageToServer(message, channelID);
	}
	
	user1ID = GetIDFromMention(user1);
	
	DuelUser(user1ID, channelID, user2);	//user2 ID parsing gets taken care of in the Duel function so we don't have to do it here
	
}

/* UTILITY FUNCTIONS */

//Retrieves the full user object from any user in the channel
function GetUserByID(userID)
{
	var user = bot.users[userID];
	return user;
}

//Verifies a user mention is in the correct format
function CheckMentionFormat(mention) 
{
	if (mention.substring(0,2) != '<@' || mention.charAt(mention.length - 1) != '>') {
		return false;
	}
	else {
		return true;
	}
}

//Gets the user id from a mention
function GetIDFromMention(userMention)
{
	var id;
	userMention = userMention.replace('!', ''); //check if they are using a nickame
    id = userMention.substring(2, userMention.length - 1);
	return id;
}

//Starts the automated cron-jobs
function StartCronJobs()
{
	//Weekly wins award message
	cron.schedule("0 17 * * SUN", function() {
		console.log('Starting top weekly wins cron job...');
		var mostWeeklyWins;
		let sql = `SELECT userID, weeklyWins FROM Users ORDER BY weeklyWins DESC`;
		db.all(sql, [], function(err, rows) {
			if (err) { return console.error(err.message) }
			
			if (rows.length != 0 && rows[0].weeklyWins > 0) { //only do something if there are users in the system and if there is at least 1 weekly win
				mostWeeklyWins = rows[0].weeklyWins;
				let message = `Congratulations to:`;
				
				var i;
				for(i = 0; i < rows.length; i++) {
					if (rows[i].weeklyWins === mostWeeklyWins) { 	//add the user with the highest score and any ties to the message
						message = message + ` <@!${rows[i].userID}>`;
					}
					else { break; }	//No need to iterate through the rest of the list once we've found everyone with the highest score.
				}
				message = message + ` for having the most wins with **${mostWeeklyWins}** wins in the past week! :trophy:`;
				SendMessageToServer(message, auth.channelID);
				console.log('Weekly award message sent to server.');
				//Reset everyone's weekly wins back to 0
				sql = `UPDATE USERS SET weeklyWins = 0`;
				db.run(sql, [], function(err) {
					if (err) { return console.error(err.message); }
					console.log('Weekly wins reset to 0');
				});
			}
			else { console.log('No weekly winners to congratulate...'); }
			
		});
	}); 
	
	//Monthly wins award message
	cron.schedule("0 17 1 * *", function() {
		console.log('Starting top monthly wins cron job...');
		var mostMonthlyWins;
		let sql = `SELECT userID, monthlyWins FROM Users ORDER BY monthlyWins DESC`;
		db.all(sql, [], function(err, rows) {
			if (err) { return console.error(err.message) }
			
			if (rows.length != 0 && rows[0].monthlyWins > 0) { //only do something if there are users in the system and if there is at least 1 monthly win
				mostMonthlyWins = rows[0].monthlyWins;
				let message = `Congratulations to:`;
				
				var i;
				for(i = 0; i < rows.length; i++) {
					if (rows[i].monthlyWins === mostMonthlyWins) { 	//add the user with the highest score and any ties to the message
						message = message + ` <@!${rows[i].userID}>`;
					}
					else { break; }	//No need to iterate through the rest of the list once we've found everyone with the highest score.
				}
				message = message + ` for having the most wins with **${mostMonthlyWins}** wins in the past month! :trophy:`;
				SendMessageToServer(message, auth.channelID);
				console.log('Monthly award message sent to server.');
				//Reset everyone's monthly wins back to 0
				sql = `UPDATE USERS SET monthlyWins = 0`;
				db.run(sql, [], function(err) {
					if (err) { return console.error(err.message); }
					console.log('Monthly wins reset to 0');
				});
			}
			else { console.log('No monthly winners to congratulate...'); }
			
		});
	});
	
	//1 day backup cron-job. Run each day at 05:10.
	cron.schedule('10 5 * * *', function() {
		console.log('Running 24 hour backup cron-job...');
		if (shell.exec("sqlite3 BoardGameBot.db .dump > 1DayBackup.bak").code !== 0) {
			console.log('Backup failed.');
			shell.exit(1);
		}
		else {
			shell.echo('24 hour backup complete');
		}
	});
	
	//3 day backup cron-job. Backup database every tuesday and friday at 05:00
	cron.schedule('0 5 * * 2,5', function() {
		console.log('Running 3 day backup cron-job...');
		if (shell.exec("sqlite3 BoardGameBot.db .dump > 3DayBackup.bak").code !== 0) {
			console.log('Backup failed.');
			shell.exit(1);
		}
		else {
			shell.echo('3 day backup complete');
		}
	});
	
	//7 day backup cron-job. Backup database every sunday at 05:05
	cron.schedule('5 5 * * 0', function() {
		console.log('Running 7 day backup cron-job...');
		if (shell.exec("sqlite3 BoardGameBot.db .dump > 7DayBackup.bak").code !== 0) {
			console.log('Backup failed.');
			shell.exit(1);
		}
		else {
			shell.echo('7 day backup complete');
		}
	});
}