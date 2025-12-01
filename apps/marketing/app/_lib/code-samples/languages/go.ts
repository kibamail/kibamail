export const language = "go";
export const label = "Go";

export const code = `package main

import "github.com/kibamail/kibamail-go"

func main() {
    client := kibamail.New("your-api-key")

    client.Emails.Send(&kibamail.SendEmailRequest{
        From:    "hello@yourdomain.com",
        To:      "user@example.com",
        Subject: "Welcome to Kibamail",
        HTML:    "<h1>Hello World</h1>",
    })
}
`;
