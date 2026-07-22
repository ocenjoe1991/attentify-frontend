import React from "react";
import DOMPurify from "dompurify";
import axios from "axios";
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
    const sanitizedHtml = DOMPurify.sanitize(executableContentRemoved, {
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
    </style>
  </head>
  <body>${sanitizedHtml}</body>
</html>`;
  }, [htmlBody]);
  //const [isExpanded, setIsExpanded] = useState(expended);

  //const toggleExpand = () => setIsExpanded(prev => !prev);

  const handleIframeLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const doc = event.currentTarget.contentDocument;
      const minHeight = bodyMaxHeight ? 72 : 240;
      const maxHeight = bodyMaxHeight || 4000;
      const nextHeight = Math.max(
        minHeight,
        doc?.documentElement.scrollHeight || doc?.body.scrollHeight || 600
      );
      setIframeHeight(Math.min(nextHeight, maxHeight));
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
      `${import.meta.env.VITE_API_URL || ""}/message/${messageId}/attachments/${attachment.gmail_message_id}/${attachment.attachment_id}`,
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
      `${import.meta.env.VITE_API_URL || ""}/message/${messageId}/attachments/${attachment.gmail_message_id}/${attachment.attachment_id}`,
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
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => {
              const downloadable = Boolean(messageId && attachment.gmail_message_id && attachment.attachment_id);
              return (
                <div
                  key={`${attachment.gmail_message_id || "local"}-${attachment.attachment_id || index}`}
                  className="flex items-center gap-2 border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs text-gray-700"
                >
                  <span className="font-medium">{attachment.filename || "Attachment"}</span>
                  {attachment.size ? <span className="ml-2 text-gray-500">{formatFileSize(attachment.size)}</span> : null}
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
