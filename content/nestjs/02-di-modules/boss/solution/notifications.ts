import {
  BadRequestException, Body, ConfigurableModuleBuilder, Controller, Get, Headers, Inject, Injectable, Module, Post,
} from '@nestjs/common';
import { Channel, type ChannelName, EmailChannel, SmsChannel } from './channels.js';

export interface NotificationsOptions {
  defaultChannel: ChannelName;
  senders: Record<ChannelName, string>;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN: NOTIFICATIONS_OPTIONS } =
  new ConfigurableModuleBuilder<NotificationsOptions>()
    .setClassMethodName('forRoot')
    .setExtras({ isGlobal: false }, (definition, extras) => ({ ...definition, global: extras.isGlobal }))
    .build();

export interface Sent { tenant: string; receipt: string }

/** Les messages envoyés : un état durable, donc un singleton qui ne dépend d'aucune requête. */
@Injectable()
export class Outbox {
  private readonly sent: Sent[] = [];
  push(entry: Sent): void {
    this.sent.push(entry);
  }
  forTenant(tenant: string): string[] {
    return this.sent.filter((s) => s.tenant === tenant).map((s) => s.receipt);
  }
}

/** Le registre des canaux : chaque canal est un provider, le registre les indexe par nom. */
@Injectable()
export class ChannelRegistry {
  private readonly byName: Map<ChannelName, Channel>;
  constructor(email: EmailChannel, sms: SmsChannel) {
    this.byName = new Map<ChannelName, Channel>([[email.name, email], [sms.name, sms]]);
  }
  get(name: string): Channel {
    const channel = this.byName.get(name as ChannelName);
    if (!channel) throw new BadRequestException(`canal inconnu : ${name}`);
    return channel;
  }
}

/** Singleton : le locataire lui est passé en argument, il ne lit jamais la requête. */
@Injectable()
export class NotificationsService {
  static instances = 0;
  constructor(
    @Inject(NOTIFICATIONS_OPTIONS) private readonly options: NotificationsOptions,
    private readonly channels: ChannelRegistry,
    private readonly outbox: Outbox,
  ) {
    NotificationsService.instances++;
    if (!['email', 'sms'].includes(options.defaultChannel)) {
      throw new Error(`defaultChannel invalide : ${String(options.defaultChannel)}`);
    }
  }

  send(tenant: string, to: string, text: string, channelName?: string): string {
    const channel = this.channels.get(channelName ?? this.options.defaultChannel);
    const receipt = channel.deliver(to, text, this.options.senders[channel.name]);
    this.outbox.push({ tenant, receipt });
    return receipt;
  }

  history(tenant: string): string[] {
    return this.outbox.forTenant(tenant);
  }
}

/** La lecture de la requête reste à la frontière : seul le contrôleur connaît l'en-tête. */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  send(@Headers('x-tenant-id') tenant: string | undefined, @Body() body: { to: string; text: string; channel?: string }) {
    return { receipt: this.notifications.send(requireTenant(tenant), body.to, body.text, body.channel) };
  }

  @Get()
  history(@Headers('x-tenant-id') tenant: string | undefined) {
    return this.notifications.history(requireTenant(tenant));
  }
}

function requireTenant(tenant: string | undefined): string {
  if (!tenant) throw new BadRequestException('en-tête x-tenant-id manquant');
  return tenant;
}

@Module({
  controllers: [NotificationsController],
  providers: [EmailChannel, SmsChannel, ChannelRegistry, Outbox, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule extends ConfigurableModuleClass {}
