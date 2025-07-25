import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    isTyping,
    markMessagesAsRead,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    markMessagesAsRead(selectedUser._id);

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead(selectedUser._id);
    }
  }, [messages, selectedUser._id, markMessagesAsRead]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const userReaction = message.reactions?.find(r => r.userId === authUser._id);
          const isSender = message.senderId === authUser._id;
          return (
            <div
              key={message._id}
              className={`chat ${isSender ? "chat-end" : "chat-start"}`}
              ref={messageEndRef}
            >
              <div className=" chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isSender
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header mb-1 flex items-center gap-2">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
                {isSender && message.read && (
                  <span className="ml-2 text-xs text-emerald-500">Read</span>
                )}
                {isSender && (
                  <>
                    <button
                      className="ml-2 text-xs text-blue-500 hover:underline"
                      onClick={() => {
                        setEditingId(message._id);
                        setEditText(message.text);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="ml-2 text-xs text-red-500 hover:underline"
                      onClick={() => {
                        if (window.confirm("Delete this message?")) {
                          deleteMessage(message._id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
              <div className="chat-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {editingId === message._id ? (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      editMessage(message._id, editText);
                      setEditingId(null);
                    }}
                    className="flex gap-2 items-center"
                  >
                    <input
                      className="input input-sm"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="btn btn-xs btn-primary">Save</button>
                    <button type="button" className="btn btn-xs" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  message.text && <p>{message.text}</p>
                )}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {REACTION_EMOJIS.map((emoji) => {
                    const reacted = userReaction && userReaction.emoji === emoji;
                    return (
                      <button
                        key={emoji}
                        className={`px-1 rounded text-lg hover:bg-base-300 ${reacted ? "bg-base-300" : ""}`}
                        onClick={() =>
                          reacted
                            ? removeReaction(message._id)
                            : addReaction(message._id, emoji)
                        }
                        aria-label={`React with ${emoji}`}
                        type="button"
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {message.reactions.map((r, idx) => (
                      <span key={idx} className="text-sm px-1 bg-base-200 rounded">
                        {r.emoji}
                        {r.userId === authUser._id && <span className="ml-1 text-xs">(You)</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 px-2">
            <span>{selectedUser.fullName} is typing...</span>
            <span className="animate-bounce">...</span>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
