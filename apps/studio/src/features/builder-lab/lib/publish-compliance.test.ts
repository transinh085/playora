/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import {
  canPublishCampaign,
  isChecklistComplete,
  type PublishChecklistState,
} from './publish-compliance';

describe('publish compliance checklist', () => {
  test('returns false if promotionType is null, regardless of checklist state', () => {
    const state: PublishChecklistState = {
      promotionType: null,
      ackOrganizer: true,
      ackDepartment: true,
      ackTerms: true,
    };
    expect(isChecklistComplete(state)).toBe(false);
    expect(canPublishCampaign({ blocking: false, checklist: state })).toBe(false);
  });

  test('for purchase_linked: requires organizer, department notification, and terms', () => {
    const base: PublishChecklistState = {
      promotionType: 'purchase_linked',
      ackOrganizer: false,
      ackDepartment: false,
      ackTerms: false,
    };
    expect(isChecklistComplete(base)).toBe(false);

    expect(isChecklistComplete({ ...base, ackOrganizer: true, ackTerms: true })).toBe(false);
    expect(isChecklistComplete({ ...base, ackDepartment: true, ackTerms: true })).toBe(false);
    expect(isChecklistComplete({ ...base, ackOrganizer: true, ackDepartment: true })).toBe(false);

    const complete = { ...base, ackOrganizer: true, ackDepartment: true, ackTerms: true };
    expect(isChecklistComplete(complete)).toBe(true);
    expect(canPublishCampaign({ blocking: false, checklist: complete })).toBe(true);
  });

  test('for not_linked: requires organizer and terms, does not require department notification', () => {
    const base: PublishChecklistState = {
      promotionType: 'not_linked',
      ackOrganizer: false,
      ackDepartment: false,
      ackTerms: false,
    };
    expect(isChecklistComplete(base)).toBe(false);

    expect(isChecklistComplete({ ...base, ackOrganizer: true })).toBe(false);
    expect(isChecklistComplete({ ...base, ackTerms: true })).toBe(false);

    const completeWithoutDept = {
      ...base,
      ackOrganizer: true,
      ackTerms: true,
      ackDepartment: false,
    };
    expect(isChecklistComplete(completeWithoutDept)).toBe(true);
    expect(canPublishCampaign({ blocking: false, checklist: completeWithoutDept })).toBe(true);

    const completeWithDept = { ...base, ackOrganizer: true, ackTerms: true, ackDepartment: true };
    expect(isChecklistComplete(completeWithDept)).toBe(true);
    expect(canPublishCampaign({ blocking: false, checklist: completeWithDept })).toBe(true);
  });

  test('blocks publishing when preflight blocking issues exist even if checklist is complete', () => {
    const complete: PublishChecklistState = {
      promotionType: 'not_linked',
      ackOrganizer: true,
      ackDepartment: false,
      ackTerms: true,
    };
    expect(isChecklistComplete(complete)).toBe(true);
    expect(canPublishCampaign({ blocking: true, checklist: complete })).toBe(false);
    expect(canPublishCampaign({ blocking: false, checklist: complete })).toBe(true);
  });
});
