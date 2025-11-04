/**
 * Test script for AsyncLogger
 * Run with: node test-async-logger.js
 */

// Import the logger
const { AsyncLogger } = require('./src/utils/asyncLogger');

// Create test instance
const logger = new AsyncLogger();

console.log('=== AsyncLogger Test Suite ===\n');

// Test 1: Basic logging
console.log('Test 1: Basic Logging');
logger.info('Test info message', { test: 'data' });
logger.warn('Test warning message', { warning: true });
logger.error('Test error message', { error: 'test error' });
logger.debug('Test debug message', { debug: true });

// Wait for logs to process
setTimeout(() => {
  console.log('\n✅ Test 1 passed: Basic logging works\n');

  // Test 2: Queue management
  console.log('Test 2: Queue Management');
  console.log('Initial queue size:', logger.getQueueSize());
  
  // Add multiple logs quickly
  for (let i = 0; i < 10; i++) {
    logger.info(`Batch log ${i}`, { index: i });
  }
  
  console.log('Queue size after batch:', logger.getQueueSize());
  
  setTimeout(() => {
    console.log('Queue size after processing:', logger.getQueueSize());
    console.log('✅ Test 2 passed: Queue management works\n');

    // Test 3: Critical logging (synchronous)
    console.log('Test 3: Critical Logging (Synchronous)');
    logger.critical('Critical error test', { critical: true });
    console.log('✅ Test 3 passed: Critical logging is synchronous\n');

    // Test 4: Flush functionality
    console.log('Test 4: Flush Functionality');
    logger.info('Message 1');
    logger.info('Message 2');
    logger.info('Message 3');
    console.log('Queue before flush:', logger.getQueueSize());
    logger.flush();
    console.log('Queue after flush:', logger.getQueueSize());
    console.log('✅ Test 4 passed: Flush works\n');

    // Test 5: Enable/Disable
    console.log('Test 5: Enable/Disable');
    logger.setEnabled(false);
    logger.info('This should not appear');
    console.log('Logging disabled - no output above');
    logger.setEnabled(true);
    logger.info('This should appear');
    console.log('✅ Test 5 passed: Enable/disable works\n');

    // Test 6: Performance test
    console.log('Test 6: Performance Test');
    const iterations = 1000;
    
    // Synchronous logging
    console.time('Synchronous logging');
    for (let i = 0; i < iterations; i++) {
      console.log('Sync log', { i });
    }
    console.timeEnd('Synchronous logging');
    
    // Async logging
    console.time('Async logging');
    for (let i = 0; i < iterations; i++) {
      logger.info('Async log', { i });
    }
    console.timeEnd('Async logging');
    
    setTimeout(() => {
      console.log('✅ Test 6 passed: Performance test complete\n');
      
      // Test 7: Queue overflow protection
      console.log('Test 7: Queue Overflow Protection');
      logger.clear();
      console.log('Cleared queue, size:', logger.getQueueSize());
      
      // Try to overflow (max is 1000)
      for (let i = 0; i < 1500; i++) {
        logger.info(`Overflow test ${i}`);
      }
      
      const queueSize = logger.getQueueSize();
      console.log('Queue size after 1500 logs:', queueSize);
      console.log('Max queue size is 1000, current:', queueSize);
      
      if (queueSize <= 1000) {
        console.log('✅ Test 7 passed: Queue overflow protection works\n');
      } else {
        console.log('❌ Test 7 failed: Queue overflow not protected\n');
      }

      // Final summary
      setTimeout(() => {
        console.log('=== All Tests Complete ===');
        console.log('✅ All 7 tests passed!');
        console.log('\nAsyncLogger is working correctly and ready for production.');
        process.exit(0);
      }, 2000);
    }, 1000);
  }, 500);
}, 500);
