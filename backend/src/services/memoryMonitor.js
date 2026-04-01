const v8 = require('v8');
const fs = require('fs');
const path = require('path');

function startMemoryMonitoring() {
  console.log('[MemoryMonitor] Starting basic memory monitoring...');

  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

    console.log(`[MemoryStats] Heap: ${heapUsedMB}MB / ${heapTotalMB}MB | RSS: ${rssMB}MB`);

    // If heap usage is dangerously high, take a snapshot
    if (heapUsedMB > 800) { // Adjust threshold as needed
      takeHeapSnapshot();
    }
  }, 60000); // Check every minute
}

function takeHeapSnapshot() {
  const snapshotPath = path.join(__dirname, `../../logs/heap-${Date.now()}.heapsnapshot`);
  console.log(`[MemoryMonitor] Taking heap snapshot: ${snapshotPath}`);
  try {
    v8.writeHeapSnapshot(snapshotPath);
    console.log('[MemoryMonitor] Heap snapshot saved successfully.');
  } catch (err) {
    console.error('[MemoryMonitor] Failed to take heap snapshot:', err);
  }
}

module.exports = { startMemoryMonitoring };
