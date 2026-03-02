defmodule Babypeek.Portraits do
  @moduledoc """
  The Portraits domain — core business logic for BabyPeek.

  Handles uploads, AI processing, purchases, results, and preferences.
  Maps 1:1 with the existing Drizzle schema tables.
  
  AshTypescript RPC client is generated from here:
    mix ash.codegen --dev
  Output: apps/web/src/generated/
  """
  use Ash.Domain,
    extensions: [AshJsonApi.Domain, AshTypescript.Rpc]

  resources do
    resource Babypeek.Portraits.Upload
    resource Babypeek.Portraits.Purchase
    resource Babypeek.Portraits.Result
    resource Babypeek.Portraits.Download
    resource Babypeek.Portraits.Preference
  end

  typescript_rpc do
    resource Babypeek.Portraits.Upload do
      rpc_action :create_upload, :create
      rpc_action :get_upload, :read
      rpc_action :get_upload_by_session, :by_session_token
      rpc_action :start_processing, :start_processing
      rpc_action :complete_processing, :complete_processing
      rpc_action :fail_processing, :fail_processing
    end

    resource Babypeek.Portraits.Purchase do
      rpc_action :create_purchase, :create
      rpc_action :complete_purchase, :complete
      rpc_action :get_purchase_by_stripe, :by_stripe_session
    end

    resource Babypeek.Portraits.Result do
      rpc_action :create_result, :create
      rpc_action :get_results_for_upload, :for_upload
    end

    resource Babypeek.Portraits.Preference do
      rpc_action :create_preference, :create
    end

    resource Babypeek.Portraits.Download do
      rpc_action :create_download, :create
    end
  end
end
