defmodule Babypeek.Portraits.Purchase do
  @moduledoc """
  Purchase resource — tracks Stripe payments.
  Maps to the existing `purchases` table.
  """
  use Ash.Resource,
    domain: Babypeek.Portraits,
    data_layer: AshPostgres.DataLayer,
    extensions: [AshJsonApi.Resource, AshTypescript.Resource]

  postgres do
    table "purchases"
    repo Babypeek.Repo
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :stripe_session_id, :string
    attribute :stripe_payment_intent_id, :string
    attribute :amount, :integer, allow_nil?: false
    attribute :currency, :string, default: "usd", allow_nil?: false

    attribute :status, :atom do
      constraints one_of: [:pending, :completed, :failed, :refunded]
      default :pending
      allow_nil? false
    end

    # Gift purchase support
    attribute :is_gift, :boolean, default: false, allow_nil?: false
    attribute :gift_recipient_email, :string

    create_timestamp :created_at
  end

  identities do
    identity :unique_stripe_session, [:stripe_session_id]
  end

  relationships do
    belongs_to :upload, Babypeek.Portraits.Upload, allow_nil?: false
    has_many :downloads, Babypeek.Portraits.Download
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [:upload_id, :stripe_session_id, :amount, :currency, :is_gift, :gift_recipient_email]
    end

    update :complete do
      accept [:stripe_payment_intent_id]
      change set_attribute(:status, :completed)
    end

    update :fail do
      accept []
      change set_attribute(:status, :failed)
    end

    update :refund do
      accept []
      change set_attribute(:status, :refunded)
    end

    read :by_stripe_session do
      argument :stripe_session_id, :string, allow_nil?: false
      get? true
      filter expr(stripe_session_id == ^arg(:stripe_session_id))
    end
  end

  json_api do
    type "purchase"

    routes do
      base "/purchases"
      get :read
    end
  end
end
