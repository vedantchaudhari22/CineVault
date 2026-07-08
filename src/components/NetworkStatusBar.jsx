import { useNetwork } from '../contexts/NetworkContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function NetworkStatusBar() {
  const { isOnline, showReconnected } = useNetwork();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          className="network-status-bar offline"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <span className="status-icon">⚡</span>
          You are offline — showing cached content
        </motion.div>
      )}
      {showReconnected && isOnline && (
        <motion.div
          className="network-status-bar online"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <span className="status-icon">✓</span>
          Back online — refreshing content
        </motion.div>
      )}
    </AnimatePresence>
  );
}
