'use client';

import { useState } from 'react';
import { ActionForm, ConfirmSubmitButton, FormError, SubmitButton } from './ActionForm';
import { Field, FieldGrid, SelectInput, TextInput } from './fields';
import { EmptyState, Panel, PanelBody, PanelHeader, Table, TableWrap, TD, TH } from './ui';
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from '@/lib/estimating/constants';
import { fileSize, formatDateTime } from '@/lib/estimating/format';
import {
  createDocumentDownloadUrlAction,
  deleteDocumentAction,
  uploadDocumentAction,
} from '@/lib/estimating/actions/documents';
import type { ActionResult, ProjectDocument } from '@/lib/estimating/types';

/**
 * Documents are stored in a PRIVATE bucket. There is no permanent URL to link
 * to — each download mints a 5-minute signed URL on demand, so a link cannot
 * leak a commercial bid document.
 */
function DownloadButton({ documentId }: { documentId: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <ActionForm
        action={
          createDocumentDownloadUrlAction as (
            prev: ActionResult<{ url: string }> | null,
            formData: FormData,
          ) => Promise<ActionResult<{ url: string }>>
        }
        className="inline"
        onSuccess={(data) => {
          setError(null);
          window.open(data.url, '_blank', 'noopener,noreferrer');
        }}
      >
        <input type="hidden" name="document_id" value={documentId} />
        <SubmitButton variant="outline" size="sm" pendingLabel="Preparing…">
          Download
        </SubmitButton>
      </ActionForm>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </>
  );
}

export function DocumentsPanel({
  projectId,
  documents,
}: {
  projectId: string;
  documents: ProjectDocument[];
}) {
  return (
    <Panel>
      <PanelHeader
        title="Bid documents"
        description="Private storage. Downloads use short-lived signed links."
      />
      <PanelBody className="border-b border-white/10">
        <ActionForm action={uploadDocumentAction} className="space-y-3" resetOnSuccess>
          <input type="hidden" name="project_id" value={projectId} />
          <FormError />
          <FieldGrid columns={3}>
            <Field label="File" name="file" required>
              <input
                type="file"
                name="file"
                required
                className="w-full rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-steel-200 file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white"
              />
            </Field>
            <Field label="Category" name="category">
              <SelectInput name="category" defaultValue="plans">
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {DOCUMENT_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Notes" name="notes">
              <TextInput name="notes" placeholder="Optional" />
            </Field>
          </FieldGrid>
          <SubmitButton size="sm" pendingLabel="Uploading…">
            Upload
          </SubmitButton>
        </ActionForm>
      </PanelBody>

      {documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload plans, specifications, equipment schedules, addenda and vendor quotes here."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <TH>File</TH>
                <TH>Category</TH>
                <TH align="right">Size</TH>
                <TH>Uploaded</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <TD>
                    <div className="max-w-[280px] truncate font-medium text-steel-100">
                      {document.file_name}
                    </div>
                    {document.notes && (
                      <div className="text-[11px] text-steel-500">{document.notes}</div>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-steel-300">
                    {DOCUMENT_CATEGORY_LABELS[document.category]}
                  </TD>
                  <TD align="right" numeric className="whitespace-nowrap text-steel-400">
                    {fileSize(document.size_bytes)}
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-steel-400">
                    {formatDateTime(document.created_at)}
                  </TD>
                  <TD align="right">
                    <div className="flex justify-end gap-1.5">
                      <DownloadButton documentId={document.id} />
                      <ActionForm action={deleteDocumentAction} className="inline">
                        <input type="hidden" name="document_id" value={document.id} />
                        <ConfirmSubmitButton
                          confirm={`Delete "${document.file_name}"? This permanently removes the file from storage.`}
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </ActionForm>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Panel>
  );
}
