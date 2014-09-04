DICE_ICONS = [0, '⚀','⚁','⚂','⚃','⚄','⚅'];

function GameViewModel(urls) {
    var self = this;
    this.eventsUrl = urls["events"];
    this.bidUrl = urls["bid"];
    this.bsUrl = urls["bs"];
    this.commentsUrl = urls["comments"];
    this.highwaterMark = -1;
    this.bidder = ko.observable(0);
    this.waiting = false;
    this.paused = false;
    this.currentBid = ko.observable();
    this.eventHandlers = {};
    this.events = [];
    this.processing = false;
    this.diceTotal = ko.observable();
    this.bidMade = ko.observable(false);
    this.log = ko.observable(new Log());
    this.chat = ko.observable(new Chat());
    this.commentToAdd = ko.observable("");

    self.players = ko.observableArray();
    self.addPlayer = function(player) {
        self.players.push(player);
    }
    self.playerInSeat = function(seatNumber) {
        for (var i = 0; i < self.players().length; i++) {
            player = self.players()[i];
            if (player.seatNumber == seatNumber)
                return player;
        }
    }
    self.dieLoser = ko.computed(function() {
        for (var i = 0; i < self.players().length; i++) {
            player = self.players()[i];
            if (player.lostDie())
                return player;
        }
    }, this);

    /* Layout players on the board in rows.  The current player goes on the bottom in the middle,
     * all other rows have a player on the left and a player on the right, with 3 players in the top
     * row, if necessary.
     */
    self.rows = ko.computed(function() {
        var arr = [];
        var currentPlayer;
        for (var i = 0; i < self.players().length; i++)
            if (self.players()[i].isCurrentPlayer()) {
                var row = new Row();
                currentPlayer = self.players()[i];
                row.addColumn("col-md-3 col-md-offset-4", currentPlayer);
                arr.push(row)
                break;
            }
        if (arr.length == 0)
            // Just punt for now if there's no currentPlayer
            return [];

        if (self.players().length == 2) {
            // 2 players is a special case.  The non-current player goes in the middle of the top row.
            var topRow = new Row();
            otherPlayer = self.playerInSeat(currentPlayer.seatNumber == 0 ? 1 : 0);
            topRow.addColumn("col-md-3 col-md-offset-4", otherPlayer);
            arr.unshift(topRow);
        } else {
            /* Build the rows from the bottom up, it makes computing seats easier.
             * The players in the left column are currentPlayer's seat plus row number, the
             * players in the right column are currentPlayer's seat minus row number (when the bottom row is
             * row 0.)
             * ----------------------------
             *         | (x + 4) |
             * | x + 3 |         | x - 3|
             * | x + 2 |         | x - 2|
             * | x + 1 |         | x - 1|
             *            | x |
             * ----------------------------
             * The only special case is the top row, which will only have 1 player if there's an even number of players
             */
            var rowCount = Math.ceil(self.players().length / 2);
            if (self.players().length % 2 == 0)
                rowCount += 1;
            for (var i = 1; i < rowCount; i++) {
                var row = new Row();
                if (i == rowCount - 1 && self.players().length % 2 == 0) {
                    // We need 1 in the top row if there's an even number of players
                    row.addColumn("col-md-3 col-md-offset-4", self.playerInSeat(self.adjustSeat(currentPlayer.seatNumber, i)));
                } else {
                    row.addColumn("col-md-3 col-md-offset-1", self.playerInSeat(self.adjustSeat(currentPlayer.seatNumber, i)));
                    row.addColumn("col-md-3 col-md-offset-4", self.playerInSeat(self.adjustSeat(currentPlayer.seatNumber, -i)));
                }

                arr.unshift(row);
            }
        }

        return arr;
    });

    self.invites = ko.observableArray();
    self.addInvite = function(invite) {
        self.invites.push(invite);
    }
    self.openInvites = ko.computed(function(){
        return this.invites().filter(function(invite){
            return invite.isOpen();
        });
    }, this);
    self.declinedInvites = ko.computed(function(){
        return this.invites().filter(function(invite){
            return invite.isDeclined();
        });
    }, this);
    self.openAndDeclinedInvites = ko.computed(function(){
        return this.invites().filter(function(invite){
            return invite.isOpen() || invite.isDeclined();
        });
    }, this);
    self.inviteIndex = function(email) {
        for (var i = 0; i < self.invites().length; i++)
            if (self.invites()[i].email == email)
                return i;
        return -1;
    }
    self.inviteFor = function(email) {
        var indx = self.inviteIndex(email);
        if (indx < 0)
            return;
        return self.invites()[indx];
    }
    self.removeInvite = function(email) {
        var indx = self.inviteIndex(email);
        if (indx < 0)
            return;
        self.invites.splice(indx, 1);
    }

    /*
       Call an event handler for a given event, based upon that event's name.
       Return the number of milliseconds to wait before processing the next
       event (if any.)
    */
    self.dispatch = function(event) {
        var func = self.eventHandlers[event.event];
        if (func)
            return func(event);
        else
            return 0;
    }
    self.eventHandlers["Comment"] = function(event) {
        self.displayComment(event.data);
        return 0;
    }
    self.eventHandlers["Player Added"] = function(event) {
        self.addPlayer(new Player(event.data));
        return 0;
    }
    self.eventHandlers["Invite Sent"] = function(event) {
        self.addInvite(new Invite(event.data));
        return 0;
    }
    self.eventHandlers["Invite Accepted"] = function(event) {
        var invite = self.inviteFor(event.data.email);
        if (invite) {
            invite.accept();
        } else {
            self.addInvite(new Invite(event.data));
        }
        return 0;
    }
    self.eventHandlers["Invite Declined"] = function(event) {
        var invite = self.inviteFor(event.data.email);
        if (invite) {
            invite.decline();
        } else {
            self.addInvite(new Invite(event.data));
        }
        return 0;
    }
    self.eventHandlers["Invite Revoked"] = function(event) {
        self.removeInvite(event.data.email);
        return 0;
    }
    self.eventHandlers["New Round"] = function(event) {
        if (self.waiting) {
            window.location.reload();
        } else {
            for (var i = 0; i < event.data.players.length; i++) {
                var playerData = event.data.players[i];
                var player = self.playerInSeat(playerData.seatNumber);
                player.reset(playerData.hasDice);
            }
            self.reset(event.data.bidder);
            self.log().addRound();
        }
        return 0;
    }
    self.eventHandlers["BS"] = function(event) {
        var total = 0;
        for (var i = 0; i < self.players().length; i++) {
            var player = self.playerInSeat(i);
            player.diceTotal(event.data.totals[i]);
            total += event.data.totals[i];
            if (i == event.data.seat)
                player.calledBS(true);
        }
        self.diceTotal(new Bid(total, self.currentBid().faceValue));

        return 2000;
    }
    self.eventHandlers["Bid"] = function(event) {
        var bid = new Bid(event.data.number, event.data.faceValue);
        self.currentBid(bid);
        self.log().addBid(self.playerInSeat(event.data.seat), bid);
        self.bidder(self.nextBidder());
        self.bidMade(false);
        return 1000;
    }
    self.eventHandlers["Die Lost"] = function(event) {
        var player = self.playerInSeat(event.data.seat);
        player.loseDie();
        self.log().addDieLost(event.data.description, player.isCurrentPlayer());

        return 10000;
    }
    self.eventHandlers["Dice Roll"] = function(event) {
        var player = self.playerInSeat(event.data.seatNumber);
        player.assignDice(event.data.dice);
        return 0;
    }

    self.plusOne = function() {
        var bid = self.currentBid().plusOne();
        self.submitBid(bid);
    }
    self.bid = function() {
        var number = parseInt($("#number").val());
        var faceValue = parseInt($("#face_value").val());
        var bid = new Bid(number, faceValue);

        self.submitBid(bid);
    }
    self.submitBid = function(bid) {
        self.bidMade(true);
        $.post(self.bidUrl, { number: bid.number, face_value: bid.faceValue }, function(data) {
            alert("successful bid.")
        });
    }
    self.bs = function() {
        self.bidMade(true);
        $.post(self.bsUrl, {}, function(data) {
            alert("successful bs.")
        });
    }

    self.process = function() {
        self.processing = true;
        if (self.events.length == 0) {
            self.processing = false;
            return;
        }
        var event = self.events.shift();
        var delay = self.dispatch(event);
        /* Only update highwaterMark if the event's sequence number is actually higher.
           (Hopefully we never actually process events out of order.)
        */
        if (event.number > self.highwaterMark)
            self.highwaterMark = event.number;
        if (delay == 0)
            self.process();
        else
            setTimeout(self.process, delay);
    }

    self.loop = function() {
        if (self.processing || self.paused) {
            setTimeout(self.loop, 2000);
            return;
        }

        var jqxhr = $.get(self.eventsUrl, { prev_event: self.highwaterMark}, function(data){
            self.events = self.events.concat(data);
            self.process();
        });
        jqxhr.always(function(){
            setTimeout(self.loop, 2000);
        });
    }

    self.pause = function() { self.paused = true; }

    self.nextBidder = function() {
        var next = self.adjustSeat(self.bidder(), 1);
        while (self.playerInSeat(next).noDice())
            next = self.adjustSeat(next, 1);
        return next;
    }

    self.adjustSeat = function(seat, adjust) {
        if (adjust < 0)
            // Convert a negative adjustment to the corresponding positive adjustment
            adjust = self.players().length + (adjust % self.players().length);
        return (seat + adjust) % self.players().length;
    }

    self.reset = function(startingSeat) {
        self.bidder(startingSeat);
        self.bidMade(false);
        self.currentBid(null);
        self.diceTotal(null);
    }

    //Chat
    self.addComment = function() {
        var currentPlayer;
        for (var i = 0; i < self.players().length; i++)
            if (self.players()[i].isCurrentPlayer()) {
              currentPlayer = self.players()[i];
            }

        if (this.commentToAdd() != "") {
            //Push comment to server
            $.post(self.commentsUrl, { message: this.commentToAdd() }, function(data) {
                //commented
            });

            this.chat().comments.push("<span>" + currentPlayer.handle + ":</span> " + this.commentToAdd());
            this.commentToAdd("");
        }
        return;
    };

    self.displayComment = function(data) {
      var player = self.playerInSeat(data.seatNumber);
      if (!player.isCurrentPlayer())
        this.chat().comments.push("<span>" + player.handle + ":</span> " + data.message);

      return;
    };
}
