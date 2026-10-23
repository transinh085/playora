import { Controller, Inject } from '@nestjs/common';
import { meApi } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { asc, eq } from 'drizzle-orm';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Route } from '../../common/contract/route.decorator';
import { DB } from '../../infra/tokens';

@Controller()
export class MeController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Route(meApi.orgs)
  async orgs(@CurrentSession() session: AuthSession) {
    const { member, organization } = schema;
    const items = await this.db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, session.user.id))
      .orderBy(asc(organization.name));
    return { items };
  }
}
