import Mailgun, { Interfaces } from 'mailgun.js';
import FormData from 'form-data';
import { providersList } from './providerDetector';


class MailgunWrapper {
  mailgun: Interfaces.IMailgunClient | null;
  constructor() {
    this.mailgun = null;
    if (providersList.mailgun.isAvailable) {
      this.initialize();
    }else{
      console.log('Mailgun not available. Missing API key');
    }
  }
  // MAILGUN_BASE_URL picks the region: https://api.mailgun.net (US) or
  // https://api.eu.mailgun.net (EU). Sending to the wrong region 401s.
  private async initialize(){
    const mailgunClass = new Mailgun(FormData);
    this.mailgun = mailgunClass.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY || '',
      url: process.env.MAILGUN_BASE_URL || 'https://api.eu.mailgun.net'
    });
  }
  public getMailgun(){
    return this.mailgun;
  }
  /** Verified sending domain, or the sandbox one while the real domain is pending. */
  public getDomain(){
    return process.env.MAILGUN_DOMAIN || process.env.MAILGUN_SANDBOX_DOMAIN || '';
  }
  public getDefaultValues(){
    const domain = this.getDomain();
    return {
      from: `Momentreel <postmaster@${domain}>`,
      subject: "Hello",
      to: [] as string[],
      text: "This is me testing emails!"
      // html: "<h1>Testing some Mailgun awesomness!</h1>"
    }
  }
  /**
   * Sends one message. Throws when Mailgun is not configured so callers can
   * decide whether that is fatal — never silently drops the mail.
   */
  public async send(message: {
    to: string[];
    subject: string;
    text: string;
    from?: string;
    html?: string;
    'h:Reply-To'?: string;
  }){
    const domain = this.getDomain();
    if (!this.mailgun) {
      throw new Error('Mailgun is not configured (missing MAILGUN_API_KEY)');
    }
    if (!domain) {
      throw new Error('Mailgun is not configured (missing MAILGUN_DOMAIN)');
    }
    return this.mailgun.messages.create(domain, {
      ...this.getDefaultValues(),
      ...message,
    });
  }
}

// making only one instace of MailgunWrapper for the whole project
const globalForMailgun = globalThis as unknown as { mailgun: MailgunWrapper }
 
export const mailgunClientGlobal = globalForMailgun.mailgun || new MailgunWrapper()

if (process.env.NODE_ENV !== "production") globalForMailgun.mailgun = mailgunClientGlobal


// how to use in your pages/api routes:
// import { mailgunClientGlobal } from '@/infra/mailgun';
// const mg = await mailgunClientGlobal
// await mg.mailgun?.messages.create(
//   'mail.mydomain.com',
//   {...mg.getDefaultValues(), 
//     from: 'Excited User <mailgun@mail.mydomain.com>',
//     to: ['contact@mydomain.com'] }
// );