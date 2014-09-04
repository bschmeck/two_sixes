Rails.application.routes.draw do
  devise_for :users

  resources :games do
    member do
      post 'bid'
      post 'bs'
      post 'comments'
      get 'events'
      post 'invite'
      post 'start'
    end
  end

  resources :invites, only: [] do
    member do
      post 'accept'
      post 'decline'
      post 'revoke'
    end
  end

  root to: "games#index"
end
