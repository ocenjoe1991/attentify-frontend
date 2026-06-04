import React, {useState, useEffect} from "react";
import axios from "axios";
import { Editor } from "primereact/editor";

type EmailReplyProps = {
  threadId?: string;
  replyFromParent: string;
};

const EmailReplySection: React.FC<EmailReplyProps> = ({
  replyFromParent,
  threadId
}) => {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setReply(replyFromParent);
  }, [replyFromParent]);
  
  // Handle reply submit
    const handleReply = async () => {
      if (!reply.trim()) return;
      setSending(true);
      try {
        await axios.post(
          `${import.meta.env.VITE_API_URL || ""}/message/${threadId}/reply`,
          { content: reply },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        setReply("");
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
        <div data-color-mode="light">
          <Editor
            value={reply}
            onTextChange={(e: any) => setReply(e.htmlValue)}
            style={{ height: '320px' }}
          />
        </div>

        {/* Button aligned to the right */}
        <div className="flex justify-end mt-2">
          <button
            className="bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 disabled:opacity-50 transition"
            onClick={handleReply}
            disabled={sending || isEditorEmpty(reply)}
          >
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailReplySection;
