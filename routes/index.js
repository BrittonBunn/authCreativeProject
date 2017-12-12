var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/presidentquiz', {useMongoClient:true});
var presidentSchema = mongoose.Schema({
    name:String,
    years:String
});

var President = mongoose.model('President', presidentSchema);
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
    console.log("Connected to Mongo")
});

router.get('/', function(req, res, next) {
    res.sendFile('index.html', {root: 'public'});
});

var players = [];

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

removeInactives = function() {
  var i = players.length;
  var date = new Date();

  while (i--) {
      if (date.getTime() - players[i].date.getTime() > 60000) {
          players.splice(i, 1);
      }
  }

};

setInterval(removeInactives, 5000);

router.post('/addPlayer', function(req, res, next) {
    console.log(req);
    for (var i = 0; i < players.length; i++) {
        if (players[i].id === req.body.id) {
            res.sendStatus(200);
            return;
        }
    }

    var newPlayer = {
        name : req.body.name,
        id: req.body.id,
        score: 0,
        date: new Date(),
        imgUrl: req.body.imgUrl
    };

    console.log(newPlayer.date);
    players.push(newPlayer);

    res.sendStatus(200);
});

router.get('/all', function(req, res, next) {
   console.log("in all");
   President.find(function(err, characterList) {
       if (err) return console.error(err);
       else {
           res.json(characterList);
       }
   });
});

router.get('/scores', function(req, res, next) {
    console.log("/scores");
    console.log(players);

    for (var i = 0; i < players.length; i++) {
        if (players[i].id === req.query.id) {
            players[i].date = new Date();
        }
    }

   res.status(200).json({scores: players, lastCorrectAnswer: lastCorrectAnswer});
});

var currentQuestion;
var lastCorrectAnswer;

var randomQuestion = function (res, req, next) {
    var question;

    President.findOne().count().exec(function (err, count) {
        var random = Math.floor(Math.random() * count);

        President.findOne().skip(random).exec(
            function (err, result) {
                if (err) return console.error(err);
                question = {
                    years: result.years,
                    name: result.name
                };
                console.log("The question is: " + question.years);
                var fakeAnswers = [];
                var noRepeats = [question.years];
                getArrayOfWrongAnswers(noRepeats, fakeAnswers, question, res);
            });
    });
};

var getArrayOfWrongAnswers = function(noRepeats, fakeAnswers, question, res) {
    President.findOne().count().exec(function (err, count) {
        var random = Math.floor(Math.random() * count);

        President.findOne().skip(random).exec(
            function (err, result) {
                if (err) return console.error(err);

                if (noRepeats.indexOf(result.years) === -1) {

                    console.log(result);

                    fakeAnswers.push(result.years);
                    noRepeats.push(result.years);
                    if (fakeAnswers.length === 3) {
                        question.wrongChoices = fakeAnswers;
                        question.wrongChoices.push(question.years);
                        question.wrongChoices = shuffle(question.wrongChoices);
                        if (lastCorrectAnswer) {
                            question.lastCorrectAnswer = lastCorrectAnswer;
                        }
                        currentQuestion = question;
                        if (res) {
                            res.status(200).send("success");
                        }
                    } else {
                        return getArrayOfWrongAnswers(noRepeats, fakeAnswers, question, res);
                    }
                } else {
                    return getArrayOfWrongAnswers(noRepeats, fakeAnswers, question, res);
                }
            });
    });
};

randomQuestion();

router.get('/getQuestion', function(req, res, next) {
    console.log("/getQuestion");

    if (currentQuestion) {
        res.status(200).json(currentQuestion);
    } else {
        res.status(200).json({waiting: true});
    }
});

router.post('/nextQuestion', function(req, res, next) {
    console.log("/nextQuestion");

    var question;

    President.findOne().count().exec(function (err, count) {
        var random = Math.floor(Math.random() * count);

        President.findOne().skip(random).exec(
            function (err, result) {
                if (err) return console.error(err);
                question = {
                    years: result.years,
                    name: result.name
                };
                var fakeAnswers = [];
                var noRepeats = [question.years];
                getArrayOfWrongAnswers(noRepeats, fakeAnswers, question, res);
            });
    });
});

router.post('/rightAnswer', function(req, res, next){
    if (!currentQuestion) {
        res.status(200).send("Too slow!");
        return;
    }
    currentQuestion = undefined;

    var id = req.body.id;

    for (var i = 0; i < players.length; i++) {
        if (players[i].id === id) {
            players[i].score += 1;
            lastCorrectAnswer = players[i].name;
            setTimeout(randomQuestion, 2000);
            res.sendStatus(200);
            break;
        }
    }

    res.sendStatus(500);
});

router.post('/wrongAnswer', function(req, res, next) {
    console.log("/wrongAnswer");

    var id = req.body.id;

    for (var i = 0; i < players.length; i++) {
        if (players[i].id === id) {
            players[i].score -= 1;
            res.send(200);
            break;
        }
    }

    res.sendStatus(500);
});

router.post("/exit", function(req, res, next) {
    var id = req.body.id;

    for (var i = 0; i < players.length; i++) {
        if (players[i].id === id) {
            players.splice(i, 1);
        }
    }

    res.sendStatus(200);
});

module.exports = router;
