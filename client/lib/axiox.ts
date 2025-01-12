import axios from "axios";

const server = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BASE_URL}`,
  headers: {
    "Content-Type": "application/json",
  },
  transformRequest: [
    (data) => {
      data = JSON.stringify(data);
      return data;
    },
  ],
});

export default server;
