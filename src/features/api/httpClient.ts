import axios from "axios";

const httpClient = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

export default httpClient;
