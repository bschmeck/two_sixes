Log = function() {
    this.rounds = ko.observableArray();

    this.currentRound = function() {
        return this.rounds()[0];
    }

    this.addBid = function(player, bid) {
        this.currentRound().addBid(player, bid);
    }

    this.addDieLost = function(description, playerLost) {
        this.currentRound().addDieLost(description, playerLost);
    }

    this.addRound = function() {
        this.rounds.unshift(new RoundLog());
    }

    this.addRoll = function(player, dice) {
        this.currentRound().addRoll(player, dice);
    }
}

RoundLog = function() {
    this.events = ko.observableArray();
    this.live = ko.observable(true);
    this.show = ko.observable(false);
    this.description = ko.observable("");
    this.playerLostDie = ko.observable(false);
    this.diceRolls = ko.observableArray();

    this.addBid = function(player, bid) {
        this.events.push(player.handle + ' bid ' + bid.toString());
    }
    this.addDieLost = function(description, playerLost) {
        this.live(false);
        this.description(description);
        this.playerLostDie(playerLost || false);
    }
    this.addRoll = function(player, dice) {
        this.diceRolls.push(new DiceRollLog(player, dice));
    }

    this.showBody = ko.computed(function(){
        return this.live() || this.show();
    }, this);
    this.showDice = ko.computed(function() {
        return this.diceRolls().length > 0;
    }, this);

    this.count = function(face_value) {
        var ret = 0;
        for (var i = 0; i < this.diceRolls().length; i++) {
            ret += this.diceRolls()[i].count(face_value);
        }
        return ret;
    }
    this.ones = function() {
        return this.count(1);
    }
    this.twos = function(){
        return this.count(2);
    }
    this.threes = function(){
        return this.count(3);
    }
    this.fours = function(){
        return this.count(4);
    }
    this.fives = function(){
        return this.count(5);
    }
    this.sixes = function(){
        return this.count(6);
    }
}

DiceRollLog = function(player, dice) {
    this.player = ko.observable(player);
    this.dice = ko.observableArray(dice);

    this.count = function(face_value) {
        return this.dice().filter(function(die) { return die == face_value; }).length;
    }

    this.ones = function(){
        return this.count(1);
    }
    this.twos = function(){
        return this.count(2);
    }
    this.threes = function(){
        return this.count(3);
    }
    this.fours = function(){
        return this.count(4);
    }
    this.fives = function(){
        return this.count(5);
    }
    this.sixes = function(){
        return this.count(6);
    }
}
