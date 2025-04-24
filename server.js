const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const Papa = require('papaparse');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper function to read CSV file
function readCSV(filename) {
  try {
    const filePath = path.join(__dirname, 'public', 'data', filename);
    console.log('Reading CSV from path:', filePath);
    console.log('File exists:', fs.existsSync(filePath));
    
    if (!fs.existsSync(filePath)) {
      console.log('Creating new file with headers');
      // Create the file with headers if it doesn't exist
      const headers = filename === 'dishes.csv' 
        ? 'Dish Name,Ingredients,Total Carbon Footprint (kg CO2e),Total Water Usage (L),Price (INR),Date Created\n'
        : 'Bill Name,Dishes,Total Carbon Footprint (kg CO2e),Total Water Usage (L),Total Price (INR),Date Created,CheckedOut\n';
      fs.writeFileSync(filePath, headers);
      return [];
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log('File content:', fileContent);
    
    const parsedData = Papa.parse(fileContent, { header: true });
    console.log('Parsed data:', parsedData);
    
    const data = parsedData.data;
    
    // Ensure CheckedOut column exists for bills
    if (filename === 'bills.csv') {
      const updatedData = data.map(bill => ({
        ...bill,
        'CheckedOut': bill['CheckedOut'] || 'false'
      }));
      console.log('Updated data with CheckedOut:', updatedData);
      return updatedData;
    }
    
    return data;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

// Helper function to write to CSV file
function writeCSV(filename, data) {
  try {
    const filePath = path.resolve(__dirname, 'public', 'data', filename);
    console.log('Absolute path for writing:', filePath);
    
    // Ensure the directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      console.log('Creating directory:', dirPath);
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Log current file content before writing
    let currentContent = '';
    if (fs.existsSync(filePath)) {
      currentContent = fs.readFileSync(filePath, 'utf8');
      console.log('Current file content before writing:', currentContent);
    }
    
    // Ensure CheckedOut column exists for bills
    if (filename === 'bills.csv') {
      data = data.map(bill => ({
        ...bill,
        'CheckedOut': bill['CheckedOut'] || 'false'
      }));
    }
    
    // Generate CSV content
    const csv = Papa.unparse(data, {
      header: true,
      columns: filename === 'bills.csv' ? 
        ['Bill Name', 'Dishes', 'Total Carbon Footprint (kg CO2e)', 'Total Water Usage (L)', 'Total Price (INR)', 'Date Created', 'CheckedOut'] :
        ['Dish Name', 'Ingredients', 'Total Carbon Footprint (kg CO2e)', 'Total Water Usage (L)', 'Price (INR)', 'Date Created']
    });
    console.log('Generated CSV content:', csv);
    
    // Write the file synchronously
    try {
      fs.writeFileSync(filePath, csv, { encoding: 'utf8', flag: 'w' });
      console.log('File written successfully');
      
      // Verify the write immediately
      const verifyContent = fs.readFileSync(filePath, 'utf8');
      console.log('Verified written content:', verifyContent);
      
      if (verifyContent !== csv) {
        throw new Error('File content verification failed - content mismatch');
      }
    } catch (writeError) {
      console.error('Error during file write:', writeError);
      throw writeError;
    }
  } catch (error) {
    console.error(`Error in writeCSV for ${filename}:`, error);
    throw error;
  }
}

// Get dishes
app.get('/api/dishes', (req, res) => {
  try {
    const csvData = readCSV('dishes.csv');
    res.json(csvData);
  } catch (error) {
    console.error('Error reading dishes:', error);
    res.status(500).json({ error: 'Error reading dishes data', details: error.message });
  }
});

// Save dishes
app.post('/api/dishes', async (req, res) => {
  try {
    const dishData = req.body;
    console.log('Received dish data:', dishData);

    if (!dishData || !dishData['Dish Name'] || !dishData['Ingredients']) {
      throw new Error('Invalid dish data provided');
    }

    const dishes = await readCSV('dishes.csv');
    const newDish = {
      'Dish Name': dishData['Dish Name'],
      'Ingredients': dishData['Ingredients'],
      'Total Carbon Footprint (kg CO2e)': dishData['Total Carbon Footprint (kg CO2e)'] || '0.00',
      'Total Water Usage (L)': dishData['Total Water Usage (L)'] || '0.00',
      'Price (INR)': dishData['Price (INR)'] || '0.00',
      'Date Created': new Date().toISOString()
    };

    dishes.push(newDish);
    await writeCSV('dishes.csv', dishes);

    res.json({ success: true, message: 'Dish saved successfully' });
  } catch (error) {
    console.error('Error saving dish:', error);
    res.status(500).json({ 
      error: 'Error saving dishes data',
      details: error.message
    });
  }
});

// Get bills
app.get('/api/bills', (req, res) => {
  try {
    const csvData = readCSV('bills.csv');
    res.json(csvData);
  } catch (error) {
    console.error('Error reading bills:', error);
    res.status(500).json({ error: 'Error reading bills data', details: error.message });
  }
});

// Save bill
app.post('/api/bills', async (req, res) => {
  try {
    const billData = req.body;
    console.log('Received bill data:', billData);

    if (!billData || !billData['Bill Name'] || !billData['Dishes']) {
      throw new Error('Invalid bill data provided');
    }

    const bills = await readCSV('bills.csv');
    const newBill = {
      'Bill Name': billData['Bill Name'],
      'Dishes': billData['Dishes'],
      'Total Carbon Footprint (kg CO2e)': billData['Total Carbon Footprint (kg CO2e)'] || '0.00',
      'Total Water Usage (L)': billData['Total Water Usage (L)'] || '0.00',
      'Total Price (INR)': billData['Total Price (INR)'] || '0.00',
      'Date Created': new Date().toISOString().split('T')[0],
      'CheckedOut': 'false'
    };

    bills.push(newBill);
    await writeCSV('bills.csv', bills);

    res.json({ success: true, message: 'Bill saved successfully' });
  } catch (error) {
    console.error('Error saving bill:', error);
    res.status(500).json({ 
      error: 'Error saving bill data',
      details: error.message
    });
  }
});

// Update bill status
app.put('/api/bills/:billName', async (req, res) => {
  try {
    console.log('PUT request received for bill:', req.params.billName);
    
    // Read current bills
    const bills = readCSV('bills.csv');
    console.log('Current bills:', bills);
    
    const billName = decodeURIComponent(req.params.billName);
    console.log('Looking for bill:', billName);
    
    const billIndex = bills.findIndex(bill => bill['Bill Name'] === billName);
    console.log('Found bill at index:', billIndex);
    
    if (billIndex === -1) {
      console.log('Bill not found');
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    // Update the bill's CheckedOut status
    const oldStatus = bills[billIndex]['CheckedOut'];
    bills[billIndex]['CheckedOut'] = 'true';
    console.log(`Updated bill CheckedOut status from ${oldStatus} to true:`, bills[billIndex]);
    
    // Write back to CSV using the helper function
    writeCSV('bills.csv', bills);
    console.log('File written successfully');
    
    res.json({ 
      success: true,
      message: 'Bill checked out successfully',
      bill: bills[billIndex]
    });
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ 
      error: 'Failed to update bill',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!', details: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 