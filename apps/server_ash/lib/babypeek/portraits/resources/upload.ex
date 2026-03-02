defmodule Babypeek.Portraits.Upload do
  @moduledoc """
  Upload resource — tracks ultrasound uploads and AI processing.
  Maps to the existing `uploads` table from Drizzle schema.
  """
  use Ash.Resource,
    domain: Babypeek.Portraits,
    data_layer: AshPostgres.DataLayer,
    extensions: [AshJsonApi.Resource, AshTypescript.Resource]

  postgres do
    table "uploads"
    repo Babypeek.Repo
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :email, :string, allow_nil?: false
    attribute :session_token, :string, allow_nil?: false

    # Image URLs (R2)
    attribute :original_url, :string, allow_nil?: false
    attribute :result_url, :string
    attribute :preview_url, :string

    # Processing status
    attribute :status, :atom do
      constraints one_of: [:pending, :processing, :completed, :failed]
      default :pending
      allow_nil? false
    end

    attribute :stage, :atom do
      constraints one_of: [
        :validating, :generating, :first_ready,
        :storing, :watermarking, :complete, :failed
      ]
    end

    attribute :progress, :integer, default: 0
    attribute :workflow_run_id, :string
    attribute :prompt_version, :atom do
      constraints one_of: [:v3, :"v3-json", :v4, :"v4-json"]
    end
    attribute :error_message, :string

    attribute :expires_at, :utc_datetime_usec

    create_timestamp :created_at
    update_timestamp :updated_at
  end

  identities do
    identity :unique_session_token, [:session_token]
  end

  relationships do
    has_many :results, Babypeek.Portraits.Result
    has_many :purchases, Babypeek.Portraits.Purchase
    has_many :preferences, Babypeek.Portraits.Preference
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [:email, :session_token, :original_url]

      change fn changeset, _context ->
        # Auto-set expiry to 30 days from now
        Ash.Changeset.change_attribute(
          changeset,
          :expires_at,
          DateTime.add(DateTime.utc_now(), 30, :day)
        )
      end
    end

    update :update do
      accept [:status, :stage, :progress, :result_url, :preview_url,
              :workflow_run_id, :prompt_version, :error_message]
    end

    update :start_processing do
      accept []
      change set_attribute(:status, :processing)
      change set_attribute(:stage, :validating)
      change set_attribute(:progress, 0)
    end

    update :complete_processing do
      accept [:result_url, :preview_url, :prompt_version]
      change set_attribute(:status, :completed)
      change set_attribute(:stage, :complete)
      change set_attribute(:progress, 100)
    end

    update :fail_processing do
      accept [:error_message]
      change set_attribute(:status, :failed)
      change set_attribute(:stage, :failed)
    end

    read :by_session_token do
      argument :session_token, :string, allow_nil?: false
      get? true
      filter expr(session_token == ^arg(:session_token))
    end

    read :expired do
      filter expr(expires_at < now() and status != :failed)
    end
  end

  json_api do
    type "upload"

    routes do
      base "/uploads"
      get :read
      index :read
      post :create
    end
  end
end
