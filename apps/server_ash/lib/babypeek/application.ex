defmodule Babypeek.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      BabypeekWeb.Telemetry,
      Babypeek.Repo,
      {DNSCluster, query: Application.get_env(:babypeek, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Babypeek.PubSub},
      {Oban, Application.fetch_env!(:babypeek, Oban)},
      BabypeekWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Babypeek.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    BabypeekWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
