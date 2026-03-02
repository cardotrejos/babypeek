defmodule Babypeek.Portraits.Preference do
  @moduledoc """
  Preference resource — A/B test tracking for prompt variants.
  Tracks which result variants users prefer and why.
  """
  use Ash.Resource,
    domain: Babypeek.Portraits,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "preferences"
    repo Babypeek.Repo
  end

  attributes do
    uuid_v7_primary_key :id

    attribute :selected_prompt_version, :atom do
      constraints one_of: [:v3, :"v3-json", :v4, :"v4-json"]
      allow_nil? false
    end

    attribute :reason, :atom do
      constraints one_of: [
        :more_realistic, :better_lighting, :cuter_expression,
        :clearer_details, :better_colors, :more_natural, :other
      ]
    end

    # JSON array of prompt versions shown
    attribute :shown_variants, :string, allow_nil?: false

    create_timestamp :created_at
  end

  relationships do
    belongs_to :upload, Babypeek.Portraits.Upload, allow_nil?: false
    belongs_to :selected_result, Babypeek.Portraits.Result, allow_nil?: false
  end

  actions do
    defaults [:read]

    create :create do
      accept [
        :upload_id, :selected_result_id, :selected_prompt_version,
        :reason, :shown_variants
      ]
    end
  end
end
