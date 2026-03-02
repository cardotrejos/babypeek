# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :babypeek,
  ecto_repos: [Babypeek.Repo],
  generators: [timestamp_type: :utc_datetime, binary_id: true]

# Configure the endpoint
config :babypeek, BabypeekWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: BabypeekWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Babypeek.PubSub,
  live_view: [signing_salt: "znNNV0TA"]

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"

# Ash configuration
config :babypeek,
  ash_domains: [Babypeek.Portraits]

# Oban configuration
config :babypeek, Oban,
  engine: Oban.Engines.Basic,
  queues: [
    default: 10,
    portrait_generation: 3,   # Limit concurrent AI generations
    cleanup: 1
  ],
  repo: Babypeek.Repo
