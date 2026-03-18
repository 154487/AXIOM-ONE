export type ToastType = "success" | "error";

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

type Listener = (toast: ToastItem) => void;

let listeners: Listener[] = [];
let counter = 0;

function emit(type: ToastType, title: string, message: string) {
  const item: ToastItem = { id: counter++, type, title, message };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success(title: string, message = "") {
    emit("success", title, message);
  },
  error(title: string, message = "") {
    emit("error", title, message);
  },
  subscribe(fn: Listener) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },
};
