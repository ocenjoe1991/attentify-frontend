import React from "react";
import DOMPurify from "dompurify";
import axios from "axios";
import {
  ArchiveBoxIcon,
  DocumentIcon,
  DocumentTextIcon,
  FilmIcon,
  MusicalNoteIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { formatEmailAddress } from "../utils/formatEmailAddress";

type EmailAttachment = {
  filename?: string;
  mime_type?: string;
  size?: number;
  gmail_message_id?: string;
  attachment_id?: string;
};

type EmailViewerProps = {
  subject: string;
  from: string;
  to: string;
  date: string;
  htmlBody: string;
  threadId?: string;
  containerClassName?: string;
  bodyMaxHeight?: number;
  messageId?: string;
  attachments?: EmailAttachment[];
  //expended?: boolean;
  replyFromParent?: string;
  OnHandleReply?: () => void;
};

const attachmentEndpoint = (messageId: string, attachment: EmailAttachment) =>
  `${import.meta.env.VITE_API_URL || ""}/message/${messageId}/attachments/${attachment.gmail_message_id}/${attachment.attachment_id}`;

const attachmentTypeLabel = (attachment: EmailAttachment) => {
  const mimeType = attachment.mime_type?.toLowerCase() || "";
  const extension = attachment.filename?.split(".").pop()?.toUpperCase();

  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("image/")) return "IMAGE";
  return extension || "FILE";
};

const isPdfAttachment = (attachment: EmailAttachment) =>
  attachment.mime_type?.toLowerCase() === "application/pdf" ||
  attachment.filename?.toLowerCase().endsWith(".pdf") === true;

const isTextAttachment = (attachment: EmailAttachment) =>
  attachment.mime_type?.toLowerCase().startsWith("text/") ||
  attachment.filename?.toLowerCase().endsWith(".txt") === true;

const attachmentIcon = (attachment: EmailAttachment) => {
  const mimeType = attachment.mime_type?.toLowerCase() || "";
  const extension = attachment.filename?.split(".").pop()?.toLowerCase() || "";

  if (mimeType.startsWith("image/")) return PhotoIcon;
  if (mimeType.startsWith("video/")) return FilmIcon;
  if (mimeType.startsWith("audio/")) return MusicalNoteIcon;
  if (mimeType === "application/pdf" || extension === "pdf") return DocumentTextIcon;
  if (["zip", "7z", "rar", "tar", "gz", "bz2"].includes(extension)) return ArchiveBoxIcon;
  if (["txt", "csv", "json", "xml", "md", "log"].includes(extension) || mimeType.startsWith("text/")) {
    return DocumentTextIcon;
  }
  return DocumentIcon;
};

const attachmentIconClassName = (attachment: EmailAttachment) => {
  const extension = attachment.filename?.split(".").pop()?.toLowerCase() || "";
  if (attachment.mime_type?.toLowerCase() === "application/pdf" || extension === "pdf") return "text-red-600";
  if (["zip", "7z", "rar", "tar", "gz", "bz2"].includes(extension)) return "text-amber-600";
  if (["doc", "docx", "odt", "rtf"].includes(extension)) return "text-blue-600";
  if (["xls", "xlsx", "csv", "ods"].includes(extension)) return "text-emerald-600";
  if (["ppt", "pptx", "odp"].includes(extension)) return "text-orange-600";
  return "text-gray-500";
};

const canCreateThumbnail = (attachment: EmailAttachment) =>
  Boolean(
    attachment.mime_type?.toLowerCase().startsWith("image/") ||
      attachment.mime_type?.toLowerCase().startsWith("video/") ||
      isPdfAttachment(attachment) ||
      isTextAttachment(attachment)
  );

const createPdfThumbnail = async (pdfBlob: Blob): Promise<string> => {
  const [{ GlobalWorkerOptions, getDocument }, { default: pdfWorker }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = pdfWorker;

  const loadingTask = getDocument({ data: new Uint8Array(await pdfBlob.arrayBuffer()) });
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.32 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create PDF thumbnail canvas.");

    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to render PDF thumbnail."));
      }, "image/png");
    });
    return window.URL.createObjectURL(thumbnailBlob);
  } finally {
    await pdf.cleanup();
  }
};

