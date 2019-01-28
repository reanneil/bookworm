var express = require('express');
var app = express();
var server = require('http').Server(app);

const BookwormGame = require('./bookworm');
const Player = require('./player');

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/home.html');
});

app.get('/index', function(req, res) {
	res.sendFile(__dirname + '/client/load.html');
});

app.use('/client', express.static(__dirname + '/client'));
// app.use('/client/lib', express.static(__dirname + '/client/lib'));

server.listen(2000);
console.log("Server Started");

var waitingPlayer = null;
var opponent = null;
var players = [];

var io = require('socket.io')(server, {});
var game = null;
io.sockets.on('connection', function(socket){
	players.push(new Player(socket));
	if (players.length == 2) {
		players.forEach((player, index)=>{
			player._initializeBasket();
			player._initializeField(index)
			player._initializeOpponentField(index)
		});
		game = new BookwormGame(players);
		io.sockets.emit('display_field',false);

	} else {
		players[0].socket.emit('message', 'Waiting for an opponent');
		io.sockets.emit('display_field',true);

	}

	socket.on('disconnect', function(){
		game = null;
		players[0].socket == socket ? players.splice(0, 1) : players.splice(1, 1);
	});

	socket.on('generate_letters', function(count){
		var playerIndex = players[0].socket == socket ? 0 : 1;
		game._generateNewLetters(count, playerIndex);
	});

	socket.on('message', function(text){
		io.emit('message', text)
	});

	socket.on('refresh_basket', function(){
		var playerIndex = players[0].socket == socket ? 0 : 1;
		game._refreshBasket(playerIndex);
		game._changeTurn((playerIndex+1)%2);
		game._sendToPlayer((playerIndex+1)%2, "Your turn!")
	});

	socket.on('submit_word', function(data) {
		var checkWord = require('check-word');
		var dictionary  = checkWord('en');
		var opponentIndex = players[0].socket == socket ? 1 : 0;
		var playerIndex = (opponentIndex+1)%2;
		// console.log(players[0]._getLife())
		if(dictionary.check(data.word.toLowerCase())){
			var points = 0;
			var times = 1;
			var changeTurn = true;
			var addLife = false;
			data.letters.forEach((letter)=>{
				points += parseInt(letter.points);
				if (letter.potion == 'x2') {
					times *= 2;
				} else if (letter.potion == 'play-again') {
					changeTurn = false;
				} else if (letter.potion == 'steal-life') {
					addLife = true;
				} 
			});
			points *= times;
			if (data.word.length >= 5 && data.word.length <=7) {
				points+=3;
			} else if (data.word.length > 7){
				points+=5;
			}


			data.points = points;
			data.changeTurn = changeTurn
			game._sendWordToOpponent(opponentIndex, data);
			game._sendSuccessMessage(playerIndex, data);
			players[opponentIndex]._updateLife(points);
			io.sockets.emit('update_life',{l1: players[0].life,l2: players[1].life})
			if (changeTurn) {
				game._changeTurn(opponentIndex);
			} else {
				game._sendToPlayer(opponentIndex, "You lose a turn!");
				game._sendToPlayer(playerIndex, "Play again!");
			}

			if (addLife) {
				players[playerIndex]._addLife(points);
				io.sockets.emit('update_life',{l1: players[0].life,l2: players[1].life})
			}

			var winner = '';
			if(players[0].life<=0){
				winner = players[1].interfaceName
			} else if (players[1].life<=0){
				winner = players[0].interfacename
			}

			if(winner != ''){
				io.sockets.emit('game_end',winner);
			}

		} else {
			game._sendToPlayer(playerIndex, "Invalid Word!");
		}
	});

	// socket.on('update_life', function(score){
	// 	console.log('Life: ',score)
	// });
})

// console.log(words.check('doggoss'));
