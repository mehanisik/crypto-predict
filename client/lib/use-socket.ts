import { useEffect } from "react";
import io from "socket.io-client";

const useSocketConnection = (
  taskId: string | null,
  handlers: Record<string, (data: any) => void>
) => {
  useEffect(() => {
    if (!taskId) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "");

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(`${event}_${taskId}`, handler);
    });

    return () => {
      socket.disconnect();
    };
  }, [taskId, handlers]);
};
export { useSocketConnection };