const createTextThumbnail = async (textBlob: Blob): Promise<string> => {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create text thumbnail canvas.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e5e7eb";
  context.fillRect(0, 0, canvas.width, 26);
  context.fillStyle = "#6b7280";
  context.font = "bold 11px Arial, sans-serif";
  context.fillText("TEXT PREVIEW", 12, 17);

  const lines = (await textBlob.text()).replace(/\r\n/g, "\n").split("\n").slice(0, 6);
  context.fillStyle = "#374151";
  context.font = "11px Arial, sans-serif";
  lines.forEach((line, index) => {
    const truncated = line.length > 30 ? `${line.slice(0, 29)}...` : line;
    context.fillText(truncated || " ", 12, 47 + index * 18, 216);
  });

  const thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to render text thumbnail."));
    }, "image/png");
  });
  return window.URL.createObjectURL(thumbnailBlob);
};

type AttachmentThumbnailProps = {
  attachment: EmailAttachment;
  messageId?: string;
  onPreview: () => void;
};

const AttachmentThumbnail: React.FC<AttachmentThumbnailProps> = ({ attachment, messageId, onPreview }) => {
  const targetRef = React.useRef<HTMLButtonElement>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [failed, setFailed] = React.useState(false);
  const mimeType = attachment.mime_type?.toLowerCase() || "";
  const thumbnailable = Boolean(
    messageId &&
      attachment.gmail_message_id &&
      attachment.attachment_id &&
      canCreateThumbnail(attachment)
  );

  React.useEffect(() => {
    if (!thumbnailable || !targetRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" }
    );
    observer.observe(targetRef.current);
    return () => observer.disconnect();
  }, [thumbnailable]);

  React.useEffect(() => {
    if (!shouldLoad || !messageId || !attachment.gmail_message_id || !attachment.attachment_id) return;

    let active = true;
    let objectUrl = "";

    const loadThumbnail = async () => {
      try {
        const response = await axios.get(attachmentEndpoint(messageId, attachment), {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          responseType: "blob",
        });
        objectUrl = isPdfAttachment(attachment)
          ? await createPdfThumbnail(response.data)
          : isTextAttachment(attachment)
            ? await createTextThumbnail(response.data)
            : window.URL.createObjectURL(response.data);
        if (active) setUrl(objectUrl);
      } catch (error) {
        console.error("Failed to load attachment thumbnail:", error);
        if (active) setFailed(true);
      }
    };

    void loadThumbnail();
    return () => {
      active = false;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, messageId, shouldLoad]);

  const FileIcon = attachmentIcon(attachment);
  const fallback = (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-100 px-2">
      <FileIcon className={`h-7 w-7 ${attachmentIconClassName(attachment)}`} aria-hidden="true" />
      <span className="text-[10px] font-semibold text-gray-500">{attachmentTypeLabel(attachment)}</span>
    </span>
  );

  return (
    <button
      ref={targetRef}
      type="button"
      onClick={onPreview}
      className="h-20 w-24 shrink-0 overflow-hidden border border-gray-200 bg-white text-left hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      title={`Preview ${attachment.filename || "attachment"}`}
      aria-label={`Preview ${attachment.filename || "attachment"}`}
    >
      {!thumbnailable || failed || !url
        ? fallback
        : mimeType.startsWith("image/") || isPdfAttachment(attachment) || isTextAttachment(attachment)
          ? <img src={url} alt="" className="h-full w-full object-cover" />
          : <video src={url} muted preload="metadata" className="h-full w-full object-cover" />}
    </button>
  );
};

function removeExecutableEmailContent(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;

  template.content
    .querySelectorAll("script, iframe, object, embed")
    .forEach((node) => node.remove());

  template.content.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc") {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return template.innerHTML;
}

function collapseQuotedEmailContent(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;

  const quoteNodes = Array.from(template.content.querySelectorAll("blockquote, .gmail_quote"));
  const outerQuotes = quoteNodes.filter(
    (node) => !quoteNodes.some((otherNode) => otherNode !== node && otherNode.contains(node))
  );

  outerQuotes.forEach((quote) => {
    const details = document.createElement("details");
    details.className = "email-quoted-content";

    const summary = document.createElement("summary");
    summary.setAttribute("aria-label", "Show quoted text");
    summary.setAttribute("title", "Show quoted text");
    summary.textContent = "...";

    quote.parentNode?.replaceChild(details, quote);
    details.append(summary, quote);
  });

  return template.innerHTML;
}

const EmailViewer: React.FC<EmailViewerProps> = ({
  subject,
  from,
  to,
  date,
  htmlBody,
  containerClassName = "bg-white border border-gray-300 p-4 max-w-5xl mx-auto mb-4",
  bodyMaxHeight,
  messageId,
  attachments = [],
  //expended,
}) => {
  const [iframeHeight, setIframeHeight] = React.useState(bodyMaxHeight ? 72 : 600);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [preview, setPreview] = React.useState<{
    filename: string;
    mimeType: string;
    url: string;
    text?: string;
    loading: boolean;
    error?: string;
  } | null>(null);

  React.useEffect(() => {
    return () => {
      if (preview?.url) window.URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  const emailDocument = React.useMemo(() => {
    const executableContentRemoved = removeExecutableEmailContent(htmlBody || "");
    const quotedContentCollapsed = collapseQuotedEmailContent(executableContentRemoved);
    const sanitizedHtml = DOMPurify.sanitize(quotedContentCollapsed, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["script", "iframe", "object", "embed"],
    });

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base target="_blank" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.5;
      }
      body {
        padding: 0;
        overflow-wrap: anywhere;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      table {
        max-width: 100%;
      }
      details.email-quoted-content {
        margin-top: 14px;
      }
      details.email-quoted-content > summary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 14px;
        cursor: pointer;
        border-radius: 7px;
        background: #d1d5db;
        color: #4b5563;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        list-style: none;
      }
      details.email-quoted-content > summary::-webkit-details-marker {
        display: none;
      }
      details.email-quoted-content[open] > summary {
        margin-bottom: 12px;
      }
    </style>
  </head>
  <body>${sanitizedHtml}</body>
</html>`;
  }, [htmlBody]);
  //const [isExpanded, setIsExpanded] = useState(expended);

  //const toggleExpand = () => setIsExpanded(prev => !prev);

  const handleIframeLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframe = event.currentTarget;
      const resizeIframe = () => {
        const doc = iframe.contentDocument;
        const minHeight = bodyMaxHeight ? 72 : 240;
        const maxHeight = bodyMaxHeight || 4000;
        const nextHeight = Math.max(
          minHeight,
          doc?.documentElement.scrollHeight || doc?.body.scrollHeight || 600
        );
        setIframeHeight(Math.min(nextHeight, maxHeight));
      };

      resizeIframe();
      iframe.contentDocument
        ?.querySelectorAll("details.email-quoted-content")
        .forEach((details) => details.addEventListener("toggle", resizeIframe));
    } catch {
      setIframeHeight(bodyMaxHeight ? 72 : 600);
    }
  };

  const formatFileSize = (size?: number) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  const isTextPreviewType = (mimeType: string) => {
    const normalized = mimeType.toLowerCase();
    return (
      normalized.startsWith("text/") ||
      normalized === "application/json" ||
      normalized === "application/xml" ||
      normalized === "application/csv" ||
      normalized === "text/csv" ||
      normalized.endsWith("+json") ||
      normalized.endsWith("+xml")
    );
  };

  const handleDownloadAttachment = async (attachment: EmailAttachment) => {
    if (!messageId || !attachment.gmail_message_id || !attachment.attachment_id) return;

    const response = await axios.get(
      attachmentEndpoint(messageId, attachment),
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      }
    );
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.filename || "attachment";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const fetchAttachmentBlob = async (attachment: EmailAttachment) => {
    if (!messageId || !attachment.gmail_message_id || !attachment.attachment_id) return null;

    const response = await axios.get(
      attachmentEndpoint(messageId, attachment),
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      }
    );
    return response.data as Blob;
  };

  const handlePreviewAttachment = async (attachment: EmailAttachment) => {
    if (!messageId || !attachment.gmail_message_id || !attachment.attachment_id) return;
    if (preview?.url) window.URL.revokeObjectURL(preview.url);

    const filename = attachment.filename || "Attachment";
    const mimeType = attachment.mime_type || "application/octet-stream";
    setPreview({ filename, mimeType, url: "", loading: true });

    try {
      const blob = await fetchAttachmentBlob(attachment);
      if (!blob) throw new Error("Attachment is not available.");
      const url = window.URL.createObjectURL(blob);
      const nextPreview = { filename, mimeType: blob.type || mimeType, url, loading: false };

      if (isTextPreviewType(blob.type || mimeType)) {
        setPreview({ ...nextPreview, text: await blob.text() });
      } else {
        setPreview(nextPreview);
      }
    } catch (error) {
      console.error("Failed to preview attachment:", error);
      setPreview({
        filename,
        mimeType,
        url: "",
        loading: false,
        error: "Preview is unavailable for this attachment.",
      });
    }
  };

  const closePreview = () => {
    if (preview?.url) window.URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const previewBody = () => {
    if (!preview) return null;
    if (preview.loading) {
      return <div className="p-6 text-sm text-gray-600">Loading preview...</div>;
    }
    if (preview.error) {
      return <div className="p-6 text-sm text-gray-600">{preview.error}</div>;
    }

    const mimeType = preview.mimeType;
    if (mimeType.startsWith("image/")) {
      return <img src={preview.url} alt={preview.filename} className="max-h-[70vh] max-w-full object-contain" />;
    }
    if (mimeType === "application/pdf") {
      return <iframe title={preview.filename} src={preview.url} className="h-[70vh] w-full border-0" />;
    }
    if (mimeType.startsWith("video/")) {
      return <video src={preview.url} controls className="max-h-[70vh] w-full bg-black" />;
    }
    if (mimeType.startsWith("audio/")) {
      return <audio src={preview.url} controls className="w-full" />;
    }
    if (preview.text !== undefined) {
      return (
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap bg-gray-50 p-4 text-sm text-gray-800">
          {preview.text}
        </pre>
      );
    }

    return (
      <div className="p-6 text-sm text-gray-600">
        This file type cannot be previewed in the browser. Download it to open locally.
      </div>
    );
  };

  return (
    <div className={containerClassName}>
      <header className="flex justify-between items-start mb-4 border-b border-gray-400 pb-4">
        <div>
          <h2 className="text-xl font-bold mb-2">{subject}</h2>
          <div className="flex gap-3 text-sm text-gray-600">
            <div>
              <span className="font-semibold">From:</span>{" "}
              {formatEmailAddress(from)}
            </div>
            <div>
              <span className="font-semibold">To:</span>{" "}
              {formatEmailAddress(to)}
            </div>
            <div>
              <span className="font-semibold">Date:</span>{" "}
              {new Date(date).toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      <section
        className="max-w-none"
        style={bodyMaxHeight ? { maxHeight: bodyMaxHeight, overflowY: "auto" } : undefined}
      >
        <iframe
          ref={iframeRef}
          title={`Email body: ${subject}`}
          className="w-full border-0 bg-white"
          srcDoc={emailDocument}
          referrerPolicy="no-referrer"
          style={{ height: bodyMaxHeight ? Math.min(iframeHeight, bodyMaxHeight) : iframeHeight }}
          onLoad={handleIframeLoad}
        />
      </section>
      {attachments.length > 0 && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <div className="mb-2 text-sm font-semibold text-gray-700">Attachments</div>
          <div className="flex flex-wrap gap-3">
            {attachments.map((attachment, index) => {
              const downloadable = Boolean(messageId && attachment.gmail_message_id && attachment.attachment_id);
              return (
                <div
                  key={`${attachment.gmail_message_id || "local"}-${attachment.attachment_id || index}`}
                  className="flex w-full max-w-sm gap-3 border border-gray-300 bg-gray-50 p-2 text-xs text-gray-700"
                >
                  <AttachmentThumbnail
                    attachment={attachment}
                    messageId={messageId}
                    onPreview={() => handlePreviewAttachment(attachment)}
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-800" title={attachment.filename || "Attachment"}>
                        {attachment.filename || "Attachment"}
                      </div>
                      <div className="mt-1 text-gray-500">
                        {attachmentTypeLabel(attachment)}
                        {attachment.size ? ` - ${formatFileSize(attachment.size)}` : ""}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreviewAttachment(attachment)}
                        disabled={!downloadable}
                        className="border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-blue-50 disabled:cursor-default disabled:opacity-70"
                        title={downloadable ? "Preview attachment" : "Attachment metadata only"}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(attachment)}
                        disabled={!downloadable}
                        className="border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-blue-50 disabled:cursor-default disabled:opacity-70"
                        title={downloadable ? "Download attachment" : "Attachment metadata only"}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col border border-gray-300 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">{preview.filename}</div>
                <div className="text-xs text-gray-500">{preview.mimeType}</div>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="flex min-h-48 items-center justify-center overflow-auto p-4">{previewBody()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailViewer;
