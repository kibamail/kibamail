export const language = "elixir";
export const label = "Phoenix";

export const code = `defmodule MyAppWeb.UserController do
  use MyAppWeb, :controller

  alias Kibamail.Mailer

  def create(conn, %{"user" => user_params}) do
    Mailer.deliver(%{
      from: "hello@yourdomain.com",
      to: user_params["email"],
      subject: "Welcome to Kibamail",
      html: Phoenix.View.render_to_string(MyAppWeb.EmailView, "welcome.html", user: user_params)
    })

    json(conn, %{status: "ok"})
  end
end
`;
