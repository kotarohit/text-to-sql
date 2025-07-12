export const fetchQueryResult = async (question: string) => {
  try {
    const response = await fetch("http://localhost:8000/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
