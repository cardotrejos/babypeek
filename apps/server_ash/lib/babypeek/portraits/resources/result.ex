defmodule Babypeek.Portraits.Result do
  @moduledoc """
  Result resource — stores AI-generated images per upload.
  Each upload can have up to 4 results from different prompt versions.
  """
  use Ash.Resource,
    domain: Babypeek.Portraits,
    data_layer: AshPostgres.DataLayer,
    extensions: [AshJsonApi.Resource, AshTypescript.Resource]

  postgres do
    table "results"
    repo Babypeek.Repo
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :result_url, :string, allow_nil?: false
    attribute :preview_url, :string

    attribute :prompt_version, :atom do
      constraints one_of: [:v3, :"v3-json", :v4, :"v4-json"]
      allow_nil? false
    end

    attribute :variant_index, :integer, allow_nil?: false
    attribute :file_size_bytes, :integer
    attribute :generation_time_ms, :integer

    create_timestamp :created_at
  end

  relationships do
    belongs_to :upload, Babypeek.Portraits.Upload, allow_nil?: false
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [
        :upload_id, :result_url, :preview_url, :prompt_version,
        :variant_index, :file_size_bytes, :generation_time_ms
      ]
    end

    read :for_upload do
      argument :upload_id, :uuid_v7, allow_nil?: false
      filter expr(upload_id == ^arg(:upload_id))
    end
  end

  json_api do
    type "result"

    routes do
      base "/results"
      get :read
      index :read
    end
  end
end
