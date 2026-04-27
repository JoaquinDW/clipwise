import { startAllWorkers } from '../lib/queue/start-workers';

startAllWorkers();
console.log('[worker] Video pipeline workers running. Press Ctrl+C to stop.');
