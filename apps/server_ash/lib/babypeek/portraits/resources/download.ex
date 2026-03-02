defmodule Babypeek.Portraits.Download do
  @moduledoc """
  Download resource — tracks HD image downloads for analytics & re-download.
  """
  use Ash.Resource,
    domain: Babypeek.Portraits,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "downloads"
    repo Babypeek.Repo
  end

  attributes do
    uuid_v7_primary_key :id
    attribute :ip_hash, :string

    create_timestamp :downloaded_at
  end

  relationships do
    belongs_to :purchase, Babypeek.Portraits.Purchase, allow_nil?: false
  end

  actions do
    defaults [:read]

    create :create do
      accept [:purchase_id, :ip_hash]
    end
  end
end
