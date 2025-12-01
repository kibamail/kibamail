export const language = "swift";
export const label = "Swift";

export const code = `import Kibamail

let kibamail = Kibamail(apiKey: "your-api-key")

try await kibamail.emails.send(
    from: "hello@yourdomain.com",
    to: "user@example.com",
    subject: "Welcome to Kibamail",
    html: "<h1>Hello World</h1>"
)
`;
