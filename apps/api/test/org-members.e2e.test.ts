import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { createTestMailer, setTestMailTransport } from '@playora/auth';
import { ErrorCode, eventsApi, meApi } from '@playora/contracts';
import {
  createOrg,
  createTestApp,
  signUp,
  TEST_ORIGIN,
  type TestApp,
  uniqueSlug,
} from './create-test-app';

const mailer = createTestMailer();
let t: TestApp;

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@test.playora.local`;

async function authFetch(
  baseUrl: string,
  path: string,
  init: { method?: string; body?: unknown; cookie?: string; headers?: Record<string, string> } = {},
) {
  return fetch(`${baseUrl}/auth${path}`, {
    method: init.method ?? 'POST',
    headers: {
      origin: TEST_ORIGIN,
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(init.cookie ? { cookie: init.cookie } : {}),
      ...init.headers,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

async function signUpWithEmail(baseUrl: string, email: string, name: string) {
  const res = await authFetch(baseUrl, '/sign-up/email', {
    body: { email, password: 'test-password-123', name },
  });
  expect(res.ok).toBe(true);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}

beforeAll(async () => {
  setTestMailTransport(mailer);
  t = await createTestApp();
});

beforeEach(() => {
  mailer.clear();
});

afterAll(async () => {
  setTestMailTransport(null);
  await t?.close();
});

describe('organization members & invitations (ORG-02)', () => {
  test('invite → accept → member role works and editor cannot invite', async () => {
    const ownerCookie = await signUp(t.baseUrl, 'Owner Alice');
    const orgId = await createOrg(t.baseUrl, ownerCookie);

    const editorEmail = uniqueEmail('editor');
    const inviteRes = await authFetch(t.baseUrl, '/organization/invite-member', {
      cookie: ownerCookie,
      body: { organizationId: orgId, email: editorEmail, role: 'editor' },
    });
    expect(inviteRes.status).toBe(200);
    const invitation = (await inviteRes.json()) as { id: string; email: string; role: string };
    expect(invitation).toMatchObject({ email: editorEmail, role: 'editor' });

    // Invitation email was sent and contains the Studio /invite/[id] link.
    expect(mailer.outbox).toHaveLength(1);
    expect(mailer.outbox[0]?.to).toBe(editorEmail);
    expect(mailer.outbox[0]?.text).toContain(`/invite/${invitation.id}`);
    expect(mailer.outbox[0]?.html).toContain(`/invite/${invitation.id}`);

    // The invited user signs up and inspects + accepts the invitation.
    const editorCookie = await signUpWithEmail(t.baseUrl, editorEmail, 'Editor Bob');

    const getInvRes = await authFetch(
      t.baseUrl,
      `/organization/get-invitation?id=${encodeURIComponent(invitation.id)}`,
      { method: 'GET', cookie: editorCookie },
    );
    expect(getInvRes.status).toBe(200);
    expect(await getInvRes.json()).toMatchObject({
      id: invitation.id,
      organizationId: orgId,
      role: 'editor',
    });

    const acceptRes = await authFetch(t.baseUrl, '/organization/accept-invitation', {
      cookie: editorCookie,
      body: { invitationId: invitation.id },
    });
    expect(acceptRes.status).toBe(200);

    // Bob now appears in /v1/me/orgs with the `editor` role.
    const editorApi = t.client(editorCookie);
    const { items } = await editorApi.call(meApi.orgs);
    expect(items).toContainEqual(expect.objectContaining({ id: orgId, role: 'editor' }));

    // As editor, Bob can create an event in the org, but cannot delete it.
    const createdEvent = await editorApi.call(eventsApi.create, {
      params: { orgId },
      body: { name: 'Editor Event', slug: uniqueSlug('ed') },
    });
    const deleteErr = await editorApi
      .call(eventsApi.remove, { params: { orgId, eventId: createdEvent.id } })
      .then(
        () => undefined,
        (e: unknown) => e,
      );
    expect(deleteErr).toBeInstanceOf(ApiError);
    expect(deleteErr).toMatchObject({ status: 403, code: ErrorCode.FORBIDDEN });

    // Editor cannot invite new members to the organization.
    const forbiddenInvite = await authFetch(t.baseUrl, '/organization/invite-member', {
      cookie: editorCookie,
      body: { organizationId: orgId, email: uniqueEmail('other'), role: 'viewer' },
    });
    expect(forbiddenInvite.status).toBe(403);
  });

  test('owner can resend & cancel invitations, change roles, remove members, and members can leave', async () => {
    const ownerCookie = await signUp(t.baseUrl, 'Owner');
    const orgId = await createOrg(t.baseUrl, ownerCookie);

    const pendingEmail = uniqueEmail('pending');
    const firstInvite = await authFetch(t.baseUrl, '/organization/invite-member', {
      cookie: ownerCookie,
      body: { organizationId: orgId, email: pendingEmail, role: 'operator' },
    });
    expect(firstInvite.status).toBe(200);
    const inv = (await firstInvite.json()) as { id: string };
    expect(mailer.outbox).toHaveLength(1);

    // Resend invitation sends another email.
    const resendRes = await authFetch(t.baseUrl, '/organization/invite-member', {
      cookie: ownerCookie,
      body: { organizationId: orgId, email: pendingEmail, role: 'operator', resend: true },
    });
    expect(resendRes.status).toBe(200);
    expect(mailer.outbox).toHaveLength(2);

    // Cancel invitation marks it canceled.
    const cancelRes = await authFetch(t.baseUrl, '/organization/cancel-invitation', {
      cookie: ownerCookie,
      body: { invitationId: inv.id },
    });
    expect(cancelRes.status).toBe(200);

    // Invite two members: one to change role & leave, one to remove.
    const member1Email = uniqueEmail('m1');
    const member2Email = uniqueEmail('m2');
    const inv1 = (await (
      await authFetch(t.baseUrl, '/organization/invite-member', {
        cookie: ownerCookie,
        body: { organizationId: orgId, email: member1Email, role: 'editor' },
      })
    ).json()) as { id: string };
    const inv2 = (await (
      await authFetch(t.baseUrl, '/organization/invite-member', {
        cookie: ownerCookie,
        body: { organizationId: orgId, email: member2Email, role: 'viewer' },
      })
    ).json()) as { id: string };

    const m1Cookie = await signUpWithEmail(t.baseUrl, member1Email, 'Member One');
    const m2Cookie = await signUpWithEmail(t.baseUrl, member2Email, 'Member Two');

    const accept1 = (await (
      await authFetch(t.baseUrl, '/organization/accept-invitation', {
        cookie: m1Cookie,
        body: { invitationId: inv1.id },
      })
    ).json()) as { member: { id: string } };
    const accept2 = (await (
      await authFetch(t.baseUrl, '/organization/accept-invitation', {
        cookie: m2Cookie,
        body: { invitationId: inv2.id },
      })
    ).json()) as { member: { id: string } };

    // Change Member One's role from editor to operator.
    const roleRes = await authFetch(t.baseUrl, '/organization/update-member-role', {
      cookie: ownerCookie,
      body: { organizationId: orgId, memberId: accept1.member.id, role: 'operator' },
    });
    expect(roleRes.status).toBe(200);
    const m1Orgs = await t.client(m1Cookie).call(meApi.orgs);
    expect(m1Orgs.items).toContainEqual(expect.objectContaining({ id: orgId, role: 'operator' }));

    // Member One leaves the organization.
    const leaveRes = await authFetch(t.baseUrl, '/organization/leave', {
      cookie: m1Cookie,
      body: { organizationId: orgId },
    });
    expect(leaveRes.status).toBe(200);
    const m1OrgsAfter = await t.client(m1Cookie).call(meApi.orgs);
    expect(m1OrgsAfter.items.map((o) => o.id)).not.toContain(orgId);

    // Owner removes Member Two.
    const removeRes = await authFetch(t.baseUrl, '/organization/remove-member', {
      cookie: ownerCookie,
      body: { organizationId: orgId, memberIdOrEmail: accept2.member.id },
    });
    expect(removeRes.status).toBe(200);
    const m2OrgsAfter = await t.client(m2Cookie).call(meApi.orgs);
    expect(m2OrgsAfter.items.map((o) => o.id)).not.toContain(orgId);
  });
});

describe('magic link sign-in (ORG-01)', () => {
  test('sends magic link email via mailer transport and verifies token into a session', async () => {
    const email = uniqueEmail('magic');
    const callbackURL = `${TEST_ORIGIN}/onboarding`;

    const res = await authFetch(t.baseUrl, '/sign-in/magic-link', {
      headers: { cookie: 'playora_locale=en' },
      body: { email, name: 'Magic Tester', callbackURL },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: true });

    expect(mailer.outbox).toHaveLength(1);
    const sent = mailer.outbox[0];
    expect(sent?.to).toBe(email);
    expect(sent?.subject).toBe('Sign in to Playora');

    const urlMatch = /(https?:\/\/[^\s"]+\/auth\/magic-link\/verify\?[^\s"]+)/.exec(
      sent?.text ?? '',
    );
    expect(urlMatch?.[1]).toBeDefined();
    const parsedUrl = new URL(urlMatch?.[1] ?? '');

    const verifyRes = await fetch(`${t.baseUrl}${parsedUrl.pathname}${parsedUrl.search}`, {
      method: 'GET',
      redirect: 'manual',
    });
    expect(verifyRes.status).toBe(302);
    expect(verifyRes.headers.get('location')).toBe(callbackURL);

    const sessionCookie = verifyRes.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
    expect(sessionCookie).toContain('better-auth.session_token=');

    // Authenticated session works against API routes.
    const orgs = await t.client(sessionCookie).call(meApi.orgs);
    expect(orgs.items).toEqual([]);
  });
});
