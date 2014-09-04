class GamesController < ApplicationController
  before_action :authenticate_user!, except: [:events, :show, :stats]

  ##############################
  ##  Controller Methods      ##
  ##  (Sorted alphabetically) ##
  ##############################

  def bid
    game = current_user.games.find(params[:id])
    number = params[:number]
    face_value = params[:face_value]
    errors = []
    errors << "The bid must include a total number." unless number
    errors << "The bid must include a valid total number." unless number =~ /\A\d+\z/
    errors << "The bid must include a face value." unless face_value =~ /\A\d+\z/
    errors << "The bid must include a valid face value." unless face_value =~ /\A\d+\z/

    render status: 400, json: {errors: errors} and return if errors.any?

    bid = Bid.new(number.to_i, face_value.to_i)
    game.bid(current_user, bid)
  end

  def bs
    game = current_user.games.find(params[:id])
    game.bs(current_user)
  end

  def comments
    game = current_user.games.find(params[:id])
    game.add_comment(current_user, params[:message])
  end

  def create
    @game = current_user.owned_games.create
    handle = params[:handle]
    handle = current_user.name if handle.blank?
    @game.add_player(current_user, handle)

    redirect_to @game
  end

  def events
    game = Game.find(params[:id])
    player = game.player_for(current_user) if current_user

    ret = game.events(params[:prev_event]).reject{|event| game.filter_event?(player, event) }.map do |event|
      {
        number: event.number,
        event: event.name,
        data: event.action.to_hash
      }
    end
    render json: ret
  end

  def index
    @games = current_user.games.in_progress
    @games += current_user.games.waiting
  end

  def invite
    game = current_user.owned_games.find(params[:id])

    email = params[:invite][:email].downcase
    user = User.find_by_email(email)
    invite = game.invites.create(user: user, email: email)
    if invite.valid?
      game.add_event(invite)
      UserMailer.invite(invite).deliver
    else
      messages = invite.errors.messages
      if messages[:email] == ["is not an email"]
        error_message = ", email address is invalid"
      elsif messages[:email] == ["has already been taken"]
        error_message = ", has already been invited"
      end
      flash[:alert] = "Unable to invite #{invite.email}#{error_message}."
    end
    redirect_to game
  end

  def show
    @game = Game.find(params[:id])
    @player = @game.player_for(current_user) if current_user
    @is_owner = !!(current_user && current_user.owns?(@game))
    @can_revoke = @is_owner
    @can_invite = @is_owner
    @urls = {}
    @urls[:bid] = bid_game_url(@game)
    @urls[:bs] = bs_game_url(@game)
    @urls[:events] = events_game_url(@game)
    @urls[:comments] = comments_game_url(@game)

    if @game.finished?
      redirect_to stats_games_path(@game)
    elsif !@game.started?
      render "waiting" and return
    end
  end

  def start
    game = current_user.owned_games.find(params[:id])
    game.start

    redirect_to game
  end

  def stats
    @game = Game.find(params[:id])
  end
end
