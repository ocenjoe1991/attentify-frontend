import React, {useState, useEffect, useRef} from "react";
import axios from "axios";
import { Editor } from "primereact/editor";

type EmailReplyProps = {
  threadId?: string;
  replyFromParent: string;
  onSent?: () => void;
};

const EmailReplySection: React.FC<EmailReplyProps> = ({
  replyFromParent,
  threadId,
  onSent
}) => {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setReply(replyFromParent);
  }, [replyFromParent]);
  
  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []);
    const allowedFiles = nextFiles.filter((file) => file.size <= 10 * 1024 * 1024);
    setAttachments((current) => [...current, ...allowedFiles]);
    event.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  // Handle reply submit
    const handleReply = async () => {
      if (isEditorEmpty(reply) && attachments.length === 0) return;
      setSending(true);
      try {
        const formData = new FormData();
        formData.append("content", reply || "");
        attachments.forEach((file) => formData.append("files", file));
        await axios.post(
          `${import.meta.env.VITE_API_URL || ""}/message/${threadId}/reply`,
          formData,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        setReply("");
        setAttachments([]);
        onSent?.();
        //setMessage(response.data);
  
      //Expand only the last message by default
      //if (response.data?.messages?.length) {
        //setExpandedIndexes([response.data.messages.length - 1]);
      //}
    } catch (err) {
      // Handle error
    } finally {
      setSending(false);
    }
  };

  const isEditorEmpty = (html: string | undefined) => {
    return !html || html.replace(/<(.|\n)*?>/g, '').trim() === '';
  };

  return (
    <div className="mt-4">
      <div className="bg-white border border-gray-300 p-4">
        <h3 className="text-lg font-semibold mb-2">Reply</h3>
        <div className="compact-reply-editor" data-color-mode="light">
          <Editor
            value={reply}
            onTextChange={(e: any) => setReply(e.htmlValue)}
          />
        </div>

        {attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center gap-2 border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs text-gray-700"
              >
                <span className="font-medium">{file.name}</span>
                <span className="text-gray-500">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  className="text-gray-500 hover:text-red-600"
                  onClick={() => removeAttachment(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Button aligned to the right */}
        <div className="flex justify-between gap-3 mt-2">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <button
              type="button"
              className="border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              Attach file
            </button>
          </div>
          <button
            className="bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 disabled:opacity-50 transition"
            onClick={handleReply}
            disabled={sending || (isEditorEmpty(reply) && attachments.length === 0)}
          >
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailReplySection;
