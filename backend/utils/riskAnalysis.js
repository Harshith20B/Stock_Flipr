const { spawn } = require('child_process');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

// Path to Python script
const PYTHON_SCRIPT_PATH = path.join(__dirname, '..', 'python', 'risk_analysis.py');

// Make sure the Python script exists
if (!fs.existsSync(PYTHON_SCRIPT_PATH)) {
  console.error(`Python script not found at ${PYTHON_SCRIPT_PATH}`);
}

/**
 * Fetches risk analysis results for a stock by calling the Python script
 * @param {string} symbol - The stock symbol
 * @param {array} portfolio - Array of stock symbols in the portfolio
 * @returns {Promise<object>} The risk analysis results
 */
async function fetch_risk_results(symbol, portfolio = []) {
  return new Promise((resolve, reject) => {
    // Normalize the symbol
    const normalizedSymbol = symbol.toUpperCase();
    
    // Start the Python process
    const pythonProcess = spawn('python', [
      PYTHON_SCRIPT_PATH,
      '--ticker', normalizedSymbol,
      '--portfolio', JSON.stringify(portfolio)
    ]);
    
    let dataString = '';
    let errorString = '';

    // Collect data from stdout
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    // Collect any errors
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Python error output: ${errorString}`);
        
        return resolve({ 
          error: `Failed to analyze risk for ${normalizedSymbol}: ${errorString || 'Unknown error'}`, 
          symbol: normalizedSymbol 
        });
      }

      try {
        // Try to parse the JSON result
        const result = JSON.parse(dataString);
        resolve(result);
      } catch (error) {
        console.error('Failed to parse Python output:', error);
        console.error('Python output was:', dataString);
        resolve({ 
          error: 'Failed to parse risk analysis results', 
          symbol: normalizedSymbol 
        });
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      resolve({ 
        error: `Failed to start risk analysis: ${error.message}`, 
        symbol: normalizedSymbol 
      });
    });
  });
}

module.exports = {
  fetch_risk_results
};