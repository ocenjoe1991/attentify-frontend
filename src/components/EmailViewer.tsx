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
                <button
                  key={`${attachment.gmail_message_id || "local"}-${attachment.attachment_id || index}`}
                  type="button"
                  onClick={() => handleDownloadAttachment(attachment)}
                  disabled={!downloadable}
                  className="border border-gray-300 bg-gray-50 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 disabled:cursor-default disabled:opacity-70"
                  title={downloadable ? "Download attachment" : "Attachment metadata only"}
                >
                  <span className="font-medium">{attachment.filename || "Attachment"}</span>
                  {attachment.size ? <span className="ml-2 text-gray-500">{formatFileSize(attachment.size)}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailViewer;
