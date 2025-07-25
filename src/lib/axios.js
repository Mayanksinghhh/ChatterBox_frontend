import axios from "axios";

const baseURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api" // Local backend for dev
    : "https://chatterbox-backend-wqxi.onrender.com/api"; // Render backend for production

export const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});
