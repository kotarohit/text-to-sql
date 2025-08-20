import { getToken } from "./auth";

export const fetchQueryResult = async (question: string) => {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch("http://localhost:8000/query", {
      method: "POST",
      headers,
      body: JSON.stringify({ question }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    return {
      success: false,
      error: "Failed to connect to backend or parse response.",
    };
  }
};
