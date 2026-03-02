defmodule Babypeek.Repo do
  use AshPostgres.Repo,
    otp_app: :babypeek

  def installed_extensions do
    ["uuid-ossp", "citext"]
  end
end
