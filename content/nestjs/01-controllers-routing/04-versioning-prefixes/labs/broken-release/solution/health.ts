import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

/**
 * Cause n°2 : avec defaultVersion '1' et le préfixe 'api', la sonde était devenue /api/v1/health.
 * Le préfixe global ne l'exclut pas ici (app.ts est figé), alors on la sort au moins de la version :
 * l'orchestrateur est reconfiguré sur /api/health.
 */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  get() {
    return { status: 'ok' };
  }
}
