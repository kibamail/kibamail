export const language = "python";
export const label = "Flask";

export const code = `from flask import Flask
from kibamail import Kibamail

app = Flask(__name__)
kibamail = Kibamail("your-api-key")

@app.route("/send-email", methods=["POST"])
def send_email():
    kibamail.emails.send(
        from_email="hello@yourdomain.com",
        to="user@example.com",
        subject="Welcome to Kibamail",
        html="<h1>Hello World</h1>",
    )
    return {"status": "sent"}
`;
