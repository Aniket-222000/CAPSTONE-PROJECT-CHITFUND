export function buildEmailTemplate(title: string, message: string): string {
    return `
      <div style="font-family: sans-serif; line-height:1.5;">
        <h2>${title}</h2>
        <p>${message}</p>
        <hr/>
        <p>— Chit Fund Notification</p>
      </div>
    `;
  }