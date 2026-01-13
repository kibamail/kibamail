import { codeToHtml } from "shiki";

export interface HighlightedSdk {
  name: string;
  code: string;
}

function getNodejsSdkUsage(email: string, from: string) {
  return `import { Kibamail } from 'kibamail'

const kibamail = new Kibamail('••••••••••••••••••••••••••••••••••••')

kibamail.emails.send({
    from: '${from}',
    to: '${email}',
    subject: 'my first email via kibamail api',
    html: '<p>you sent your first email using kibamail. congratulations!</p>',
})`;
}

function getPythonSdkUsage(email: string, from: string) {
  return `from kibamail import Kibamail

kibamail = Kibamail('••••••••••••••••••••••••••••••••••••')

kibamail.emails.send({
    'from': '${from}',
    'to': '${email}',
    'subject': 'my first email via kibamail api',
    'html': '<p>you sent your first email using kibamail. congratulations!</p>',
})`;
}

function getRubySdkUsage(email: string, from: string) {
  return `require 'kibamail'

kibamail = Kibamail.new('••••••••••••••••••••••••••••••••••••')

kibamail.emails.send({
  from: '${from}',
  to: '${email}',
  subject: 'my first email via kibamail api',
  html: '<p>you sent your first email using kibamail. congratulations!</p>',
})`;
}

function getGoSdkUsage(email: string, from: string) {
  return `package main

import (
    "github.com/kibamail/kibamail-go"
)

func main() {
    client := kibamail.New("••••••••••••••••••••••••••••••••••••")

    client.Emails.Send(kibamail.SendEmailRequest{
        From:    "${from}",
        To:      "${email}",
        Subject: "my first email via kibamail api",
        HTML:    "<p>you sent your first email using kibamail. congratulations!</p>",
    })
}`;
}

function getCurlSdkUsage(email: string, from: string) {
  return `curl -X POST https://api.kibamail.com/v1/emails/send \\
  -H "Authorization: Bearer ••••••••••••••••••••••••••••••••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "${from}",
    "to": "${email}",
    "subject": "my first email via kibamail api",
    "html": "<p>you sent your first email using kibamail. congratulations!</p>"
  }'`;
}

function getPhpSdkUsage(email: string, from: string) {
  return `<?php
require_once 'vendor/autoload.php';

use Kibamail\\Kibamail;

$kibamail = new Kibamail('••••••••••••••••••••••••••••••••••••');

$kibamail->emails->send([
    'from' => '${from}',
    'to' => '${email}',
    'subject' => 'my first email via kibamail api',
    'html' => '<p>you sent your first email using kibamail. congratulations!</p>',
]);`;
}

interface SdkConfig {
  name: string;
  lang: string;
  code: string;
}

export async function getHighlightedSdks(
  email: string
): Promise<HighlightedSdk[]> {
  const from = "hello@send.yourdomain.com";

  const sdks: SdkConfig[] = [
    {
      name: "Node.js",
      lang: "typescript",
      code: getNodejsSdkUsage(email, from),
    },
    { name: "Python", lang: "python", code: getPythonSdkUsage(email, from) },
    { name: "Ruby", lang: "ruby", code: getRubySdkUsage(email, from) },
    { name: "Go", lang: "go", code: getGoSdkUsage(email, from) },
    { name: "cURL", lang: "bash", code: getCurlSdkUsage(email, from) },
    { name: "PHP", lang: "php", code: getPhpSdkUsage(email, from) },
  ];

  const highlightedSdks = await Promise.all(
    sdks.map(async (sdk) => {
      const html = await codeToHtml(sdk.code, {
        lang: sdk.lang,
        theme: "material-theme-darker",
      });
      return { name: sdk.name, code: html };
    })
  );

  return highlightedSdks;
}
