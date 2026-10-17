/** Canaux d'envoi (fournis). Un canal formate et « envoie » un message ; ici, il renvoie un reçu. */
export abstract class Channel {
  abstract readonly name: 'email' | 'sms';
  abstract deliver(to: string, text: string, sender: string): string;
}

export class EmailChannel extends Channel {
  readonly name = 'email';
  deliver(to: string, text: string, sender: string): string {
    return `email:${sender}->${to}:${text}`;
  }
}

export class SmsChannel extends Channel {
  readonly name = 'sms';
  deliver(to: string, text: string, sender: string): string {
    return `sms:${sender}->${to}:${text.slice(0, 20)}`;
  }
}

export type ChannelName = Channel['name'];
