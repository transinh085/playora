import { Global, Module } from '@nestjs/common';
import { AntiFraudService } from './anti-fraud/anti-fraud.service';
import { CloudflareTurnstileVerifier, TURNSTILE_VERIFIER } from './anti-fraud/turnstile';
import { AuditService } from './audit/audit.service';
import { PiiService } from './pii/pii.service';

@Global()
@Module({
  providers: [
    AuditService,
    AntiFraudService,
    PiiService,
    { provide: TURNSTILE_VERIFIER, useClass: CloudflareTurnstileVerifier },
  ],
  exports: [AuditService, AntiFraudService, PiiService, TURNSTILE_VERIFIER],
})
export class CommonModule {}
