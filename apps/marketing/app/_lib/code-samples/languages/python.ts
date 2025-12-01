export const language = "python";
export const label = "Python";

export const code = `from kibamail import Kibamail

kibamail = Kibamail("your-api-key")

kibamail.emails.send(
    from_email="hello@yourdomain.com",
    to="user@example.com",
    subject="Welcome to Kibamail",
    html="<h1>Hello World</h1>",
)
`;
