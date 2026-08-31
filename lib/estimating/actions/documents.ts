'use server';

import { revalidatePath } from 'next/cache';
import { estimatingDb } from '../db';
import { MAX_DOCUMENT_BYTES } from '../constants';

/**
 * Private Storage bucket holding bid documents. Read here rather than in
 * lib/estimating/constants.ts, which is imported by client components and must
 * not touch server-only environment variables.
 */
const DOCUMENTS_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || 'project-documents';
import { getDocument, getProject } from '../queries';
import { documentIdSchema, documentUploadSchema, parseForm } from '../validation';
import { actionError, actionOk, type ActionResult } from '../types';
import { throwIf, withAdmin } from './shared';

/**
 * Make a storage key that cannot escape its project folder or collide.
 * The original filename is preserved in the `file_name` column; only a
 * sanitized version reaches the storage path.
 */
function storageKey(projectId: string, fileName: string): string {
  const safeName =
    fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(-120) || 'document';
  return `${projectId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
}

/**
 * Upload a bid document into the PRIVATE storage bucket.
 *
 * The bucket is created with public = false by migration 005, so objects are
 * only reachable through short-lived signed URLs minted server-side by
 * `createDocumentDownloadUrlAction`. Commercial project documents are never
 * publicly addressable.
 */
export async function uploadDocumentAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Uploading the document', async (session) => {
    const parsed = parseForm(documentUploadSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return actionError('Choose a file to upload.', { file: 'No file was selected.' });
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return actionError(
        `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB.`,
        { file: 'The file is too large.' },
      );
    }

    const project = await getProject(parsed.data.project_id);
    if (!project) return actionError('That project no longer exists.');

    const db = estimatingDb();
    const path = storageKey(project.id, file.name);

    const { error: uploadError } = await db.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });

    if (uploadError) {
      const message = uploadError.message ?? '';
      if (/not found|bucket/i.test(message)) {
        return actionError(
          `The private storage bucket "${DOCUMENTS_BUCKET}" does not exist yet. Create it in Supabase Storage (public access off), or apply migration 005.`,
        );
      }
      return actionError(`The file could not be uploaded: ${message}`);
    }

    const { data, error } = await db
      .from('project_documents')
      .insert({
        project_id: project.id,
        estimate_id: parsed.data.estimate_id,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        category: parsed.data.category,
        notes: parsed.data.notes,
        uploaded_by: session.sub,
      })
      .select('id')
      .single();

    if (error) {
      // Do not leave an orphaned object behind if the metadata insert failed.
      await db.storage.from(DOCUMENTS_BUCKET).remove([path]);
      throwIf(error);
    }
    if (!data) return actionError('The document record could not be saved.');

    revalidatePath(`/admin/projects/${project.id}`);
    return actionOk({ id: data.id as string });
  });
}

/** Mint a short-lived signed URL. Never returns a permanent public link. */
export async function createDocumentDownloadUrlAction(
  _prev: ActionResult<{ url: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  return withAdmin('Preparing the download', async () => {
    const parsed = parseForm(documentIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const document = await getDocument(parsed.data.document_id);
    if (!document) return actionError('That document no longer exists.');

    const { data, error } = await estimatingDb()
      .storage.from(DOCUMENTS_BUCKET)
      .createSignedUrl(document.storage_path, 300); // 5 minutes

    if (error || !data?.signedUrl) {
      return actionError(
        `A download link could not be created: ${error?.message ?? 'the file is missing from storage'}.`,
      );
    }
    return actionOk({ url: data.signedUrl });
  });
}

export async function deleteDocumentAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the document', async () => {
    const parsed = parseForm(documentIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const document = await getDocument(parsed.data.document_id);
    if (!document) return actionError('That document no longer exists.');

    const db = estimatingDb();
    // Remove the object first; if that fails the row stays so the file is not
    // silently orphaned in the bucket.
    const { error: storageError } = await db.storage
      .from(DOCUMENTS_BUCKET)
      .remove([document.storage_path]);
    if (storageError && !/not found/i.test(storageError.message ?? '')) {
      return actionError(`The file could not be removed from storage: ${storageError.message}`);
    }

    const { error } = await db.from('project_documents').delete().eq('id', parsed.data.document_id);
    throwIf(error);

    revalidatePath(`/admin/projects/${document.project_id}`);
    return actionOk();
  });
}
