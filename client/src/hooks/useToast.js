import { toast } from 'react-toastify';

const opts = {
  style: {
    fontSize: 13,
    borderRadius: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
};

export function useToast() {
  return {
    success: (msg) => toast.success(msg, opts),
    error:   (msg) => toast.error(msg,   opts),
    info:    (msg) => toast.info(msg,    opts),
    warn:    (msg) => toast.warn(msg,    opts),
  };
}
