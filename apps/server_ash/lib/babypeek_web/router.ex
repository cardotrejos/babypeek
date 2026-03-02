defmodule BabypeekWeb.Router do
  use BabypeekWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", BabypeekWeb do
    pipe_through :api
  end
end
