export const language = "csharp";
export const label = "C#";

export const code = `using Kibamail;

var kibamail = new KibamailClient("your-api-key");

await kibamail.Emails.SendAsync(new SendEmailRequest {
    From = "hello@yourdomain.com",
    To = "user@example.com",
    Subject = "Welcome to Kibamail",
    Html = "<h1>Hello World</h1>"
});
`;
