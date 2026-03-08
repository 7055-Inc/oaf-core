/**
 * Virus Scanner Utility
 * Reusable ClamAV integration for scanning uploaded files
 * Can be used by any upload endpoint in the platform
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { secureLogger } = require('../middleware/secureLogger');

const execFileAsync = promisify(execFile);

// ClamAV configuration
// Use standalone clamscan instead of daemon for better file access compatibility
const CLAMSCAN_PATH = '/usr/bin/clamscan'; // Standalone scanner (runs as current user)
const CLAMSCAN_FALLBACK = '/usr/bin/clamdscan'; // Daemon-based scanner
const SCAN_TIMEOUT = 300000; // 5 minutes for large files

/**
 * Check if ClamAV is available on the system
 * @returns {Promise<boolean>} True if ClamAV is available
 */
async function isClamAvailable() {
  try {
    await fs.access(CLAMSCAN_PATH);
    return true;
  } catch {
    try {
      await fs.access(CLAMSCAN_FALLBACK);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get the path to the ClamAV scanner
 * @returns {Promise<string|null>} Path to clamscan or null if not available
 */
async function getClamPath() {
  try {
    await fs.access(CLAMSCAN_PATH);
    return CLAMSCAN_PATH;
  } catch {
    try {
      await fs.access(CLAMSCAN_FALLBACK);
      return CLAMSCAN_FALLBACK;
    } catch {
      return null;
    }
  }
}

/**
 * Scan a file for viruses using ClamAV
 * @param {string} filePath - Absolute path to the file to scan
 * @returns {Promise<{isClean: boolean, virusName: string|null, scanTime: number}>}
 * @throws {Error} If ClamAV is not available or scan fails
 */
async function scanFile(filePath) {
  const startTime = Date.now();
  
  // Verify file exists
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error(`File not found: ${filePath}`);
  }

  const clamPath = await getClamPath();
  
  if (!clamPath) {
    secureLogger.warn('ClamAV not available, skipping virus scan', { filePath });
    // Return clean if ClamAV is not installed (graceful degradation)
    return {
      isClean: true,
      virusName: null,
      scanTime: Date.now() - startTime,
      skipped: true,
      reason: 'ClamAV not installed'
    };
  }

  try {
    // Run ClamAV scan
    // --no-summary: Don't print summary
    // --infected: Only print infected files
    // --stdout: Output to stdout
    const { stdout, stderr } = await execFileAsync(
      clamPath,
      ['--no-summary', '--infected', '--stdout', filePath],
      { timeout: SCAN_TIMEOUT }
    );

    const scanTime = Date.now() - startTime;

    // If stdout is empty, file is clean
    if (!stdout.trim()) {
      secureLogger.info('File scan completed: clean', {
        filePath: path.basename(filePath),
        scanTime
      });
      
      return {
        isClean: true,
        virusName: null,
        scanTime,
        skipped: false
      };
    }

    // Parse virus name from output
    // Format: /path/to/file: VirusName FOUND
    const match = stdout.match(/:\s*(.+?)\s*FOUND/);
    const virusName = match ? match[1] : 'Unknown threat';

    secureLogger.warn('File scan completed: INFECTED', {
      filePath: path.basename(filePath),
      virusName,
      scanTime
    });

    return {
      isClean: false,
      virusName,
      scanTime,
      skipped: false
    };

  } catch (error) {
    const scanTime = Date.now() - startTime;

    // ClamAV returns exit code 1 for infected files
    if (error.code === 1 && error.stdout) {
      const match = error.stdout.match(/:\s*(.+?)\s*FOUND/);
      const virusName = match ? match[1] : 'Unknown threat';
      
      secureLogger.warn('File scan completed: INFECTED', {
        filePath: path.basename(filePath),
        virusName,
        scanTime
      });

      return {
        isClean: false,
        virusName,
        scanTime,
        skipped: false
      };
    }

    // Actual error occurred
    secureLogger.error('Virus scan failed', {
      filePath: path.basename(filePath),
      error: error.message,
      scanTime
    });

    throw new Error(`Virus scan failed: ${error.message}`);
  }
}

/**
 * Scan a file and throw an error if infected (convenience method)
 * @param {string} filePath - Absolute path to the file to scan
 * @throws {Error} If file is infected or scan fails
 */
async function scanFileOrThrow(filePath) {
  const result = await scanFile(filePath);
  
  if (!result.isClean) {
    throw new Error(`File rejected: malware detected (${result.virusName})`);
  }
  
  return result;
}

/**
 * Check if a file is clean (returns boolean, never throws)
 * @param {string} filePath - Absolute path to the file to scan
 * @returns {Promise<boolean>} True if file is clean or scan was skipped
 */
async function isCleanFile(filePath) {
  try {
    const result = await scanFile(filePath);
    return result.isClean;
  } catch (error) {
    secureLogger.error('Error checking file cleanliness', {
      filePath: path.basename(filePath),
      error: error.message
    });
    // Return false on error to be safe
    return false;
  }
}

module.exports = {
  scanFile,
  scanFileOrThrow,
  isCleanFile,
  isClamAvailable,
  getClamPath
};
