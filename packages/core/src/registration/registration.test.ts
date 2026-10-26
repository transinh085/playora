import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ErrorCode } from '@playora/contracts';
import {
  buildNewConsentRecords,
  DEFAULT_PLAYER_DISPLAY_NAME,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_FORM_FIELD_VALUE_LENGTH,
  mergeRegistrationFormData,
  normalizeConsentsInput,
  normalizeRegistrationForm,
  parseRegistrationForm,
  type RegistrationFieldLike,
  reconcileExistingPlayer,
  resolveDisplayName,
  resolveDisplayNameFromFields,
  validateFormAndConsents,
  validateRegistration,
  versionConsentItem,
} from './index';

const SAMPLE_FIELDS: RegistrationFieldLike[] = [
  {
    key: 'full_name',
    type: 'text',
    label: { vi: 'Họ và tên', en: 'Full name' },
    required: true,
  },
  {
    key: 'phone',
    type: 'phone',
    label: { vi: 'Số điện thoại' },
    required: true,
  },
  {
    key: 'email',
    type: 'email',
    label: { vi: 'Email' },
    required: false,
  },
  {
    key: 'dept',
    type: 'select',
    label: { vi: 'Phòng ban' },
    required: true,
    options: ['Kỹ thuật', 'Sản phẩm'],
  },
  {
    key: 'vip',
    type: 'checkbox',
    label: { vi: 'Khách VIP' },
    required: false,
  },
  {
    key: 'terms_ack',
    type: 'checkbox',
    label: { vi: 'Cam kết nội quy' },
    required: true,
  },
  {
    key: 'note',
    type: 'text',
    label: { vi: 'Ghi chú' },
    required: false,
  },
];

