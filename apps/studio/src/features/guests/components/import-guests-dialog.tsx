'use client';

import type {
  ErrorCode,
  GuestColumnMapping,
  ImportGuestsResult,
  PreviewGuestsResponse,
} from '@playora/contracts';
import { applyApiError } from '@playora/ui/form';
import { Alert, App, Button, Flex, Form, Modal, Skeleton, Typography, theme, Upload } from 'antd';
import { Upload as UploadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useImportGuests, usePreviewGuests } from '../api';
import { ImportPreviewSection } from './import-preview-section';

const NO_TEAM = '__none__';

interface FormValues {
  mapping: GuestColumnMapping;
}

export interface ImportGuestsDialogProps {
  orgId: string;
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: (result: ImportGuestsResult) => void;
}

export function ImportGuestsDialog({
  orgId,
  eventId,
  open,
  onOpenChange,
  onImportSuccess,
}: ImportGuestsDialogProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const { token } = theme.useToken();

  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileEncoding, setFileEncoding] = useState<'text' | 'base64'>('text');
  const [preview, setPreview] = useState<PreviewGuestsResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportGuestsResult | null>(null);

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const previewMutation = usePreviewGuests({
    onSuccess: (res) => {
      setPreview(res);
      form.setFieldsValue({ mapping: res.suggestedMapping });
    },
    onError: (error) => {
      message.error(messageFor(error.code));
    },
  });

  const importMutation = useImportGuests({
    onSuccess: (res) => {
      setImportResult(res);
      const summaryText = t('guests.importSummary', {
        inserted: res.inserted,
        updated: res.updated,
        skipped: res.skipped,
      });
      message.success(summaryText);
      onImportSuccess?.(res);
      if (res.errors.length === 0) {
        handleClose();
      }
    },
    onError: (error) => {
      if (!applyApiError(form, error, messageFor)) {
        message.error(messageFor(error.code));
      }
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setFileName('');
    setFileContent('');
    setPreview(null);
    setImportResult(null);
    form.resetFields();
  };

  const handleFile = (file: File) => {
    setImportResult(null);
    const isXlsx = file.name.trim().toLowerCase().endsWith('.xlsx');
    const encoding: 'text' | 'base64' = isXlsx ? 'base64' : 'text';
    const reader = new FileReader();

    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      const content = isXlsx ? raw.replace(/^data:[^,]*;base64,/, '') : raw;
      setFileName(file.name);
      setFileContent(content);
      setFileEncoding(encoding);
      onOpenChange(true);
      previewMutation.mutate({
        params: { orgId, eventId },
        body: { fileName: file.name, content, encoding },
      });
    };

    if (isXlsx) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleSubmit = (values: FormValues) => {
    const rawMapping = values.mapping;
    const mapping = {
      externalCode: rawMapping.externalCode,
      displayName: rawMapping.displayName,
      team: rawMapping.team === NO_TEAM ? undefined : rawMapping.team,
    };

    importMutation.mutate({
      params: { orgId, eventId },
      body: {
        fileName,
        content: fileContent,
        encoding: fileEncoding,
        mapping,
      },
    });
  };

  const currentMapping = Form.useWatch('mapping', form);

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Flex align="center" gap={8}>
          <UploadIcon className="size-4" />
          <span>{t('guests.importTitle')}</span>
        </Flex>
      }
      width={720}
      footer={null}
      destroyOnHidden={false}
      forceRender
    >
      <Typography.Paragraph type="secondary">{t('guests.importDescription')}</Typography.Paragraph>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <div className="mb-4">
          <Upload.Dragger
            id="guest-file"
            accept=".csv,.xlsx"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              handleFile(file);
              return false;
            }}
          >
            <p className="ant-upload-drag-icon flex justify-center">
              <UploadIcon className="size-8" style={{ color: token.colorPrimary }} />
            </p>
            <p className="ant-upload-text">{fileName || t('guests.selectFile')}</p>
            <p className="ant-upload-hint">{t('guests.importDescription')}</p>
          </Upload.Dragger>
        </div>

        {previewMutation.isPending && <Skeleton active paragraph={{ rows: 3 }} className="my-6" />}

        {preview && (
          <ImportPreviewSection
            preview={preview}
            currentMapping={currentMapping}
            noTeamValue={NO_TEAM}
          />
        )}

        {importResult && importResult.errors.length > 0 && (
          <Alert
            className="mt-4"
            type="warning"
            showIcon
            title={t('guests.importSummary', {
              inserted: importResult.inserted,
              updated: importResult.updated,
              skipped: importResult.skipped,
            })}
            description={
              <ul className="list-disc pl-4">
                {importResult.errors.slice(0, 10).map((err) => (
                  <li key={err.row}>
                    {t('guests.rowErrorItem', { row: err.row, message: err.message })}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        <Flex justify="end" gap={8} className="mt-6">
          <Button onClick={handleClose}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<UploadIcon className="size-4" />}
            disabled={!fileContent || importMutation.isPending}
            loading={importMutation.isPending}
          >
            {t('guests.importSubmit')}
          </Button>
        </Flex>
      </Form>
    </Modal>
  );
}
