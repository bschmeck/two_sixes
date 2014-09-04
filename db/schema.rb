# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20140904221722) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "calls", force: true do |t|
    t.integer  "number"
    t.integer  "face_value"
    t.integer  "sequence_number"
    t.boolean  "bs"
    t.integer  "player_id"
    t.integer  "round_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.boolean  "legal",           default: true
  end

  create_table "comments", force: true do |t|
    t.string   "message"
    t.integer  "player_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "die_lost_events", force: true do |t|
    t.integer  "round_id"
    t.integer  "player_id"
    t.integer  "final_number"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "description"
  end

  create_table "game_events", force: true do |t|
    t.string   "action_type"
    t.integer  "action_id"
    t.integer  "number",      null: false
    t.integer  "game_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "name"
  end

  create_table "games", force: true do |t|
    t.integer  "owner_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "started_at"
    t.datetime "finished_at"
  end

  create_table "invites", force: true do |t|
    t.string   "email"
    t.integer  "user_id"
    t.integer  "game_id"
    t.datetime "declined_at"
    t.datetime "revoked_at"
    t.datetime "accepted_at"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "players", force: true do |t|
    t.integer  "seat"
    t.integer  "user_id"
    t.integer  "dice_count"
    t.integer  "starting_dice_count"
    t.integer  "finish"
    t.integer  "game_id"
    t.string   "handle"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "roll_id"
  end

  create_table "rolls", force: true do |t|
    t.integer  "round_id"
    t.integer  "player_id"
    t.string   "dice_string"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "rounds", force: true do |t|
    t.integer  "game_id"
    t.integer  "number"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "started_at"
    t.datetime "finished_at"
    t.boolean  "ones_wild",          default: true
    t.integer  "starting_player_id"
    t.integer  "loser_id"
  end

  create_table "users", force: true do |t|
    t.string   "email"
    t.string   "name"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "encrypted_password",     default: "", null: false
    t.string   "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer  "sign_in_count",          default: 0,  null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string   "current_sign_in_ip"
    t.string   "last_sign_in_ip"
  end

  add_index "users", ["email"], name: "index_users_on_email", unique: true, using: :btree
  add_index "users", ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true, using: :btree

end
