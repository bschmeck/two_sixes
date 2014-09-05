class Call < ActiveRecord::Base
  belongs_to :player
  belongs_to :round

  def to_hash
    ret = { bs: bs, seat: player.seat, sequenceNumber: sequence_number, legal: legal }
    if bid
      ret[:number] = bid.number
      ret[:faceValue] = bid.face_value
    else
      ret[:totals] = round.totals_by_seat(previous_bid.face_value)
      ret[:dice] = round.rolls.map(&:to_hash)
    end

    ret
  end

  def to_s
    if bid
      bid.to_s
    else
      "BS"
    end
  end

  def bid
    return nil if bs?
    Bid.new number, face_value
  end

  def previous_bid
    round.previous_bid(self)
  end
end
