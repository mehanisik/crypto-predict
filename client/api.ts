// Example API call
fetch("http://localhost:5000/train", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify(data),
});
