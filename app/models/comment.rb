class Comment < ActiveRecord::Base

  belongs_to :player

  def to_hash
    {
      seatNumber: player.seat,
      message: message
    }
  end

  def to_json
    to_hash.to_json
  end

end