describe('core/registration', () => {
  test('validate.ts is browser-safe and does not import node:crypto', () => {
    const source = readFileSync(new URL('./validate.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('node:crypto');
    expect(validateFormAndConsents).toBe(validateRegistration);
  });

  describe('versionConsentItem & normalizeRegistrationForm', () => {
    test('versions consent item with sha256 hash of vi or vi+en text', () => {
      const viOnly = versionConsentItem({
        purpose: 'participation',
        text: { vi: 'Đồng ý tham gia' },
        required: true,
      });
      const expectedViHash = createHash('sha256').update('Đồng ý tham gia').digest('hex');
      expect(viOnly).toEqual({
        purpose: 'participation',
        text: { vi: 'Đồng ý tham gia', en: undefined },
        required: true,
        textHash: expectedViHash,
        textVersion: `sha256:${expectedViHash.slice(0, 12)}`,
      });

      const bilingual = versionConsentItem({
        purpose: 'marketing',
        text: { vi: 'Nhận thông tin', en: 'Receive updates' },
        required: false,
      });
      const expectedBiHash = createHash('sha256')
        .update('Nhận thông tin\nReceive updates')
        .digest('hex');
      expect(bilingual.textHash).toBe(expectedBiHash);
      expect(bilingual.textVersion).toBe(`sha256:${expectedBiHash.slice(0, 12)}`);
      expect(bilingual.textHash).not.toBe(viOnly.textHash);
    });

    test('normalizeRegistrationForm and parseRegistrationForm handle valid and invalid inputs', () => {
      expect(parseRegistrationForm(null)).toEqual({ fields: [], consents: [] });
      expect(parseRegistrationForm({ fields: 'invalid' })).toEqual({ fields: [], consents: [] });

      const normalized = normalizeRegistrationForm({
        fields: SAMPLE_FIELDS.slice(0, 1),
        consents: [
          {
            purpose: 'participation',
            text: { vi: 'Đồng ý điều khoản' },
            required: true,
          },
        ],
      });
      expect(normalized.fields).toHaveLength(1);
      expect(normalized.consents).toHaveLength(1);
      expect(normalized.consents[0]?.textVersion).toMatch(/^sha256:[0-9a-f]{12}$/);
    });
  });

  describe('normalizeConsentsInput', () => {
    test('normalizes record, array, and empty inputs into a Map', () => {
      expect(normalizeConsentsInput(undefined).size).toBe(0);
      expect(normalizeConsentsInput(null).size).toBe(0);

      const fromRecord = normalizeConsentsInput({ participation: true, marketing: false });
      expect(fromRecord.get('participation')).toBe(true);
      expect(fromRecord.get('marketing')).toBe(false);

      const fromArray = normalizeConsentsInput([
        { purpose: 'participation', granted: true },
        { purpose: 'marketing', granted: false },
      ]);
      expect(fromArray.get('participation')).toBe(true);
      expect(fromArray.get('marketing')).toBe(false);
    });
  });

  describe('validateRegistration', () => {
    const form = {
      fields: SAMPLE_FIELDS,
      consents: [
        {
          purpose: 'participation',
          text: { vi: 'Đồng ý tham gia' },
          required: true,
        },
        {
          purpose: 'marketing',
          text: { vi: 'Đồng ý nhận tin' },
          required: false,
        },
      ],
    };

    const validFields = {
      full_name: '  Nguyễn Văn A  ',
      phone: '  +84 (90) 123-4567  ',
      email: '  a.nguyen@example.com  ',
      dept: 'Kỹ thuật',
      vip: true,
      terms_ack: true,
      note: 'Ghi chú ngắn',
    };

    test('rejects missing or ungranted required consent', () => {
      const res = validateRegistration(form, {
        fields: validFields,
        consents: { participation: false, marketing: true },
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toEqual({
          field: 'consents.participation',
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Vui lòng đồng ý với điều khoản bắt buộc',
        });
        expect(res.field).toBe('consents.participation');
        expect(res.code).toBe(ErrorCode.VALIDATION_FAILED);
      }
    });

    test('rejects missing or whitespace-only required text field', () => {
      const res = validateRegistration(form, {
        fields: { ...validFields, full_name: '   ' },
        consents: { participation: true },
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toEqual({
          field: 'fields.full_name',
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Trường "Họ và tên" là bắt buộc',
        });
      }
    });

    test('validates email format when provided and allows empty optional email', () => {
      const badEmail = validateRegistration(form, {
        fields: { ...validFields, email: 'not-an-email' },
        consents: { participation: true },
      });
      expect(badEmail.ok).toBe(false);
      if (!badEmail.ok) {
        expect(badEmail.error).toEqual({
          field: 'fields.email',
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Email không hợp lệ',
        });
      }

      const emptyEmail = validateRegistration(form, {
        fields: { ...validFields, email: '   ' },
        consents: { participation: true },
      });
      expect(emptyEmail.ok).toBe(true);
      if (emptyEmail.ok) {
        expect(emptyEmail.formData.email).toBeUndefined();
      }
    });

    test('validates phone format (length and allowed characters)', () => {
      for (const invalidPhone of ['12345', '090123abc', '1'.repeat(21), '((--))--']) {
        const res = validateRegistration(form, {
          fields: { ...validFields, phone: invalidPhone },
          consents: { participation: true },
        });
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.error).toEqual({
            field: 'fields.phone',
            code: ErrorCode.VALIDATION_FAILED,
            message: 'Số điện thoại không hợp lệ',
          });
        }
      }
    });

    test('validates select field against configured options', () => {
      const badSelect = validateRegistration(form, {
        fields: { ...validFields, dept: 'Tài chính' },
        consents: { participation: true },
      });
      expect(badSelect.ok).toBe(false);
      if (!badSelect.ok) {
        expect(badSelect.error).toEqual({
          field: 'fields.dept',
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Lựa chọn không hợp lệ',
        });
      }
    });

    test('validates required and optional checkbox fields', () => {
      const uncheckedRequired = validateRegistration(form, {
        fields: { ...validFields, terms_ack: false },
        consents: { participation: true },
      });
      expect(uncheckedRequired.ok).toBe(false);
      if (!uncheckedRequired.ok) {
        expect(uncheckedRequired.error).toEqual({
          field: 'fields.terms_ack',
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Trường "Cam kết nội quy" là bắt buộc',
        });
      }

      const uncheckedOptional = validateRegistration(form, {
        fields: { ...validFields, vip: false },
        consents: { participation: true },
      });
      expect(uncheckedOptional.ok).toBe(true);
      if (uncheckedOptional.ok) {
        expect(uncheckedOptional.formData.vip).toBe(false);
      }
    });

    test('trims strings, truncates to 500 characters, and drops unknown keys', () => {
      const overlongNote = `  ${'X'.repeat(650)}  `;
      const res = validateRegistration(form, {
        fields: {
          ...validFields,
          note: overlongNote,
          injected_field: 'should_not_persist',
        },
        consents: [{ purpose: 'participation', granted: true }],
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.formData).toEqual({
          full_name: 'Nguyễn Văn A',
          email: 'a.nguyen@example.com',
          dept: 'Kỹ thuật',
          vip: true,
          terms_ack: true,
          note: 'X'.repeat(MAX_FORM_FIELD_VALUE_LENGTH),
        });
        expect(res.formData.injected_field).toBeUndefined();
        // The phone never lands in formData; it is returned separately for encryption.
        expect(res.formData.phone).toBeUndefined();
        expect(res.phone).toBe('+84 (90) 123-4567');
        expect(res.consentsMap.get('participation')).toBe(true);
      }
    });
  });

  describe('resolveDisplayName & resolveDisplayNameFromFields', () => {
    const fieldsConfig: RegistrationFieldLike[] = [
      { key: 'company', type: 'text', label: { vi: 'Công ty' }, required: false },
      { key: 'ho_ten', type: 'text', label: { vi: 'Họ tên' }, required: true },
      { key: 'phone', type: 'phone', label: { vi: 'SĐT' }, required: true },
    ];

    test('prefers explicit displayName over form fields', () => {
      expect(
        resolveDisplayName('  Minh Anh  ', { company: 'Playora', ho_ten: 'Trần B' }, fieldsConfig),
      ).toBe('Minh Anh');
    });

    test('prefers known name field keys (ho_ten, full_name, etc.) over earlier text fields', () => {
      expect(
        resolveDisplayName(undefined, { company: 'Playora', ho_ten: '  Trần B  ' }, fieldsConfig),
      ).toBe('Trần B');
    });

    test('falls back to first non-empty text field when no known name key is present, capped at 120 chars', () => {
      const longText = 'N'.repeat(160);
      const nonNameFields: RegistrationFieldLike[] = [
        { key: 'phone', type: 'phone', label: { vi: 'SĐT' }, required: true },
        { key: 'nickname_custom', type: 'text', label: { vi: 'Biệt danh' }, required: false },
      ];
      const fromFields = resolveDisplayNameFromFields(
        { phone: '0901234567', nickname_custom: longText },
        nonNameFields,
      );
      expect(fromFields).toBe('N'.repeat(MAX_DISPLAY_NAME_LENGTH));
    });

    test('falls back to custom fallback or DEFAULT_PLAYER_DISPLAY_NAME when all sources are empty', () => {
      expect(resolveDisplayName('   ', { company: '   ' }, fieldsConfig)).toBe(
        DEFAULT_PLAYER_DISPLAY_NAME,
      );
      expect(resolveDisplayName(undefined, undefined, fieldsConfig, 'Khách cũ')).toBe('Khách cũ');
    });
  });

  describe('mergeRegistrationFormData, reconcileExistingPlayer & buildNewConsentRecords', () => {
    test('merges form data and detects changes', () => {
      const unchanged = mergeRegistrationFormData({ a: '1', b: true }, { a: '1' });
      expect(unchanged).toEqual({ formData: { a: '1', b: true }, changed: false });

      const changed = mergeRegistrationFormData({ a: '1' }, { a: '2', c: false });
      expect(changed).toEqual({ formData: { a: '2', c: false }, changed: true });
    });

    test('reconcileExistingPlayer returns null when up-to-date and patch when changed', () => {
      const checkedInAt = new Date('2026-10-24T10:00:00Z');
      const now = new Date('2026-10-24T11:00:00Z');
      const baseExisting = {
        displayName: 'Trần B',
        team: 'A',
        checkedInAt,
        deviceId: 'dev-1',
        formData: { full_name: 'Trần B' },
      };

      expect(
        reconcileExistingPlayer({
          existing: baseExisting,
          isGuestList: false,
          defaultDisplayName: 'Người chơi',
          guestTeam: null,
          deviceId: 'dev-1',
          formData: { full_name: 'Trần B' },
          formFields: SAMPLE_FIELDS,
          now,
        }),
      ).toBeNull();

      const patch = reconcileExistingPlayer({
        existing: { ...baseExisting, checkedInAt: null },
        isGuestList: false,
        defaultDisplayName: 'Người chơi',
        guestTeam: null,
        deviceId: 'dev-2',
        formData: { full_name: 'Trần C' },
        formFields: SAMPLE_FIELDS,
        now,
      });
      expect(patch).toEqual({
        displayName: 'Trần C',
        team: 'A',
        checkedInAt: now,
        deviceId: 'dev-2',
        formData: { full_name: 'Trần C' },
      });
    });

    test('buildNewConsentRecords filters out already-granted purposes', () => {
      const partConsent = versionConsentItem({
        purpose: 'participation',
        text: { vi: 'Đồng ý 1' },
        required: true,
      });
      const mktConsent = versionConsentItem({
        purpose: 'marketing',
        text: { vi: 'Đồng ý 2' },
        required: false,
      });
      const records = buildNewConsentRecords(
        [partConsent, mktConsent],
        new Map([
          ['participation', true],
          ['marketing', false],
        ]),
        new Set(['participation']),
        { playerId: 'p-1', ip: '127.0.0.1', userAgent: 'TestAgent' },
      );
      expect(records).toEqual([
        {
          playerId: 'p-1',
          purpose: 'marketing',
          granted: false,
          textVersion: mktConsent.textVersion,
          textHash: mktConsent.textHash,
          ip: '127.0.0.1',
          userAgent: 'TestAgent',
        },
      ]);
    });
  });
});
