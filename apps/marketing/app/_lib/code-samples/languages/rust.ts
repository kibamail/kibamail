export const language = "rust";
export const label = "Rust";

export const code = `use kibamail::Kibamail;

#[tokio::main]
async fn main() {
    let kibamail = Kibamail::new("your-api-key");

    kibamail.emails().send(SendEmailRequest {
        from: "hello@yourdomain.com",
        to: "user@example.com",
        subject: "Welcome to Kibamail",
        html: "<h1>Hello World</h1>",
    }).await?;
}
`;
