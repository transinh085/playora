import { Global, Module } from '@nestjs/common';
import { AntiFraudService } from './anti-fraud/anti-fraud.service';
import { CloudflareTurnstileVerifier, TURNSTILE_VERIFIER } from './anti-fraud/turnstile';
import { AuditService } from './audit/audit.service';

@Global()
@Module({
  providers: [
    AuditService,
    AntiFraudService,
    { provide: TURNSTILE_VERIFIER, useClass: CloudflareTurnstileVerifier },
  ],
  exports: [AuditService, AntiFraudService, TURNSTILE_VERIFIER],
})
export class CommonModule {}
