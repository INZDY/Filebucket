import {
  ArchiveRestore,
  FileQuestion,
  FileText,
  Folder,
  ImagePlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientForm } from "@/components/client-form";
import { ConfirmForm } from "@/components/confirm-form";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { restoreFolderAction, deleteFolderAction } from "@/app/folders/actions";
import { compareAlphanumeric } from "@/lib/sorting";
import { restoreNoteAction, deleteNoteAction } from "@/app/notes/actions";
import { restoreMediaAssetAction, deleteMediaAssetAction } from "@/app/media/actions";
import { getMediaAssetUrl } from "@/lib/utils";

type FolderEntry = {
  id: string;
  name: string;
  parentId: string | null;
  parent?: {
    deletedAt?: Date | string | null;
  } | null;
};

type NoteEntry = {
  id: string;
  title: string;
  body: string;
  folder?: {
    id: string;
    name: string;
    deletedAt?: Date | string | null;
  } | null;
};

type MediaEntry = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  r2Key: string;
  folder?: {
    id: string;
    name: string;
    deletedAt?: Date | string | null;
  } | null;
};

interface TrashWorkspaceProps {
  selectedDeletedNote: NoteEntry | null;
  selectedDeletedMedia: MediaEntry | null;
  selectedDeletedFolder: FolderEntry | null;
  deletedFolderContents: [
    { id: string; name: string; deletedAt: Date | string | null }[],
    { id: string; title: string; deletedAt: Date | string | null }[],
    { id: string; filename: string; contentType: string; deletedAt: Date | string | null }[]
  ] | null;
  textPreviewContent: string;
  resolveDisplayMarkdown: (body: string) => string;
}

function getMediaPreviewKind(contentType: string) {
  if (contentType.startsWith("image/")) {
    return "image";
  }

  if (contentType.startsWith("audio/")) {
    return "audio";
  }

  if (contentType.startsWith("video/")) {
    return "video";
  }

  if (contentType === "application/pdf") {
    return "pdf";
  }

  if (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/javascript"
  ) {
    return "text";
  }

  return "unsupported";
}

