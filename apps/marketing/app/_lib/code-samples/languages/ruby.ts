export const language = "ruby";
export const label = "Ruby";

export const code = `require 'kibamail'

kibamail = Kibamail::Client.new('your-api-key')

kibamail.emails.send(
  from: 'hello@yourdomain.com',
  to: 'user@example.com',
  subject: 'Welcome to Kibamail',
  html: '<h1>Hello World</h1>'
)
`;
