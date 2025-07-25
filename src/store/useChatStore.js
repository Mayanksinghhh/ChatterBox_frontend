import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isTyping: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load users.");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load messages.");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send message.");
    }
  },

  markMessagesAsRead: async (userId) => {
    try {
      await axiosInstance.post(`/messages/read/${userId}`);
    } catch (error) {
      console.warn("Failed to mark as read:", error.message);
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/reaction/${messageId}`, { emoji });
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: res.data.reactions } : msg
        ),
      });
    } catch {
      toast.error("Failed to add reaction");
    }
  },

  removeReaction: async (messageId) => {
    try {
      const res = await axiosInstance.delete(`/messages/reaction/${messageId}`);
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: res.data.reactions } : msg
        ),
      });
    } catch {
      toast.error("Failed to remove reaction");
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text });
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, text: res.data.message.text } : msg
        ),
      });
    } catch {
      toast.error("Failed to edit message");
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`);
      set({
        messages: get().messages.filter((msg) => msg._id !== messageId),
      });
    } catch {
      toast.error("Failed to delete message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isCurrentChat = selectedUser?._id === newMessage.senderId;
     
      if (Notification.permission === "granted") {
        new Notification(`New message from ${newMessage.senderName}`, {
          body: newMessage.text || "📷 Image message",
          icon: newMessage.profilePic || "/avatar.png",
        });
      }

      const audio = new Audio("/notification.mp3");
      audio.play().catch((e) => {
        console.warn("Notification sound failed:", e.message);
      });

      if (!isCurrentChat) {
        return;
      }

      set({ messages: [...get().messages, newMessage] });
      get().markMessagesAsRead(selectedUser._id);
    });

    socket.on("typing", ({ senderId }) => {
      if (senderId === selectedUser?._id) {
        set({ isTyping: true });
      }
    });

    socket.on("stopTyping", ({ senderId }) => {
      if (senderId === selectedUser?._id) {
        set({ isTyping: false });
      }
    });

    socket.on("messagesRead", ({ readerId }) => {
      set({
        messages: get().messages.map((msg) =>
          msg.receiverId === readerId ? { ...msg, read: true } : msg
        ),
      });
    });

    socket.on("reactionUpdated", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ),
      });
    });

    socket.on("messageEdited", ({ message }) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === message._id ? { ...msg, text: message.text } : msg
        ),
      });
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set({
        messages: get().messages.filter((msg) => msg._id !== messageId),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("typing");
    socket.off("stopTyping");
    socket.off("messagesRead");
    socket.off("reactionUpdated");
    socket.off("messageEdited");
    socket.off("messageDeleted");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
