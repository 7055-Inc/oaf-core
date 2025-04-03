const dbService = require('../services/dbService');

exports.getTestState = async (req, res, next) => {
  try {
    // For GET requests to the test endpoint, we don't need to send any parameters
    // as indicated by the DB team's example:
    // curl -s -H "X-API-Key: [key]" https://db.onlineartfestival.com/api/v1/test
    const result = await dbService.executeQuery({
      operation: 'SELECT'
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching test state:', error);
    
    // Handle the specific case where there's no active message
    if (error.message === 'No active message found') {
      return res.json({
        success: true,
        data: {
          is_active: false,
          message: "Message is currently inactive"
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'Failed to retrieve test state'
      }
    });
  }
};

exports.updateTestState = async (req, res, next) => {
  try {
    // For PUT requests, the body can be empty as indicated by the DB team's example:
    // curl -X PUT -H "X-API-Key: [key]" -H "X-Request-Timestamp: [timestamp]" -H "X-Request-Signature: [signature]" -H "Content-Type: application/json" -d '{}' https://db.onlineartfestival.com/api/v1/test
    
    const result = await dbService.executeQuery({
      operation: 'UPDATE',
      body: {} // Empty object for the request body
    });
    
    res.json({
      success: true,
      data: {
        updated: true
      }
    });
  } catch (error) {
    console.error('Error updating test state:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'database_error',
        message: 'Failed to update test state'
      }
    });
  }
}; 