export function TrashWorkspace({
  selectedDeletedNote,
  selectedDeletedMedia,
  selectedDeletedFolder,
  deletedFolderContents,
  textPreviewContent,
  resolveDisplayMarkdown,
}: TrashWorkspaceProps) {
  
  if (selectedDeletedNote) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 bg-amber-500/10 px-5 py-3 text-xs text-amber-200">
          <span className="flex items-center gap-1.5 font-medium">
            This note is in Trash. Restore it to edit.
          </span>
          <div className="flex gap-2">
            <ClientForm action={restoreNoteAction}>
              <input type="hidden" name="noteId" value={selectedDeletedNote.id} />
              <Button size="sm" type="submit" variant="outline" className="h-7 px-2.5 text-xs border-amber-500/30 text-amber-100 hover:bg-amber-500/20" disabled={Boolean(selectedDeletedNote.folder?.deletedAt)}>
                Restore
              </Button>
            </ClientForm>
            <ConfirmForm
              action={deleteNoteAction}
              message={`Are you sure you want to permanently delete the note '${selectedDeletedNote.title}'? This action cannot be undone.`}
            >
              <input type="hidden" name="noteId" value={selectedDeletedNote.id} />
              <Button size="sm" type="submit" className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white">
                Delete Permanently
              </Button>
            </ConfirmForm>
          </div>
        </div>
        <div className="border-b border-slate-800 bg-[#191c22] px-5 py-4">
          <h2 className="text-lg font-semibold truncate">{selectedDeletedNote.title}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Note in {selectedDeletedNote.folder?.name ?? "Vault"} · Trashed
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#101217] px-6 py-6 prose prose-slate max-w-none text-sm text-slate-300 leading-7 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-slate-800/80 [&_code]:px-1 [&_code]:py-0.5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-50 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-800 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-800 [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc">
          <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
            {resolveDisplayMarkdown(selectedDeletedNote.body)}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  if (selectedDeletedMedia) {
    const previewUrl = getMediaAssetUrl(selectedDeletedMedia.r2Key);
    const previewKind = getMediaPreviewKind(selectedDeletedMedia.contentType);

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 bg-amber-500/10 px-5 py-3 text-xs text-amber-200">
          <span className="flex items-center gap-1.5 font-medium">
            This media asset is in Trash. Restore it to view or play.
          </span>
          <div className="flex gap-2">
            <ClientForm action={restoreMediaAssetAction}>
              <input type="hidden" name="mediaAssetId" value={selectedDeletedMedia.id} />
              <Button size="sm" type="submit" variant="outline" className="h-7 px-2.5 text-xs border-amber-500/30 text-amber-100 hover:bg-amber-500/20" disabled={Boolean(selectedDeletedMedia.folder?.deletedAt)}>
                Restore
              </Button>
            </ClientForm>
            <ConfirmForm
              action={deleteMediaAssetAction}
              message={`Are you sure you want to permanently delete the media asset '${selectedDeletedMedia.filename}'? This action cannot be undone.`}
            >
              <input type="hidden" name="mediaAssetId" value={selectedDeletedMedia.id} />
              <Button size="sm" type="submit" className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white">
                Delete Permanently
              </Button>
            </ConfirmForm>
          </div>
        </div>
        <div className="border-b border-slate-800 bg-[#191c22] px-5 py-4">
          <h2 className="text-lg font-semibold truncate">{selectedDeletedMedia.filename}</h2>
          <p className="text-xs text-slate-500 mt-1">
            {selectedDeletedMedia.contentType} · {Math.max(1, Math.round(selectedDeletedMedia.sizeBytes / 1024))} KB
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#101217] px-6 py-6 flex items-center justify-center text-sm text-slate-400">
          {previewKind === "image" && previewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={selectedDeletedMedia.filename}
                className="max-h-full max-w-full rounded border border-slate-800 object-contain shadow-lg"
              />
            </>
          ) : previewKind === "video" && previewUrl ? (
            <video
              src={previewUrl}
              controls
              className="max-h-full max-w-full rounded border border-slate-800 object-contain shadow-lg"
            />
          ) : previewKind === "audio" && previewUrl ? (
            <audio
              src={previewUrl}
              controls
              className="w-full max-w-md"
            />
          ) : previewKind === "pdf" && previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full min-h-[600px] border-0 rounded-md bg-white"
            />
          ) : previewKind === "text" ? (
            <div className="w-full h-full max-w-none text-left">
              <pre className="h-full overflow-auto rounded-md border border-slate-800 bg-[#0d0f13] p-4 text-xs font-mono text-slate-300 leading-5">
                <code>{textPreviewContent}</code>
              </pre>
            </div>
          ) : (
            <div className="text-center">
              <FileQuestion className="mx-auto h-8 w-8 text-slate-500 mb-2" />
              Preview unavailable for this trashed media asset format.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedDeletedFolder) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 bg-amber-500/10 px-5 py-3 text-xs text-amber-200">
          <span className="flex items-center gap-1.5 font-medium">
            This folder is in Trash. Restore it to browse or create items inside it.
          </span>
          <div className="flex gap-2">
            <ClientForm action={restoreFolderAction}>
              <input type="hidden" name="folderId" value={selectedDeletedFolder.id} />
              <Button size="sm" type="submit" variant="outline" className="h-7 px-2.5 text-xs border-amber-500/30 text-amber-100 hover:bg-amber-500/20" disabled={Boolean(selectedDeletedFolder.parent?.deletedAt)}>
                Restore
              </Button>
            </ClientForm>
            <ConfirmForm
              action={deleteFolderAction}
              message={`Are you sure you want to permanently delete the folder '${selectedDeletedFolder.name}' and all of its contents? This action cannot be undone.`}
            >
              <input type="hidden" name="folderId" value={selectedDeletedFolder.id} />
              <Button size="sm" type="submit" className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white">
                Delete Permanently
              </Button>
            </ConfirmForm>
          </div>
        </div>
        <div className="border-b border-slate-800 bg-[#191c22] px-5 py-4">
          <h2 className="text-lg font-semibold truncate">{selectedDeletedFolder.name}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Read-only Folder · Trashed
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#101217] px-6 py-6">
          <div className="divide-y divide-slate-800 rounded-md border border-slate-800 bg-[#161a23]/30">
            {deletedFolderContents && (
              <>
                {deletedFolderContents[0]
                  .slice()
                  .sort((a, b) => compareAlphanumeric(a.name, b.name))
                  .map((f) => (
                    <div key={f.id} className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300">
                      <Folder className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      {f.deletedAt ? <Badge variant="outline" className="border-rose-900 bg-rose-950/20 text-[10px] text-rose-300">Trashed</Badge> : null}
                    </div>
                  ))}
                {deletedFolderContents[1]
                  .slice()
                  .sort((a, b) => compareAlphanumeric(a.title, b.title))
                  .map((n) => (
                    <div key={n.id} className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300">
                      <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{n.title}</span>
                      {n.deletedAt ? <Badge variant="outline" className="border-rose-900 bg-rose-950/20 text-[10px] text-rose-300">Trashed</Badge> : null}
                    </div>
                  ))}
                {deletedFolderContents[2]
                  .slice()
                  .sort((a, b) => compareAlphanumeric(a.filename, b.filename))
                  .map((m) => (
                    <div key={m.id} className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300">
                      <ImagePlus className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{m.filename}</span>
                      <span className="text-[10px] text-slate-500">{m.contentType}</span>
                      {m.deletedAt ? <Badge variant="outline" className="border-rose-900 bg-rose-950/20 text-[10px] text-rose-300">Trashed</Badge> : null}
                    </div>
                  ))}
                {deletedFolderContents.every((rows) => rows.length === 0) ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-500">This trashed folder is empty.</div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-[#191c22]/10 p-6 text-center">
      <div className="max-w-md space-y-2">
        <div className="flex justify-center">
          <ArchiveRestore className="h-10 w-10 text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-300">Trash Vault</p>
        <p className="text-xs text-slate-500">
          Select a deleted folder, note, or media asset from the sidebar Trash list to inspect or restore it.
        </p>
      </div>
    </div>
  );
}
