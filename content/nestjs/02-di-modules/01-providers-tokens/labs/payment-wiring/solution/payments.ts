import { Inject, Injectable, Optional } from '@nestjs/common';

/** Configuration du paiement : une interface, donc invisible à l'exécution. */
export interface PaymentsConfig {
  mode: 'test' | 'live';
  currency: string;
}
export const PAYMENTS_CONFIG = Symbol('PAYMENTS_CONFIG');

/** Taux de change, chargés de façon asynchrone au démarrage. */
export type FxRates = Record<string, number>;
export const FX_RATES = Symbol('FX_RATES');

/** Journal d'audit facultatif : s'il n'est pas fourni, rien n'est journalisé. */
export interface AuditSink {
  record(event: string): void;
}
export const AUDIT_SINK = Symbol('AUDIT_SINK');

/** Contrat d'une passerelle de paiement : classe abstraite = contrat ET jeton. */
export abstract class PaymentGateway {
  static instances = 0;
  constructor() {
    PaymentGateway.instances++;
  }
  abstract readonly name: string;
  abstract charge(amountCents: number, currency: string): string;
}

export class FakeGateway extends PaymentGateway {
  readonly name = 'fake';
  charge(amountCents: number, currency: string): string {
    return `fake_${amountCents}_${currency}`;
  }
}

export class LiveGateway extends PaymentGateway {
  readonly name = 'live';
  charge(amountCents: number, currency: string): string {
    return `live_${amountCents}_${currency}`;
  }
}

/** Simule un appel réseau : à attendre avant d'accepter des paiements. */
export async function loadRates(): Promise<FxRates> {
  await new Promise((r) => setTimeout(r, 20));
  return { EUR: 1, USD: 1.1 };
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly gateway: PaymentGateway,
    @Inject(PAYMENTS_CONFIG) private readonly config: PaymentsConfig,
    @Inject(FX_RATES) private readonly rates: FxRates,
    @Optional() @Inject(AUDIT_SINK) private readonly audit?: AuditSink,
  ) {}

  /** Facture un montant exprimé en euros, converti dans la devise configurée. */
  pay(amountEurCents: number): { receipt: string; gateway: string } {
    const rate = this.rates[this.config.currency];
    if (rate === undefined) throw new Error(`devise inconnue : ${this.config.currency}`);
    const receipt = this.gateway.charge(Math.round(amountEurCents * rate), this.config.currency);
    this.audit?.record(receipt);
    return { receipt, gateway: this.gateway.name };
  }
}
