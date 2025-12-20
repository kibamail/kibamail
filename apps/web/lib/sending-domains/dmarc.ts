export const DMARC_CONFIG = {
  reportingDomain: "dmarc.kbmta.net",
};

export function generateDmarcReportingCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function buildDmarcPolicy(reportingCode: string): string {
  return `v=DMARC1; p=none; pct=100; rua=mailto:re+${reportingCode}@${DMARC_CONFIG.reportingDomain}; sp=none; aspf=r;`;
}
