class Game < ActiveRecord::Base
  include Startable

  belongs_to :owner, class_name: "User"
  has_many :game_events, dependent: :destroy
  has_many :players, dependent: :destroy
  has_many :rounds, dependent: :destroy
  has_many :invites, dependent: :destroy

  scope :in_progress, -> { where("started_at IS NOT NULL AND finished_at IS NULL") }
  scope :waiting, -> { where(started_at: nil, finished_at: nil) }

  def before_start
    revoke_open_and_declined_invites
    seat_players
    assign_dice
  end

  def after_start
    start_round
  end

  def start_round
    raise UsageError.new "Unable to start round when game is not in progress." unless in_progress?

    if round
      number = round.number + 1
      starting_player = round.next_player round.loser
    else
      number = 0
      starting_player = players.find_by_seat 0
    end
    @round = rounds.create(number: number, starting_player: starting_player)
    add_event(@round)

    @round.start
  end

  def finish_round
    raise UsageError.new "Unable to end round when game is not in progress." unless in_progress?
    raise UsageError.new "Unable to end round before starting a round." unless round

    round.finish
    if players.with_dice.count > 1
      start_round
    else
      finish
    end
  end

  def events(last_seen=nil)
    if last_seen
      game_events.where("number > ?", last_seen)
    else
      game_events
    end
  end

  def add_event(action)
    number = last_event.number + 1 if last_event
    number ||= 0

    if action.is_a? Call
      if action.bs?
        name = "BS"
      else
        if action.legal?
          name = "Bid"
        else
          name = "IllegalBid"
        end
      end
    elsif action.is_a? Comment
      name = "Comment"
    elsif action.is_a? Round
      name = "New Round"
    elsif action.is_a? Roll
      name = "Dice Roll"
    elsif action.is_a? DieLostEvent
      name = "Die Lost"
    elsif action.is_a? Player
      name = "Player Added"
    elsif action.is_a? Invite
      if action.open?
        name = "Invite Sent"
      elsif action.accepted?
        name = "Invite Accepted"
      elsif action.declined?
        name = "Invite Declined"
      elsif action.revoked?
        name = "Invite Revoked"
      end
    end

    game_events.create(number: number, action: action, name: name)
  end

  def add_comment(user, message)
    player = player_for(user)
    comment = player.comments.create(message: message)
    add_event(comment)
  end

  def filter_event?(player, event)
    return false unless event.action.is_a? Roll
    return true unless player
    event.action.player != player
  end

  def round
    @round ||= rounds.order(:number).last
  end

  def last_event
    game_events.order(:number).last
  end

  def add_player(user, handle)
    raise UsageError.new "Unable to join once game has started." if started?

    player = players.create(user: user, handle: handle)
    add_event(player)
    player
  end

  def seat_players
    raise UsageError.new "Unable to seat players once game has started." if started?

    players.shuffle.each_with_index { |player, seat| player.update_attributes(seat: seat) }
  end

  def assign_dice
    raise UsageError.new "Unable to assign dice once game has started." if started?

    players.each_with_index { |player, seat| player.update_attributes(dice_count: 5, starting_dice_count: 5) }
  end

  def player_for(user)
    players.find_by_user_id(user.id)
  end

  def bidder
    round.bidder if round
  end

  def current_bid
    round.current_bid if round
  end

  def bid(user, bid)
    raise UsageError.new "Unable to bid when game is not in progress." unless in_progress?

    player = player_for(user)
    legal_bid = round.bid(player, bid)

    unless legal_bid
      finish_round
    end
  end

  def bs(user)
    raise UsageError.new "Unable to call bs when game is not in progress." unless in_progress?

    player = player_for(user)
    round.bs(player)

    finish_round
  end

  def revoke_open_and_declined_invites
    invites.open.each(&:revoke)
    invites.declined.each(&:revoke)
  end

  def die_lost_events
    events.where(action_type: "DieLostEvent").map(&:action)
  end
end
