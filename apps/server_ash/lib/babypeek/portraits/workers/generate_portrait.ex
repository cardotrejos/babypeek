defmodule Babypeek.Portraits.Workers.GeneratePortrait do
  @moduledoc """
  Oban worker for AI portrait generation.
  Replaces the Hono processWorkflow + useworkflow.dev integration.

  Pipeline:
  1. Validate uploaded image (stage: :validating)
  2. Call Gemini API for generation (stage: :generating)
  3. Store first result (stage: :first_ready)
  4. Store all variants to R2 (stage: :storing)
  5. Generate watermarked previews (stage: :watermarking)
  6. Mark complete (stage: :complete)
  """
  use Oban.Worker,
    queue: :portrait_generation,
    max_attempts: 3,
    priority: 0

  require Ash.Query
  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"upload_id" => upload_id}}) do
    with {:ok, upload} <- fetch_upload(upload_id),
         :ok <- update_stage(upload, :validating),
         :ok <- validate_image(upload),
         :ok <- update_stage(upload, :generating),
         {:ok, generated_images} <- generate_with_gemini(upload),
         :ok <- update_stage(upload, :first_ready),
         :ok <- update_stage(upload, :storing),
         {:ok, stored_results} <- store_results(upload, generated_images),
         :ok <- update_stage(upload, :watermarking),
         {:ok, _previews} <- generate_previews(upload, stored_results),
         :ok <- complete_upload(upload, stored_results) do
      :ok
    else
      {:error, reason} ->
        Logger.error("Portrait generation failed for #{upload_id}: #{inspect(reason)}")
        fail_upload(upload_id, reason)
        {:error, reason}
    end
  end

  # --- Pipeline steps (stubs to be implemented) ---

  defp fetch_upload(upload_id) do
    Babypeek.Portraits.Upload
    |> Ash.get(upload_id)
  end

  defp update_stage(upload, stage) do
    upload
    |> Ash.Changeset.for_update(:update, %{stage: stage})
    |> Ash.update()
    |> case do
      {:ok, _} -> :ok
      error -> error
    end
  end

  defp validate_image(_upload) do
    # TODO: Validate image format, size, content
    :ok
  end

  defp generate_with_gemini(_upload) do
    # TODO: Call Gemini API with prompt versions
    # Returns list of generated image binaries
    {:ok, []}
  end

  defp store_results(_upload, _generated_images) do
    # TODO: Upload to R2, create Result records
    {:ok, []}
  end

  defp generate_previews(_upload, _stored_results) do
    # TODO: Generate watermarked preview versions
    {:ok, []}
  end

  defp complete_upload(upload, _stored_results) do
    upload
    |> Ash.Changeset.for_update(:complete_processing, %{})
    |> Ash.update()
    |> case do
      {:ok, _} -> :ok
      error -> error
    end
  end

  defp fail_upload(upload_id, reason) do
    with {:ok, upload} <- fetch_upload(upload_id) do
      upload
      |> Ash.Changeset.for_update(:fail_processing, %{
        error_message: inspect(reason)
      })
      |> Ash.update()
    end
  end
end
