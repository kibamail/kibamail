export const language = "elixir";
export const label = "Elixir";

export const code = `defmodule MyApp.Email do
  use Kibamail

  def send_welcome(user) do
    Kibamail.send(%{
      from: "hello@yourdomain.com",
      to: user.email,
      subject: "Welcome to Kibamail",
      html: "<h1>Hello World</h1>"
    })
  end
end
`;
